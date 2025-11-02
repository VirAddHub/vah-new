-- Migration: Add indexes for admin overview dashboard queries
-- Created: 2025-11-02
-- Purpose: Improve performance of admin overview queries

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_user_last_login_at ON "user"(last_login_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_kyc_status ON "user"(kyc_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON "user"(deleted_at);

-- Mail indexes
CREATE INDEX IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_mail_item_deleted ON mail_item(deleted);

-- Forwarding indexes
CREATE INDEX IF NOT EXISTS idx_forwarding_request_status ON forwarding_request(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_request_created_at ON forwarding_request(created_at);
CREATE INDEX IF NOT EXISTS idx_forwarding_request_dispatched_at ON forwarding_request(dispatched_at) WHERE dispatched_at IS NOT NULL;

-- Invoice indexes for revenue calculations (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status) WHERE status = 'paid';
        CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at) WHERE status = 'paid';
    END IF;
END $$;

-- Activity log indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
        CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
        -- Only create event_type index if column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'event_type') THEN
            CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON activity_log(event_type);
        END IF;
        CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id) WHERE user_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_activity_log_mail_item_id ON activity_log(mail_item_id) WHERE mail_item_id IS NOT NULL;
    END IF;
END $$;

