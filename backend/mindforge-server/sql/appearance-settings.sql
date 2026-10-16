-- Additive appearance migration. Apply with scripts/DatabaseMaintenance.java:
-- its restricted ALTER handling skips this column if already present.
-- Existing NULL preferences use the plain background by default.

ALTER TABLE mf_user_setting ADD COLUMN appearance_json TEXT NULL COMMENT 'Workspace background preferences';
