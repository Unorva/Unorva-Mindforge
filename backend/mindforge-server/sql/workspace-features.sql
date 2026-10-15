-- Personal workspace features. Additive migration: never drops existing data.
-- Run against the database selected by the configured connection URL.

CREATE TABLE IF NOT EXISTS mf_note_folder (
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    id VARCHAR(64) NOT NULL COMMENT 'Folder identifier; inbox is unique per user',
    name VARCHAR(120) NOT NULL COMMENT 'Folder name',
    parent_id VARCHAR(64) NULL COMMENT 'Parent folder identifier',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (user_id, id),
    KEY idx_note_folder_parent (user_id, parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private note folders';

CREATE TABLE IF NOT EXISTS mf_note (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Note ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    folder_id VARCHAR(64) NOT NULL DEFAULT 'inbox' COMMENT 'Owned folder identifier',
    title VARCHAR(200) NOT NULL COMMENT 'Note title',
    content MEDIUMTEXT NOT NULL COMMENT 'Markdown note content',
    color VARCHAR(40) NOT NULL DEFAULT 'primary' COMMENT 'Display color token',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT 'Trash status: 0 active, 1 deleted',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    KEY idx_note_user_updated (user_id, updated_at),
    KEY idx_note_user_folder (user_id, folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private Markdown notes';

CREATE TABLE IF NOT EXISTS mf_blog_post (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Post ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    title VARCHAR(200) NOT NULL COMMENT 'Post title',
    content MEDIUMTEXT NOT NULL COMMENT 'Post content',
    cover_img VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'Cover image URL',
    category VARCHAR(80) NOT NULL DEFAULT '未分类' COMMENT 'Post category',
    featured TINYINT NOT NULL DEFAULT 0 COMMENT 'Featured marker',
    published TINYINT NOT NULL DEFAULT 0 COMMENT 'Publication status inside private workspace',
    view_count BIGINT NOT NULL DEFAULT 0 COMMENT 'Actual detail reads',
    share_count BIGINT NOT NULL DEFAULT 0 COMMENT 'Recorded share actions',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    KEY idx_blog_user_updated (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private blog posts and drafts';

CREATE TABLE IF NOT EXISTS mf_blog_comment (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Comment ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    post_id BIGINT NOT NULL COMMENT 'Owned blog post ID',
    parent_id BIGINT NULL COMMENT 'Parent comment on the same post',
    content TEXT NOT NULL COMMENT 'Comment text',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    PRIMARY KEY (id),
    KEY idx_blog_comment_post (user_id, post_id, parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Blog comments and replies';

CREATE TABLE IF NOT EXISTS mf_finance_account (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Account ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    name VARCHAR(120) NOT NULL COMMENT 'Account name',
    account_type VARCHAR(30) NOT NULL COMMENT '现金, 储蓄, 投资 or 电子钱包',
    opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT 'Opening balance; current balance derived from ledger',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    KEY idx_finance_account_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personal finance accounts';

CREATE TABLE IF NOT EXISTS mf_finance_transaction (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Transaction ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    account_id BIGINT NOT NULL COMMENT 'Owned account ID',
    transaction_date DATE NOT NULL COMMENT 'Accounting date',
    transaction_type VARCHAR(20) NOT NULL COMMENT '收入 or 支出',
    category VARCHAR(80) NOT NULL COMMENT 'Category name',
    description VARCHAR(1000) NOT NULL DEFAULT '' COMMENT 'Transaction description',
    amount DECIMAL(18,2) NOT NULL COMMENT 'Positive amount with two decimal places',
    source VARCHAR(30) NOT NULL DEFAULT '手动录入' COMMENT 'Transaction source',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    KEY idx_finance_transaction_month (user_id, transaction_date, transaction_type),
    KEY idx_finance_transaction_account (user_id, account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Personal finance ledger';

CREATE TABLE IF NOT EXISTS mf_finance_budget (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Budget ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    month_value CHAR(7) NOT NULL COMMENT 'Budget month yyyy-MM',
    category VARCHAR(80) NOT NULL COMMENT 'Expense category',
    amount DECIMAL(18,2) NOT NULL COMMENT 'Monthly budget amount',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    UNIQUE KEY uk_finance_budget_category (user_id, month_value, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Monthly expense budgets';

CREATE TABLE IF NOT EXISTS mf_user_setting (
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    ai_json TEXT NULL COMMENT 'AI preferences without credentials',
    apps_json TEXT NULL COMMENT 'Workspace app preferences',
    notifications_json TEXT NULL COMMENT 'Notification preferences',
    reports_json TEXT NULL COMMENT 'Report preferences',
    security_json TEXT NULL COMMENT 'Supported security preferences',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private workspace settings';

CREATE TABLE IF NOT EXISTS mf_email_binding (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Binding ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    email VARCHAR(254) NOT NULL COMMENT 'Registered email address',
    provider VARCHAR(80) NOT NULL COMMENT 'Provider display name',
    is_primary TINYINT NOT NULL DEFAULT 0 COMMENT 'Primary address marker',
    verified TINYINT NOT NULL DEFAULT 0 COMMENT 'Verified only by a real verification flow',
    bound_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Binding time',
    PRIMARY KEY (id),
    UNIQUE KEY uk_email_binding_user (user_id, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Email address preferences, no provider connection implied';

CREATE TABLE IF NOT EXISTS mf_mail (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Message ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    account_id BIGINT NULL COMMENT 'Connected mailbox; NULL for standalone local drafts',
    sender VARCHAR(254) NOT NULL DEFAULT '' COMMENT 'Sender address for stored messages',
    recipient VARCHAR(254) NOT NULL DEFAULT '' COMMENT 'Recipient address for a draft',
    subject VARCHAR(200) NOT NULL DEFAULT '' COMMENT 'Message subject',
    body MEDIUMTEXT NOT NULL COMMENT 'Stored plain text body',
    folder VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'inbox, draft, sending, sent, archive or trash',
    starred TINYINT NOT NULL DEFAULT 0 COMMENT 'Starred marker',
    unread TINYINT NOT NULL DEFAULT 0 COMMENT 'Unread marker',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    KEY idx_mail_user_folder (user_id, folder, updated_at),
    KEY idx_mail_user_account (user_id, account_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private mail drafts and connected mailbox cache';

CREATE TABLE IF NOT EXISTS mf_ai_conversation (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Conversation ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    title VARCHAR(200) NOT NULL COMMENT 'Conversation title',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (id),
    KEY idx_ai_conversation_user (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Private AI conversation metadata';

CREATE TABLE IF NOT EXISTS mf_ai_message (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Message ID',
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    conversation_id BIGINT NOT NULL COMMENT 'Owned conversation ID',
    role VARCHAR(20) NOT NULL COMMENT 'user or assistant',
    content MEDIUMTEXT NOT NULL COMMENT 'Actual message content, never a fabricated model reply',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation time',
    PRIMARY KEY (id),
    KEY idx_ai_message_conversation (user_id, conversation_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Persisted AI conversation messages';

CREATE TABLE IF NOT EXISTS mf_ai_credential (
    user_id BIGINT NOT NULL COMMENT 'Owner user ID',
    base_url VARCHAR(1000) NOT NULL COMMENT 'User selected OpenAI-compatible API base URL',
    api_key_ciphertext TEXT NULL COMMENT 'AES-256-GCM encrypted provider credential; never returned to clients',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Encrypted per-user AI provider configuration';
