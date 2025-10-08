-- Subscriptions (optional but clean)
CREATE TABLE IF NOT EXISTS subscription (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  plan_name TEXT NOT NULL DEFAULT 'Digital Mailbox Plan',
  cadence TEXT NOT NULL DEFAULT 'monthly', -- monthly|annual
  status TEXT NOT NULL DEFAULT 'active',   -- active|past_due|canceled
  next_charge_at BIGINT,
  mandate_id TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now())*1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now())*1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscription(user_id);

-- Invoices (or reuse your "payment" rows if you already have invoices)
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  created_at BIGINT NOT NULL,
  amount_pence INT NOT NULL,
  status TEXT NOT NULL,                   -- paid|failed|pending|refunded
  invoice_url TEXT,                       -- hosted PDF
  pdf_token TEXT                          -- optional one-time token route
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);

-- Usage charges (forwarding handling and postage)
CREATE TABLE IF NOT EXISTS usage_charges (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  period_yyyymm TEXT NOT NULL,            -- e.g. '2025-10'
  type TEXT NOT NULL,                     -- forwarding|postage|other
  qty INT NOT NULL DEFAULT 1,
  amount_pence INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage_charges(user_id, period_yyyymm);

-- Ensure "user.forwarding_address" exists (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user' AND column_name='forwarding_address'
  ) THEN
    ALTER TABLE "user" ADD COLUMN forwarding_address TEXT;
    COMMENT ON COLUMN "user".forwarding_address IS 'Default physical forwarding address supplied by the user';
  END IF;
END $$;
