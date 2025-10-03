-- 110_rename_invoice_to_invoices.sql
-- Rename invoice table to invoices (plural) to match code expectations

-- Rename the table
ALTER TABLE IF EXISTS invoice RENAME TO invoices;

-- Rename invoice_token foreign key constraint if it exists
DO $$
BEGIN
    -- Check if the constraint exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invoice_token_invoice_id_fkey'
        AND table_name = 'invoice_token'
    ) THEN
        ALTER TABLE invoice_token
        DROP CONSTRAINT invoice_token_invoice_id_fkey,
        ADD CONSTRAINT invoice_token_invoices_id_fkey
            FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update indexes that reference the old table name
DROP INDEX IF EXISTS idx_invoice_user;
DROP INDEX IF EXISTS idx_invoice_created;
DROP INDEX IF EXISTS idx_invoice_number;

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Rename invoice_seq table as well for consistency
ALTER TABLE IF EXISTS invoice_seq RENAME TO invoices_seq;

DROP INDEX IF EXISTS idx_invoice_seq_year;
CREATE INDEX IF NOT EXISTS idx_invoices_seq_year ON invoices_seq(year);
