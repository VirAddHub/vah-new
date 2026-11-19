-- Tables the application reads and writes but no earlier migration creates.
-- Additive and safe to run twice. Column shapes are taken from the code that uses them:
--   notification : webhooks-sumsub.ts, gdpr-export.ts, notifications.ts, admin-mail-items.ts
--   mail_audit   : admin-audit.ts (read only today)
--   forward_audit: mail-forward.ts (same shape the route creates lazily)

CREATE TABLE IF NOT EXISTS notification (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    meta        TEXT,
    read        BOOLEAN NOT NULL DEFAULT false,
    read_at     BIGINT,
    created_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notification_user_created ON notification (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_unread ON notification (user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS mail_audit (
    id          BIGSERIAL PRIMARY KEY,
    item_id     BIGINT NOT NULL,
    user_id     BIGINT,
    action      TEXT NOT NULL,
    before_json TEXT,
    after_json  TEXT,
    created_at  BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mail_audit_item_created ON mail_audit (item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forward_audit (
    id           SERIAL PRIMARY KEY,
    mail_item_id INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    result       TEXT NOT NULL,
    reason       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fwd_audit_mail_created ON forward_audit (mail_item_id, created_at DESC);
