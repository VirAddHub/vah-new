-- Pre-incorporation route: a customer forming a company that does not exist yet.
-- Additive only.
--
-- The customer declares the proposed company (name, activity, intended directors and owners).
-- An administrator approves it for that one named company, or returns or refuses it.
-- Approval starts a 30-day deadline to incorporate and give us the company number.
-- When the number arrives, the company becomes a new customer: a company check is created and the
-- register is compared with this declaration. If the deadline passes first, access lapses.

CREATE TABLE IF NOT EXISTS pre_incorporation (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES "user"(id),
    proposed_name    TEXT NOT NULL,
    declaration      JSONB NOT NULL,
    status           TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted', 'returned', 'approved', 'refused', 'incorporated', 'lapsed')),
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_by       BIGINT,
    decided_at       TIMESTAMPTZ,
    decision_reason  TEXT,
    deadline_at      TIMESTAMPTZ,
    company_number   TEXT,
    incorporated_at  TIMESTAMPTZ,
    lapse_reviewed_at TIMESTAMPTZ,
    lapse_review_note TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One open application per customer (earlier ones are kept as history).
CREATE UNIQUE INDEX IF NOT EXISTS pre_incorporation_one_open ON pre_incorporation (user_id)
    WHERE status IN ('submitted', 'returned', 'approved');
CREATE INDEX IF NOT EXISTS pre_incorporation_status_idx ON pre_incorporation (status, deadline_at);

-- Declarations carried over from pre-incorporation say so.
ALTER TABLE company_declaration ADD COLUMN IF NOT EXISTS from_pre_incorporation BIGINT;
