-- Migration: Add unique index on invoices (user_id, period_start, period_end)
-- Created: 2025-12-22
-- Purpose: Ensure idempotent invoice generation per user period

-- Create unique index for idempotent invoice generation
-- This allows ON CONFLICT handling in invoiceService.generateInvoiceForPeriod
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_period_unique
    ON invoices(user_id, period_start, period_end);

-- Comment for documentation
COMMENT ON INDEX idx_invoices_user_period_unique IS
    'Ensures only one invoice per user per billing period. Used for idempotent invoice generation.';

