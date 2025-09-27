-- Add audit log table for authentication events
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_type TEXT NOT NULL, -- 'login_ok', 'login_failed', 'logout', 'session_expired', 'password_changed'
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    metadata TEXT -- JSON string for additional data
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
