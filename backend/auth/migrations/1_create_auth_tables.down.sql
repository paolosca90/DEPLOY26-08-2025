-- Drop triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS update_mt5_credentials_updated_at ON mt5_credentials;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_mt5_credentials_user_id;
DROP INDEX IF EXISTS idx_mt5_credentials_active;
DROP INDEX IF EXISTS idx_installer_downloads_user_id;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_created_at;

-- Drop tables in reverse order (due to foreign key constraints)
DROP TABLE IF EXISTS auth_audit_log;
DROP TABLE IF EXISTS installer_downloads;
DROP TABLE IF EXISTS mt5_credentials;
DROP TABLE IF EXISTS user_subscriptions;
DROP TABLE IF EXISTS users;