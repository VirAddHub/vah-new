-- 124_add_company_number_if_not_exists.sql
-- Add company_number to "user" if missing (signup writes here; profile coalesces with companies_house_number for display).

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS company_number TEXT;

COMMENT ON COLUMN "user".company_number IS 'Companies House number set at signup; profile also uses companies_house_number (set later).';
