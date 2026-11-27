-- Company details entered by staff on the customer's behalf (from a call, email, meeting or
-- document) instead of by the customer on their dashboard. Records who entered them and how the
-- customer gave them.
ALTER TABLE company_declaration ADD COLUMN IF NOT EXISTS entered_by_admin BIGINT;
ALTER TABLE company_declaration ADD COLUMN IF NOT EXISTS entered_source TEXT;
ALTER TABLE company_declaration ADD COLUMN IF NOT EXISTS entered_note TEXT;
