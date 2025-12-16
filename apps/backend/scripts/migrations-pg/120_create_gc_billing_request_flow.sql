-- 120_create_gc_billing_request_flow.sql
-- Persist BRQ/BRF -> user/plan mapping for webhook linking.

CREATE TABLE IF NOT EXISTS gc_billing_request_flow (
  id BIGSERIAL PRIMARY KEY,
  created_at_ms BIGINT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES "user"(id),
  plan_id BIGINT NOT NULL REFERENCES plans(id),
  billing_request_id TEXT NOT NULL,
  billing_request_flow_id TEXT NOT NULL,
  customer_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created|confirmed|completed|failed
  completed_at_ms BIGINT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gc_brf_flow_id
  ON gc_billing_request_flow(billing_request_flow_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gc_brf_request_id
  ON gc_billing_request_flow(billing_request_id);

CREATE INDEX IF NOT EXISTS idx_gc_brf_customer_id
  ON gc_billing_request_flow(customer_id);

