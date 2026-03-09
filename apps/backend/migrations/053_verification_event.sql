-- Migration: Lightweight verification event table for audit/debugging
-- See docs/IDENTITY_VERIFICATION_ENGINEERING_SPEC.md (Part 4)

CREATE TABLE IF NOT EXISTS verification_event (
    id BIGSERIAL PRIMARY KEY,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'business_owner')),
    subject_id BIGINT NOT NULL,
    event_type TEXT NOT NULL,
    payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_event_subject ON verification_event(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_verification_event_created_at ON verification_event(created_at);

COMMENT ON TABLE verification_event IS 'Audit log for identity verification actions (invite_sent, webhook_received, etc.)';
