-- Migration: Add plan_id to user table to link to plans table

-- Add plan_id column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS plan_id bigint REFERENCES plans(id);

-- Create index for efficient plan queries
CREATE INDEX IF NOT EXISTS idx_user_plan_id ON "user"(plan_id);

-- Update existing users to have a default plan (monthly plan, assuming it's id=1 after migration 013)
-- You can adjust this based on your actual plan IDs
UPDATE "user"
SET plan_id = (SELECT id FROM plans WHERE interval = 'month' ORDER BY price_pence ASC LIMIT 1)
WHERE plan_id IS NULL AND status = 'active';
