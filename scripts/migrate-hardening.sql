-- scripts/migrate-hardening.sql

-- Plans slug (if missing) - SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- Check if slug column exists, if not add it
-- Note: This will fail silently if column already exists, which is what we want
ALTER TABLE plans ADD COLUMN slug TEXT;

-- Update existing plans with slug if they don't have one
UPDATE plans SET slug = lower(replace(name,' ','-')) WHERE slug IS NULL OR slug = '';

-- Create unique index for plans slug (will fail if exists, which is fine)
CREATE UNIQUE INDEX idx_plans_slug ON plans(slug);

-- Create unique index for user email (will fail if exists, which is fine)
CREATE UNIQUE INDEX idx_user_email ON user(email);

-- Session columns (if missing) - SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- These will fail silently if columns already exist, which is what we want
ALTER TABLE user ADD COLUMN session_token TEXT;
ALTER TABLE user ADD COLUMN session_created_at TEXT;

-- Create index for session token (will fail if exists, which is fine)
CREATE INDEX idx_user_session_token ON user(session_token);
