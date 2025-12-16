-- 119_create_gc_redirect_flow.sql
-- Durable mapping for GoCardless redirect flows to VAH users/plans.

CREATE TABLE IF NOT EXISTS gc_redirect_flow (
  id BIGSERIAL PRIMARY KEY,
  created_at_ms BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES "user"(id),
  plan_id BIGINT NOT NULL REFERENCES plans(id),
  flow_id TEXT NOT NULL UNIQUE,
  session_token TEXT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created|completed|failed
  completed_at_ms BIGINT NULL
);

CREATE INDEX IF NOT EXISTS idx_gc_redirect_flow_user_id
  ON gc_redirect_flow(user_id);

CREATE INDEX IF NOT EXISTS idx_gc_redirect_flow_plan_id
  ON gc_redirect_flow(plan_id);

