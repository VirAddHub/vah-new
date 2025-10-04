-- MANUAL DATABASE FIX FOR 500 ERRORS
-- Run this script on your Render PostgreSQL database to fix the missing columns
-- that are causing 500 errors in the API endpoints

-- 1. Add email_unsubscribed_at column to user table (for email-prefs endpoint)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_unsubscribed_at TIMESTAMPTZ;

-- 2. Add state column to user table (for profile endpoint) - alias for status
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS state TEXT;

-- 3. Add billing_interval column to payment table (for payments endpoint)
ALTER TABLE payment ADD COLUMN IF NOT EXISTS billing_interval TEXT;

-- 4. Add item_id column to forwarding_request table (for forwarding endpoint)
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS item_id BIGINT REFERENCES mail_item(id);

-- 5. Add email preference columns to user table
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS email_pref_marketing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_pref_product  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_pref_system   boolean NOT NULL DEFAULT true;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_email_unsubscribed_at ON "user"(email_unsubscribed_at);

-- 7. Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user' 
AND column_name IN ('email_unsubscribed_at', 'state', 'email_pref_marketing', 'email_pref_product', 'email_pref_system')
ORDER BY column_name;
