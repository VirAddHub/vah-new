PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS mail_items (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  subject     TEXT,
  status      TEXT NOT NULL DEFAULT 'scanned',
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Ensure at least two rows for user 1
INSERT INTO mail_items (user_id, subject, status)
SELECT 1, 'HMRC letter', 'scanned'
WHERE NOT EXISTS (SELECT 1 FROM mail_items);

INSERT INTO mail_items (user_id, subject, status)
SELECT 1, 'Bank statement', 'scanned'
WHERE NOT EXISTS (
  SELECT 1 FROM mail_items WHERE subject = 'Bank statement'
);
