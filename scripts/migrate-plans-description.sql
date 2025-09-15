PRAGMA foreign_keys=ON;

-- Ensure plans table exists with slug & description
CREATE TABLE IF NOT EXISTS plans (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  amount_pence  INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'GBP',
  interval      TEXT NOT NULL DEFAULT 'month',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- In case it existed but missing columns:
ALTER TABLE plans ADD COLUMN slug TEXT;         -- ignored if exists
ALTER TABLE plans ADD COLUMN description TEXT;  -- ignored if exists
ALTER TABLE plans ADD COLUMN amount_pence INTEGER;  -- ignored if exists
ALTER TABLE plans ADD COLUMN currency TEXT;     -- ignored if exists
ALTER TABLE plans ADD COLUMN interval TEXT;     -- ignored if exists
ALTER TABLE plans ADD COLUMN is_active INTEGER; -- ignored if exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_slug ON plans(slug);

-- Seed at least one plan if empty
INSERT INTO plans (name, slug, description, amount_pence, currency, interval, is_active)
SELECT 'Starter', 'starter-999', 'Starter plan @ £9.99', 999, 'GBP', 'month', 1
WHERE NOT EXISTS (SELECT 1 FROM plans);
