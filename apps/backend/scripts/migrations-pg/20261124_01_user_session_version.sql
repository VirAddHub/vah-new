-- Server-side session revocation (security review F20/R32/R33).
-- Every session token carries the user's session_version at sign-in; bumping the number
-- signs the user out everywhere (logout, password reset, email change, privilege change).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
