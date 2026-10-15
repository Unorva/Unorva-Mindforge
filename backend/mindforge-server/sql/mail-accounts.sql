-- Additive mailbox migration. Apply with scripts/DatabaseMaintenance.java:
-- its restricted ALTER/CREATE INDEX handling skips these if already present.
-- Existing standalone drafts retain a NULL account_id.

CREATE TABLE IF NOT EXISTS mf_mail_account (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(100) NOT NULL DEFAULT '',
    username VARCHAR(254) NOT NULL,
    auth_type VARCHAR(16) NOT NULL DEFAULT 'password',
    imap_host VARCHAR(253) NOT NULL,
    imap_port INT NOT NULL,
    imap_security VARCHAR(16) NOT NULL DEFAULT 'ssl',
    smtp_host VARCHAR(253) NOT NULL,
    smtp_port INT NOT NULL,
    smtp_security VARCHAR(16) NOT NULL DEFAULT 'ssl',
    password_ciphertext TEXT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'unverified',
    last_error VARCHAR(500) NULL,
    last_sync_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_mail_account_user_email (user_id, email),
    KEY idx_mail_account_user_default (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Owned IMAP/SMTP accounts; encrypted credentials only';

CREATE TABLE IF NOT EXISTS mf_mail_remote (
    user_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    mail_id BIGINT NULL COMMENT 'NULL tombstone suppresses a locally deleted remote message',
    remote_folder VARCHAR(255) NOT NULL,
    uid_validity BIGINT NOT NULL,
    remote_uid BIGINT NOT NULL,
    PRIMARY KEY (user_id, account_id, remote_folder, uid_validity, remote_uid),
    UNIQUE KEY uk_mail_remote_message (user_id, mail_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IMAP identity and deleted-cache tombstones';

ALTER TABLE mf_mail ADD COLUMN account_id BIGINT NULL COMMENT 'Connected mailbox; NULL for standalone local drafts' AFTER user_id;
CREATE INDEX idx_mail_user_account ON mf_mail (user_id, account_id, updated_at);

ALTER TABLE mf_mail ADD COLUMN send_attempt_token VARCHAR(36) NULL;

-- Changes to local flags remain distinguishable while an IMAP sync is in flight.
ALTER TABLE mf_mail ADD COLUMN flags_version BIGINT NOT NULL DEFAULT 0;
