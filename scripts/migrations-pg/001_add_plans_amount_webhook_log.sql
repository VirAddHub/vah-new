-- idempotent: safe to re-run
ALTER TABLE IF EXISTS plans
  ADD COLUMN IF NOT EXISTS amount_pence integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS webhook_log (
  id            bigserial PRIMARY KEY,
  provider      text NOT NULL,
  event_type    text,
  status        text,
  payload       jsonb,
  received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_provider ON webhook_log(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_log_received_at ON webhook_log(received_at);
