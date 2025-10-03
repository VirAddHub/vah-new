-- 107_add_download_table.sql
-- Create download tracking table for mail scan downloads

CREATE TABLE IF NOT EXISTS download (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    file_id BIGINT REFERENCES file(id) ON DELETE SET NULL,
    download_url TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_download_user_id ON download(user_id);
CREATE INDEX IF NOT EXISTS idx_download_file_id ON download(file_id);
CREATE INDEX IF NOT EXISTS idx_download_created_at ON download(created_at);
CREATE INDEX IF NOT EXISTS idx_download_expires_at ON download(expires_at);

-- Add comment
COMMENT ON TABLE download IS 'Tracks mail scan download requests for audit and access control';
