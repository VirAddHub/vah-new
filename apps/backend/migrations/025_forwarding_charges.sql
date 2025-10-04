-- Migration: Add forwarding_charge table for tracking £2 forwarding fees
-- Date: 2025-01-04

-- Create forwarding_charge table
CREATE TABLE IF NOT EXISTS forwarding_charge (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    mail_item_id INTEGER NOT NULL REFERENCES mail_item(id) ON DELETE CASCADE,
    amount_pence INTEGER NOT NULL DEFAULT 200, -- £2.00
    status TEXT NOT NULL DEFAULT 'pending', -- pending, charged, cancelled
    invoice_id INTEGER REFERENCES invoice(id) ON DELETE SET NULL,
    charged_at BIGINT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_user ON forwarding_charge(user_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_mail_item ON forwarding_charge(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_status ON forwarding_charge(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_charge_invoice ON forwarding_charge(invoice_id);

-- Unique constraint to prevent duplicate charges for the same mail item
CREATE UNIQUE INDEX IF NOT EXISTS idx_forwarding_charge_unique ON forwarding_charge(mail_item_id) WHERE status = 'pending';

COMMENT ON TABLE forwarding_charge IS 'Tracks £2 forwarding charges for non-HMRC/Companies House mail';
COMMENT ON COLUMN forwarding_charge.amount_pence IS 'Amount in pence (200 = £2.00)';
COMMENT ON COLUMN forwarding_charge.status IS 'pending: awaiting charge, charged: added to invoice, cancelled: charge cancelled';
