-- Performance optimization indexes for VAH application
-- These indexes will dramatically improve query performance

-- Mail items performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_user_status ON mail_item(user_id, status) WHERE deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at DESC) WHERE deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_forwarding_status ON mail_item(forwarding_status) WHERE deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_received_date ON mail_item(received_date) WHERE deleted = false;

-- User performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_plan_status ON "user"(plan_id, plan_status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_kyc_status ON "user"(kyc_status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_created_at ON "user"(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_last_active ON "user"(last_active_at DESC) WHERE deleted_at IS NULL;

-- Forwarding request performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forwarding_req_user_status ON forwarding_request(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forwarding_req_mail_status ON forwarding_request(mail_item_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forwarding_req_created_at ON forwarding_request(created_at DESC);

-- File performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_mail_item ON file(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_created_at ON file(created_at DESC);

-- Subscription performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_user_active ON subscription(user_id, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plan ON subscription(plan_id);

-- Usage charges performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_charges_user_period ON usage_charges(user_id, period_yyyymm);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_charges_created_at ON usage_charges(created_at DESC);

-- Admin audit performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_admin_action ON admin_audit(admin_id, action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_target ON admin_audit(target_type, target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_created_at ON admin_audit(created_at DESC);

-- Mail event performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_event_mail_item ON mail_event(mail_item);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_event_user ON mail_event(actor_user);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_event_created_at ON mail_event(created_at DESC);

-- Notification performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_user_read ON notification(user_id, read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_user_created_status ON mail_item(user_id, created_at DESC, status) WHERE deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_plan_kyc_status ON "user"(plan_id, kyc_status, plan_status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forwarding_req_user_created_status ON forwarding_request(user_id, created_at DESC, status);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_active ON mail_item(user_id, created_at DESC) WHERE deleted = false AND status != 'deleted';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_active ON "user"(email, plan_id) WHERE deleted_at IS NULL AND plan_status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forwarding_req_pending ON forwarding_request(user_id, created_at DESC) WHERE status IN ('Requested', 'Processing');

-- Text search indexes (if using PostgreSQL full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_item_search ON mail_item USING gin(to_tsvector('english', subject || ' ' || COALESCE(sender_name, '') || ' ' || COALESCE(tag, '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_search ON "user" USING gin(to_tsvector('english', email || ' ' || COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')));

-- Analyze tables after creating indexes
ANALYZE mail_item;
ANALYZE "user";
ANALYZE forwarding_request;
ANALYZE file;
ANALYZE subscription;
ANALYZE usage_charges;
ANALYZE admin_audit;
ANALYZE mail_event;
ANALYZE notification;
