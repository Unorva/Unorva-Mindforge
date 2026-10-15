-- Incremental migration: serialize only related writes in the same business module.
-- Existing user settings and business records are preserved.
CREATE TABLE IF NOT EXISTS mf_business_lock (
    user_id BIGINT NOT NULL,
    module_name VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, module_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Per-user, per-module transaction locks';
