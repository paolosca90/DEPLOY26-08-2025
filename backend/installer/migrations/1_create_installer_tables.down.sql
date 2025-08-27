-- Drop indexes
DROP INDEX IF EXISTS idx_generated_installers_user_id;
DROP INDEX IF EXISTS idx_generated_installers_download_token;
DROP INDEX IF EXISTS idx_generated_installers_expires_at;
DROP INDEX IF EXISTS idx_installer_audit_log_user_id;
DROP INDEX IF EXISTS idx_installer_audit_log_action;
DROP INDEX IF EXISTS idx_installer_audit_log_created_at;

-- Drop tables
DROP TABLE IF EXISTS installer_audit_log;
DROP TABLE IF EXISTS generated_installers;