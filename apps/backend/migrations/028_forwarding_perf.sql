-- Migration: Add performance indexes for forwarding search
-- Date: 2024-01-01 (example date)

-- Trigram for fuzzy search across a few columns (requires pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fast fuzzy search
CREATE INDEX IF NOT EXISTS idx_fr_to_name_trgm ON forwarding_request USING GIN (to_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fr_postal_trgm ON forwarding_request USING GIN (postal gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fr_courier_trgm ON forwarding_request USING GIN (courier gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fr_tracking_trgm ON forwarding_request USING GIN (tracking_number gin_trgm_ops);

-- Common filters
CREATE INDEX IF NOT EXISTS idx_fr_status ON forwarding_request(status);
CREATE INDEX IF NOT EXISTS idx_fr_created_at ON forwarding_request(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fr_status_created ON forwarding_request(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fr_user_status ON forwarding_request(user_id, status);




