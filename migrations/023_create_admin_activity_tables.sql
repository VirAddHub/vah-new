-- Migration: Create admin activity tracking tables
-- Date: 2025-01-09
-- Purpose: Create tables needed for admin dashboard Recent Activity section

-- Create admin_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_log (
    id SERIAL PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Create activity_log table for tracking user activities
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Create mail_event table for tracking mail-related events
CREATE TABLE IF NOT EXISTS mail_event (
    id SERIAL PRIMARY KEY,
    mail_item INTEGER REFERENCES mail_item(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    meta_json JSONB DEFAULT '{}',
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_user ON admin_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_created_at ON admin_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_log_action_type ON admin_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_log_target ON admin_log(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);

CREATE INDEX IF NOT EXISTS idx_mail_event_mail_item ON mail_event(mail_item);
CREATE INDEX IF NOT EXISTS idx_mail_event_user ON mail_event(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_event_created_at ON mail_event(created_at);
CREATE INDEX IF NOT EXISTS idx_mail_event_type ON mail_event(event_type);

-- Insert some sample data for testing
INSERT INTO admin_log (admin_user_id, action_type, target_type, target_id, details, created_at) VALUES
(1, 'user_created', 'user', 1, '{"email": "test@example.com"}', EXTRACT(EPOCH FROM NOW()) * 1000),
(1, 'plan_update', 'plan', 1, '{"old_price": 995, "new_price": 994}', EXTRACT(EPOCH FROM NOW()) * 1000 - 3600000),
(1, 'kyc_verified', 'user', 2, '{"status": "verified"}', EXTRACT(EPOCH FROM NOW()) * 1000 - 7200000)
ON CONFLICT DO NOTHING;

INSERT INTO activity_log (user_id, action, details, created_at) VALUES
(1, 'login', '{"ip": "127.0.0.1"}', EXTRACT(EPOCH FROM NOW()) * 1000),
(1, 'mail_viewed', '{"mail_id": 1}', EXTRACT(EPOCH FROM NOW()) * 1000 - 1800000),
(2, 'signup', '{"email": "user2@example.com"}', EXTRACT(EPOCH FROM NOW()) * 1000 - 3600000)
ON CONFLICT DO NOTHING;

INSERT INTO mail_event (mail_item, user_id, event_type, event, details, created_at) VALUES
(1, 1, 'mail.received', 'mail.received', '{"subject": "Test Mail"}', EXTRACT(EPOCH FROM NOW()) * 1000),
(1, 1, 'mail.scanned', 'mail.scanned', '{"scan_url": "https://example.com/scan"}', EXTRACT(EPOCH FROM NOW()) * 1000 - 900000),
(2, 2, 'mail.forwarded', 'mail.forwarded', '{"forwarding_address": "123 Main St"}', EXTRACT(EPOCH FROM NOW()) * 1000 - 1800000)
ON CONFLICT DO NOTHING;
