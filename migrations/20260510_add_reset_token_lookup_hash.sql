-- Migration: Add fast lookup hash for password reset tokens
-- Date: 2026-05-10
-- Purpose: Eliminate the O(n) bcrypt scan in POST /api/auth/reset-password/confirm.
--
-- Before this migration the confirm endpoint fetched every row in "user" where
-- reset_token_hash IS NOT NULL and ran bcrypt.compare in a loop.  Under load
-- that is a CPU-exhaustion DoS vector proportional to the number of users with
-- active reset requests.
--
-- Fix: store reset_token_lookup_hash = HMAC-SHA256(raw_token, JWT_SECRET).
-- On confirm the app computes the same HMAC of the submitted token and SELECTs
-- the one matching row, then runs bcrypt.compare exactly once.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- Backwards compatible: existing rows get NULL lookup_hash; those tokens are
-- treated as invalid on confirm (they expire in 30 min, so the impact window
-- at deploy time is at most one in-flight reset request per user).

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS reset_token_lookup_hash TEXT;

-- Unique index: each lookup hash must map to exactly one user.
-- NULLS are excluded from uniqueness in PostgreSQL, so multiple NULL rows are fine.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_token_lookup_hash
    ON "user" (reset_token_lookup_hash)
    WHERE reset_token_lookup_hash IS NOT NULL;
