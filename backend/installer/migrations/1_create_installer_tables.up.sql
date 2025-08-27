-- Generated installers table
CREATE TABLE IF NOT EXISTS generated_installers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    download_token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    download_count INTEGER DEFAULT 0
);

-- Installer audit log
CREATE TABLE IF NOT EXISTS installer_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL, -- 'generate_installer', 'download_installer', etc.
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_generated_installers_user_id ON generated_installers(user_id);
CREATE INDEX idx_generated_installers_download_token ON generated_installers(download_token);
CREATE INDEX idx_generated_installers_expires_at ON generated_installers(expires_at);
CREATE INDEX idx_installer_audit_log_user_id ON installer_audit_log(user_id);
CREATE INDEX idx_installer_audit_log_action ON installer_audit_log(action);
CREATE INDEX idx_installer_audit_log_created_at ON installer_audit_log(created_at);