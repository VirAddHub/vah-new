-- Create missing tables for maintenance service
-- This fixes the errors in the production logs

-- Admin operation locks table
CREATE TABLE IF NOT EXISTS admin_operation_locks (
    id SERIAL PRIMARY KEY,
    operation_type TEXT NOT NULL,
    resource_id TEXT,
    admin_id INTEGER REFERENCES "user"(id),
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_operation_locks_operation ON admin_operation_locks(operation_type);
CREATE INDEX IF NOT EXISTS idx_admin_operation_locks_expires ON admin_operation_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_operation_locks_admin ON admin_operation_locks(admin_id);

-- Concurrent operations table
CREATE TABLE IF NOT EXISTS concurrent_operations (
    id SERIAL PRIMARY KEY,
    operation_type TEXT NOT NULL,
    resource_id TEXT,
    user_id INTEGER REFERENCES "user"(id),
    status TEXT DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concurrent_operations_type ON concurrent_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_concurrent_operations_status ON concurrent_operations(status);
CREATE INDEX IF NOT EXISTS idx_concurrent_operations_user ON concurrent_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_concurrent_operations_started ON concurrent_operations(started_at);

-- Admin activity table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS admin_activity (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES "user"(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON admin_activity(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity(target_type, target_id);

-- Create cleanup function for expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_operation_locks 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup function for old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_activity 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup function for old concurrent operations
CREATE OR REPLACE FUNCTION cleanup_old_concurrent_operations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM concurrent_operations 
    WHERE started_at < NOW() - INTERVAL '7 days'
    AND status IN ('completed', 'failed');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update system metrics
CREATE OR REPLACE FUNCTION update_system_metrics()
RETURNS JSONB AS $$
DECLARE
    metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL),
        'active_users', (SELECT COUNT(*) FROM "user" WHERE deleted_at IS NULL AND last_active_at > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000),
        'total_mail_items', (SELECT COUNT(*) FROM mail_item WHERE deleted = false),
        'pending_forwarding_requests', (SELECT COUNT(*) FROM forwarding_request WHERE status = 'pending'),
        'system_uptime', EXTRACT(EPOCH FROM NOW() - pg_postmaster_start_time()),
        'last_updated', NOW()
    ) INTO metrics;
    
    RETURN metrics;
END;
$$ LANGUAGE plpgsql;
