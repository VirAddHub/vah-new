-- Add number column to invoice table for compatibility
-- The code expects 'number' but the schema has 'invoice_number'
-- This migration adds 'number' as an alias to 'invoice_number'

-- Add number column that references invoice_number
ALTER TABLE invoice ADD COLUMN IF NOT EXISTS number text;

-- Update number column to match invoice_number values
UPDATE invoice SET number = invoice_number WHERE number IS NULL;

-- Make number column NOT NULL after populating it
ALTER TABLE invoice ALTER COLUMN number SET NOT NULL;

-- Create index on number column
CREATE INDEX IF NOT EXISTS idx_invoice_number_alias ON invoice(number);
