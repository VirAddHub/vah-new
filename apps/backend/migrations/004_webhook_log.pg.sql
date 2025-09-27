CREATE TABLE IF NOT EXISTS webhook_log (
  id           BIGSERIAL PRIMARY KEY,
  source       TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  payload_json JSONB,
  status       TEXT,
  error        TEXT,
  created_at   BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_source_created_at
  ON webhook_log (source, created_at);
