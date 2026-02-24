-- 122_add_companies_house_number.sql
-- Add companies_house_number to "user" for GET /api/profile and CH verification.
-- Idempotent: safe to run if column already exists (e.g. from create_postgres_schema).

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS companies_house_number TEXT;

COMMENT ON COLUMN "user".companies_house_number IS 'Companies House registration number; used by profile and CH verification.';
