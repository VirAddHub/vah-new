-- Provider-independent identity records, customer company declarations, company check v2.
-- Additive only. Sumsub columns (user.sumsub_*, business_owner.sumsub_applicant_id, kyc_status table)
-- and verification_event / webhook_log rows are kept unchanged as historical records.

-- 1. Identity: when a customer started verification, independent of provider.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS identity_submitted_at TIMESTAMPTZ;
UPDATE "user" SET identity_submitted_at = COALESCE(to_timestamp(sumsub_last_updated / 1000.0), NOW())
 WHERE identity_submitted_at IS NULL AND sumsub_applicant_id IS NOT NULL;

-- Every identity result recorded for an account holder or business owner (provider or manual).
CREATE TABLE IF NOT EXISTS identity_check (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES "user"(id),
    owner_id    BIGINT NULL, -- business_owner.id at the time; no foreign key so the record outlives the owner row
    subject     TEXT NOT NULL CHECK (subject IN ('account_holder', 'owner')),
    outcome     TEXT NOT NULL CHECK (outcome IN ('verified', 'rejected')),
    method      TEXT NOT NULL CHECK (method IN ('manual_documents', 'provider', 'testing')),
    reference   TEXT,
    notes       TEXT NOT NULL,
    admin_id    BIGINT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS identity_check_user_idx ON identity_check (user_id);

-- 2. Customer's declaration about their company (activity, place of business, directors,
--    beneficial owners and ownership structure). Each submission is a new row; the latest counts.
CREATE TABLE IF NOT EXISTS company_declaration (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES "user"(id),
    company_number  TEXT NOT NULL,
    data            JSONB NOT NULL,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_at     TIMESTAMPTZ,
    returned_by     BIGINT,
    returned_reason TEXT
);
CREATE INDEX IF NOT EXISTS company_declaration_user_idx ON company_declaration (user_id, company_number, submitted_at DESC);

-- 3. Company check v2: risk rating, discrepancy category and materiality.
ALTER TABLE company_check ADD COLUMN IF NOT EXISTS risk_rating TEXT CHECK (risk_rating IN ('low', 'medium', 'high'));
ALTER TABLE company_check ADD COLUMN IF NOT EXISTS risk_reason TEXT;
ALTER TABLE company_check_entry ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('beneficial_ownership', 'other'));
ALTER TABLE company_check_entry ADD COLUMN IF NOT EXISTS materiality TEXT CHECK (materiality IN ('material', 'not_material', 'register_corrected', 'not_applicable'));
ALTER TABLE company_check_entry ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'system'));
-- For discrepancies the system detects: a stable key so each is recorded once (admin_id 0 = system).
ALTER TABLE company_check_entry ADD COLUMN IF NOT EXISTS detected_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS company_check_entry_detected_key ON company_check_entry (check_id, detected_key) WHERE detected_key IS NOT NULL AND resolved_at IS NULL;

CREATE OR REPLACE FUNCTION company_check_entry_resolve_only() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'company_check_entry records cannot be deleted'; END IF;
    IF OLD.resolved_at IS NOT NULL
       OR NEW.check_id IS DISTINCT FROM OLD.check_id OR NEW.admin_id IS DISTINCT FROM OLD.admin_id
       OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.field IS DISTINCT FROM OLD.field OR NEW.ch_value IS DISTINCT FROM OLD.ch_value
       OR NEW.customer_value IS DISTINCT FROM OLD.customer_value OR NEW.material IS DISTINCT FROM OLD.material
       OR NEW.category IS DISTINCT FROM OLD.category OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.detected_key IS DISTINCT FROM OLD.detected_key
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'company_check_entry: only an unresolved entry can be resolved';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS identity_check_immutable ON identity_check;
CREATE TRIGGER identity_check_immutable BEFORE UPDATE OR DELETE ON identity_check
    FOR EACH ROW EXECUTE FUNCTION company_check_no_change();
