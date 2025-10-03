-- Add is_read column to mail_item table
-- This column tracks whether a user has read/viewed a mail item

ALTER TABLE mail_item 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index for better performance when filtering by read status
CREATE INDEX IF NOT EXISTS idx_mail_item_user_read ON mail_item(user_id, is_read);

-- Add comment to document the column
COMMENT ON COLUMN mail_item.is_read IS 'Whether the user has read/viewed this mail item';
