-- Add missing fields to user table for signup endpoint
-- Run this script against your Render PostgreSQL database

-- Add phone field
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add business information fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS country_of_incorporation TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS company_number TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Add forwarding address fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS forward_to_first_name TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS forward_to_last_name TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS forward_country TEXT;

-- Add billing fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS billing TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS price TEXT;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user' 
ORDER BY ordinal_position;
