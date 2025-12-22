-- Migration: Create charge table for billable charges (forwarding fees, etc.)
-- Created: 2025-12-20
-- Purpose: Track billable charges that roll into monthly invoices

-- Enable UUID extension if not already enabled (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create charge table
CREATE TABLE IF NOT EXISTS charge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    amount_pence INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    type TEXT NOT NULL,  -- 'forwarding_fee'
    description TEXT NOT NULL,
    service_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'billed'|'void'
    invoice_id BIGINT NULL REFERENCES invoices(id) ON DELETE SET NULL,
    related_type TEXT NULL,  -- 'forwarding_request'
    related_id BIGINT NULL,  -- ID of the related entity (forwarding_request.id)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billed_at TIMESTAMPTZ NULL
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_charge_user_status_date 
    ON charge(user_id, status, service_date);

-- Index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_charge_invoice_id 
    ON charge(invoice_id) 
    WHERE invoice_id IS NOT NULL;

-- Index for related entity lookups
CREATE INDEX IF NOT EXISTS idx_charge_related 
    ON charge(related_type, related_id) 
    WHERE related_type IS NOT NULL AND related_id IS NOT NULL;

-- Unique constraint for idempotency: prevents duplicate charges for same type/related entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_charge_idempotency 
    ON charge(type, related_type, related_id) 
    WHERE related_type IS NOT NULL AND related_id IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE charge IS 
    'Billable charges (forwarding fees, etc.) that roll into monthly invoices.';
COMMENT ON COLUMN charge.type IS 
    'Type of charge: forwarding_fee, etc.';
COMMENT ON COLUMN charge.status IS 
    'pending: not yet billed, billed: included in invoice, void: cancelled';
COMMENT ON COLUMN charge.service_date IS 
    'Date when the service was provided (used for period matching)';
COMMENT ON COLUMN charge.related_type IS 
    'Type of related entity: forwarding_request, etc.';
COMMENT ON COLUMN charge.related_id IS 
    'ID of the related entity (e.g., forwarding_request.id). Unique constraint on (type, related_type, related_id) prevents duplicate charges if webhook/job retries';

