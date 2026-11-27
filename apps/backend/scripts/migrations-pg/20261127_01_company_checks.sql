-- Company due diligence ("Company checks") built on the Companies House public data API.
-- Additive only: new tables, no change to existing rows.
--
-- company_check          one row per customer + company: Companies House snapshot, checklist, decision, monitoring
-- company_check_entry    administrator notes and discrepancies (append-only; resolution is recorded, never deleted)
-- company_check_evidence supporting documents (e.g. beneficial-ownership evidence, Companies House discrepancy report receipt)
-- company_check_report   dated, immutable verification reports kept for HMRC inspection
-- company_check_alert    changes found by monitoring, for administrators to review
--
-- Records are kept for at least five years after the business relationship ends (MLR reg 40),
-- so there are no cascading deletes from "user" and reports/entries cannot be altered or removed.

CREATE TABLE IF NOT EXISTS company_check (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES "user"(id),
    business_id        BIGINT NULL REFERENCES business(id) ON DELETE SET NULL,
    company_number     TEXT NOT NULL,
    company_name       TEXT,
    status             TEXT NOT NULL DEFAULT 'in_progress'
                       CHECK (status IN ('in_progress', 'further_investigation', 'satisfactory')),
    checklist          JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot           JSONB,
    snapshot_hash      TEXT,
    fetched_at         TIMESTAMPTZ,
    fetch_error        TEXT,
    decided_by         BIGINT,
    decided_at         TIMESTAMPTZ,
    decision_reason    TEXT,
    monitoring         BOOLEAN NOT NULL DEFAULT false,
    last_monitored_at  TIMESTAMPTZ,
    created_by         BIGINT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT company_check_user_company_unique UNIQUE (user_id, company_number)
);
CREATE INDEX IF NOT EXISTS company_check_status_idx ON company_check (status);
CREATE INDEX IF NOT EXISTS company_check_monitoring_idx ON company_check (monitoring, last_monitored_at);

CREATE TABLE IF NOT EXISTS company_check_entry (
    id               BIGSERIAL PRIMARY KEY,
    check_id         BIGINT NOT NULL REFERENCES company_check(id),
    admin_id         BIGINT NOT NULL,
    kind             TEXT NOT NULL CHECK (kind IN ('note', 'discrepancy')),
    field            TEXT,
    ch_value         TEXT,
    customer_value   TEXT,
    material         BOOLEAN,
    body             TEXT NOT NULL,
    resolution       TEXT,
    reported_to_ch   BOOLEAN NOT NULL DEFAULT false,
    report_reference TEXT,
    resolved_by      BIGINT,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS company_check_entry_check_idx ON company_check_entry (check_id);

CREATE TABLE IF NOT EXISTS company_check_evidence (
    id          BIGSERIAL PRIMARY KEY,
    check_id    BIGINT NOT NULL REFERENCES company_check(id),
    admin_id    BIGINT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('beneficial_ownership', 'discrepancy_report', 'company_document', 'other')),
    description TEXT NOT NULL,
    filename    TEXT NOT NULL,
    mime        TEXT NOT NULL,
    size_bytes  INTEGER NOT NULL,
    sha256      TEXT NOT NULL,
    bytes       BYTEA NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS company_check_evidence_check_idx ON company_check_evidence (check_id);

CREATE TABLE IF NOT EXISTS company_check_report (
    id          BIGSERIAL PRIMARY KEY,
    check_id    BIGINT NOT NULL REFERENCES company_check(id),
    created_by  BIGINT NOT NULL,
    reason      TEXT NOT NULL,
    status      TEXT NOT NULL,
    content     JSONB NOT NULL,
    sha256      TEXT NOT NULL,
    pdf         BYTEA NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS company_check_report_check_idx ON company_check_report (check_id);

CREATE TABLE IF NOT EXISTS company_check_alert (
    id              BIGSERIAL PRIMARY KEY,
    check_id        BIGINT NOT NULL REFERENCES company_check(id),
    changes         JSONB NOT NULL,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_by BIGINT,
    acknowledged_at TIMESTAMPTZ,
    note            TEXT
);
CREATE INDEX IF NOT EXISTS company_check_alert_open_idx ON company_check_alert (check_id) WHERE acknowledged_at IS NULL;

-- Reports, evidence and entries are records: they can be added to, never rewritten or removed.
-- Entries may only gain a resolution once; alerts may only be acknowledged once.
CREATE OR REPLACE FUNCTION company_check_no_change() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION '% records cannot be deleted', TG_TABLE_NAME; END IF;
    RAISE EXCEPTION '% records cannot be changed', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION company_check_entry_resolve_only() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'company_check_entry records cannot be deleted'; END IF;
    IF OLD.resolved_at IS NOT NULL
       OR NEW.check_id IS DISTINCT FROM OLD.check_id OR NEW.admin_id IS DISTINCT FROM OLD.admin_id
       OR NEW.kind IS DISTINCT FROM OLD.kind OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.field IS DISTINCT FROM OLD.field OR NEW.ch_value IS DISTINCT FROM OLD.ch_value
       OR NEW.customer_value IS DISTINCT FROM OLD.customer_value OR NEW.material IS DISTINCT FROM OLD.material
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'company_check_entry: only an unresolved entry can be resolved';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION company_check_alert_ack_only() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'company_check_alert records cannot be deleted'; END IF;
    IF OLD.acknowledged_at IS NOT NULL OR NEW.check_id IS DISTINCT FROM OLD.check_id
       OR NEW.changes IS DISTINCT FROM OLD.changes OR NEW.detected_at IS DISTINCT FROM OLD.detected_at THEN
        RAISE EXCEPTION 'company_check_alert: only an open alert can be acknowledged';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_check_report_immutable ON company_check_report;
CREATE TRIGGER company_check_report_immutable BEFORE UPDATE OR DELETE ON company_check_report
    FOR EACH ROW EXECUTE FUNCTION company_check_no_change();
DROP TRIGGER IF EXISTS company_check_evidence_immutable ON company_check_evidence;
CREATE TRIGGER company_check_evidence_immutable BEFORE UPDATE OR DELETE ON company_check_evidence
    FOR EACH ROW EXECUTE FUNCTION company_check_no_change();
DROP TRIGGER IF EXISTS company_check_entry_immutable ON company_check_entry;
CREATE TRIGGER company_check_entry_immutable BEFORE UPDATE OR DELETE ON company_check_entry
    FOR EACH ROW EXECUTE FUNCTION company_check_entry_resolve_only();
DROP TRIGGER IF EXISTS company_check_alert_immutable ON company_check_alert;
CREATE TRIGGER company_check_alert_immutable BEFORE UPDATE OR DELETE ON company_check_alert
    FOR EACH ROW EXECUTE FUNCTION company_check_alert_ack_only();
