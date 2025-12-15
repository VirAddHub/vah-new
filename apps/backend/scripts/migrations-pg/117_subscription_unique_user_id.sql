-- 117_subscription_unique_user_id.sql
-- Enforce one subscription row per user (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_user_id_unique'
  ) THEN
    ALTER TABLE subscription
      ADD CONSTRAINT subscription_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

