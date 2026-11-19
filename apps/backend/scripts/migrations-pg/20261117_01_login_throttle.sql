-- Sign-in throttling per account and source (replaces the account-wide lock in user.locked_until,
-- which let anyone lock a customer out with five wrong passwords). See src/server/services/loginThrottle.ts.
-- Forward-only. user.login_attempts / user.locked_until are left in place and no longer used to block sign-in.
CREATE TABLE IF NOT EXISTS login_throttle (
  key              text    PRIMARY KEY,
  failures         integer NOT NULL DEFAULT 0,
  first_failure_at bigint  NOT NULL,
  locked_until     bigint
);
CREATE INDEX IF NOT EXISTS idx_login_throttle_first_failure_at ON login_throttle (first_failure_at);
