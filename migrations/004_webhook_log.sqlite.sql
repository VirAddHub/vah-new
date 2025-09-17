CREATE TABLE IF NOT EXISTS webhook_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  source       TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  payload_json TEXT,
  status       TEXT,
  error        TEXT,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_source_created_at
  ON webhook_log (source, created_at);
