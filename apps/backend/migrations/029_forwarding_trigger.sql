-- Migration: Add trigger to mirror forwarding status to mail_item
-- Date: 2024-01-01 (example date)

-- Add forwarding_status column to mail_item if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='mail_item' AND column_name='forwarding_status') THEN
    ALTER TABLE mail_item ADD COLUMN forwarding_status TEXT NULL;
  END IF;
END $$;

-- Create function to mirror status changes
CREATE OR REPLACE FUNCTION trg_forwarding_to_mail_item()
RETURNS trigger AS $$
BEGIN
  UPDATE mail_item SET forwarding_status = NEW.status WHERE id = NEW.mail_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS forwarding_request_status_mirror ON forwarding_request;

-- Create trigger to mirror status changes
CREATE TRIGGER forwarding_request_status_mirror
AFTER UPDATE OF status ON forwarding_request
FOR EACH ROW
EXECUTE FUNCTION trg_forwarding_to_mail_item();

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_mail_item_forwarding_status ON mail_item(forwarding_status);




