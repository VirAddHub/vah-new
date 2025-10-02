-- Migration: Add file table for OneDrive integration
-- This table stores metadata about files uploaded to OneDrive

CREATE TABLE IF NOT EXISTS file (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    mail_item_id bigint REFERENCES mail_item(id) ON DELETE SET NULL,
    drive_id text,
    item_id text UNIQUE, -- OneDrive item ID
    path text,
    name text,
    size bigint DEFAULT 0,
    mime text,
    etag text,
    modified_at bigint,
    web_url text, -- Download URL
    deleted boolean DEFAULT false,
    created_at bigint NOT NULL,
    updated_at bigint
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_file_user_id ON file(user_id);
CREATE INDEX IF NOT EXISTS idx_file_mail_item_id ON file(mail_item_id);
CREATE INDEX IF NOT EXISTS idx_file_item_id ON file(item_id);
CREATE INDEX IF NOT EXISTS idx_file_deleted ON file(deleted);
CREATE INDEX IF NOT EXISTS idx_file_created_at ON file(created_at);

-- Add file_id column to mail_item table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mail_item' 
        AND column_name = 'file_id'
    ) THEN
        ALTER TABLE mail_item ADD COLUMN file_id bigint REFERENCES file(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_mail_item_file_id ON mail_item(file_id);
    END IF;
END $$;
