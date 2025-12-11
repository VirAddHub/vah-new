-- 116_add_invoice_columns.sql
-- Add missing columns to invoices table for automated invoice generation

-- Add gocardless_payment_id column if it doesn't exist
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS gocardless_payment_id TEXT;

-- Add currency column if it doesn't exist (default GBP)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';

-- Ensure period_start and period_end exist (they should from base schema, but check)
-- Note: base schema uses TEXT, we'll keep that for compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'period_start'
  ) THEN
    ALTER TABLE invoices ADD COLUMN period_start TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'period_end'
  ) THEN
    ALTER TABLE invoices ADD COLUMN period_end TEXT;
  END IF;
END $$;

-- Ensure pdf_path can be nullable (for invoices created before PDF generation)
ALTER TABLE invoices
  ALTER COLUMN pdf_path DROP NOT NULL;

-- Create unique index on gocardless_payment_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_gocardless_payment_id 
  ON invoices(gocardless_payment_id) 
  WHERE gocardless_payment_id IS NOT NULL;

-- Create index for efficient user invoice queries with period
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_period 
  ON invoices(user_id, period_end DESC);

-- Add helpful comments
COMMENT ON COLUMN invoices.gocardless_payment_id IS 'GoCardless payment ID that triggered this invoice';
COMMENT ON COLUMN invoices.period_start IS 'Start date of billing period';
COMMENT ON COLUMN invoices.period_end IS 'End date of billing period';
COMMENT ON COLUMN invoices.pdf_path IS 'Relative path to generated PDF invoice';

