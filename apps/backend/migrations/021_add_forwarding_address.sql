-- Add forwarding_address column to user table
-- This column stores the user's forwarding address for mail forwarding

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS forwarding_address TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN "user".forwarding_address IS 'User''s forwarding address for mail forwarding requests';





