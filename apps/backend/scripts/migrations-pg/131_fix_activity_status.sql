-- Migration: Fix incorrect last_active_at values
-- Clear last_active_at for users who have never actually logged in
-- This fixes the "Online" + "Never logged in" bug

-- Clear last_active_at for users who don't have a last_login_at
-- (They've never logged in, so they shouldn't show as active)
UPDATE "user"
SET last_active_at = NULL
WHERE last_login_at IS NULL;
