-- Concurrency Control and Race Condition Prevention
-- Migration: 022_concurrency_controls.sql

-- Add version tracking for optimistic locking
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE mail_item ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add admin operation locks table
CREATE TABLE IF NOT EXISTS admin_operation_locks (
    id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL, -- 'forwarding_request', 'mail_item', 'user', etc.
    resource_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES "user"(id),
    operation VARCHAR(50) NOT NULL, -- 'processing', 'reviewing', 'dispatching', etc.
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
    metadata JSONB DEFAULT '{}',
    UNIQUE(resource_type, resource_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_operation_locks_resource ON admin_operation_locks(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_operation_locks_admin ON admin_operation_locks(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_operation_locks_expires ON admin_operation_locks(expires_at);

-- Add admin activity tracking
CREATE TABLE IF NOT EXISTS admin_activity (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES "user"(id),
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_resource ON admin_activity(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity(created_at);

-- Add concurrent operation tracking
CREATE TABLE IF NOT EXISTS concurrent_operations (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    resource_id INTEGER NOT NULL,
    admin_id INTEGER NOT NULL REFERENCES "user"(id),
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_concurrent_operations_resource ON concurrent_operations(operation_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_concurrent_operations_admin ON concurrent_operations(admin_id);
CREATE INDEX IF NOT EXISTS idx_concurrent_operations_status ON concurrent_operations(status);

-- Function to acquire lock with timeout
CREATE OR REPLACE FUNCTION acquire_admin_lock(
    p_resource_type VARCHAR(50),
    p_resource_id INTEGER,
    p_admin_id INTEGER,
    p_operation VARCHAR(50),
    p_timeout_minutes INTEGER DEFAULT 30
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_id INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Clean up expired locks first
    DELETE FROM admin_operation_locks 
    WHERE expires_at < NOW();
    
    -- Try to acquire lock
    BEGIN
        v_expires_at := NOW() + (p_timeout_minutes || ' minutes')::INTERVAL;
        
        INSERT INTO admin_operation_locks (
            resource_type, resource_id, admin_id, operation, expires_at
        ) VALUES (
            p_resource_type, p_resource_id, p_admin_id, p_operation, v_expires_at
        ) RETURNING id INTO v_lock_id;
        
        RETURN TRUE;
    EXCEPTION WHEN unique_violation THEN
        -- Lock already exists, check if it's expired
        DELETE FROM admin_operation_locks 
        WHERE resource_type = p_resource_type 
        AND resource_id = p_resource_id 
        AND expires_at < NOW();
        
        -- Try again
        BEGIN
            INSERT INTO admin_operation_locks (
                resource_type, resource_id, admin_id, operation, expires_at
            ) VALUES (
                p_resource_type, p_resource_id, p_admin_id, p_operation, v_expires_at
            );
            RETURN TRUE;
        EXCEPTION WHEN unique_violation THEN
            RETURN FALSE;
        END;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to release lock
CREATE OR REPLACE FUNCTION release_admin_lock(
    p_resource_type VARCHAR(50),
    p_resource_id INTEGER,
    p_admin_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM admin_operation_locks 
    WHERE resource_type = p_resource_type 
    AND resource_id = p_resource_id 
    AND admin_id = p_admin_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to check if resource is locked
CREATE OR REPLACE FUNCTION is_resource_locked(
    p_resource_type VARCHAR(50),
    p_resource_id INTEGER
) RETURNS TABLE(
    is_locked BOOLEAN,
    locked_by INTEGER,
    operation VARCHAR(50),
    locked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as is_locked,
        aol.admin_id as locked_by,
        aol.operation,
        aol.locked_at,
        aol.expires_at
    FROM admin_operation_locks aol
    WHERE aol.resource_type = p_resource_type 
    AND aol.resource_id = p_resource_id
    AND aol.expires_at > NOW();
    
    -- If no rows returned, resource is not locked
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR(50), NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update forwarding request with optimistic locking
CREATE OR REPLACE FUNCTION update_forwarding_request_safe(
    p_id INTEGER,
    p_admin_id INTEGER,
    p_status VARCHAR(50),
    p_version INTEGER,
    p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(
    success BOOLEAN,
    new_version INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_current_version INTEGER;
    v_new_version INTEGER;
BEGIN
    -- Get current version
    SELECT version INTO v_current_version
    FROM forwarding_request
    WHERE id = p_id;
    
    -- Check if record exists
    IF v_current_version IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Forwarding request not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check version match (optimistic locking)
    IF v_current_version != p_version THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Version mismatch - another admin may have updated this record'::TEXT;
        RETURN;
    END IF;
    
    -- Update with new version
    v_new_version := v_current_version + 1;
    
    UPDATE forwarding_request 
    SET 
        status = p_status,
        version = v_new_version,
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::JSONB) || p_metadata
    WHERE id = p_id AND version = p_version;
    
    -- Check if update succeeded
    IF FOUND THEN
        -- Log admin activity
        INSERT INTO admin_activity (admin_id, resource_type, resource_id, action, new_status, metadata)
        VALUES (p_admin_id, 'forwarding_request', p_id, 'status_update', p_status, p_metadata);
        
        RETURN QUERY SELECT TRUE, v_new_version, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Update failed - record may have been modified'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update mail item with optimistic locking
CREATE OR REPLACE FUNCTION update_mail_item_safe(
    p_id INTEGER,
    p_admin_id INTEGER,
    p_status VARCHAR(50),
    p_version INTEGER,
    p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE(
    success BOOLEAN,
    new_version INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_current_version INTEGER;
    v_new_version INTEGER;
BEGIN
    -- Get current version
    SELECT version INTO v_current_version
    FROM mail_item
    WHERE id = p_id;
    
    -- Check if record exists
    IF v_current_version IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Mail item not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check version match (optimistic locking)
    IF v_current_version != p_version THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Version mismatch - another admin may have updated this record'::TEXT;
        RETURN;
    END IF;
    
    -- Update with new version
    v_new_version := v_current_version + 1;
    
    UPDATE mail_item 
    SET 
        status = p_status,
        version = v_new_version,
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::JSONB) || p_metadata
    WHERE id = p_id AND version = p_version;
    
    -- Check if update succeeded
    IF FOUND THEN
        -- Log admin activity
        INSERT INTO admin_activity (admin_id, resource_type, resource_id, action, new_status, metadata)
        VALUES (p_admin_id, 'mail_item', p_id, 'status_update', p_status, p_metadata);
        
        RETURN QUERY SELECT TRUE, v_new_version, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::INTEGER, 'Update failed - record may have been modified'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired locks (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_locks() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM admin_operation_locks WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to automatically increment version on updates
CREATE OR REPLACE FUNCTION increment_version() RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version triggers
DROP TRIGGER IF EXISTS trigger_forwarding_request_version ON forwarding_request;
CREATE TRIGGER trigger_forwarding_request_version
    BEFORE UPDATE ON forwarding_request
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_mail_item_version ON mail_item;
CREATE TRIGGER trigger_mail_item_version
    BEFORE UPDATE ON mail_item
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trigger_user_version ON "user";
CREATE TRIGGER trigger_user_version
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION increment_version();

-- Add constraints to prevent invalid status transitions
CREATE TABLE IF NOT EXISTS forwarding_status_transitions (
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO forwarding_status_transitions (from_status, to_status) VALUES
    ('requested', 'reviewed'),
    ('requested', 'cancelled'),
    ('reviewed', 'processing'),
    ('reviewed', 'cancelled'),
    ('processing', 'dispatched'),
    ('processing', 'cancelled'),
    ('dispatched', 'delivered'),
    ('cancelled', 'requested') -- Allow reactivation
ON CONFLICT DO NOTHING;

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition(
    p_resource_type VARCHAR(50),
    p_from_status VARCHAR(50),
    p_to_status VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
    IF p_resource_type = 'forwarding_request' THEN
        RETURN EXISTS (
            SELECT 1 FROM forwarding_status_transitions 
            WHERE from_status = p_from_status AND to_status = p_to_status
        );
    END IF;
    
    -- Add other resource types as needed
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
