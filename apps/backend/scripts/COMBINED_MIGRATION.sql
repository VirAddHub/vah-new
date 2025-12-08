-- ============================================
-- COMBINED BLOG MIGRATIONS
-- Run this entire file in Render SQL Editor
-- ============================================

-- Migration 1: Create blog_posts table for persistent blog storage
-- This replaces the filesystem-based MDX storage which is ephemeral on Render

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    excerpt TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    cover TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    og_title TEXT,
    og_desc TEXT,
    noindex BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON blog_posts(date DESC);

-- Add comment
COMMENT ON TABLE blog_posts IS 'Blog posts stored in database for persistence across deployments';

-- ============================================
-- Migration 2: Add author field to blog_posts table
-- This allows each post to have a custom author instead of hardcoded "Liban Adan"
-- ============================================

ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'Liban Adan',
ADD COLUMN IF NOT EXISTS author_title TEXT DEFAULT 'Founder, VirtualAddressHub',
ADD COLUMN IF NOT EXISTS author_image TEXT DEFAULT '/images/authors/liban.jpg';

COMMENT ON COLUMN blog_posts.author_name IS 'Author name displayed on blog post';
COMMENT ON COLUMN blog_posts.author_title IS 'Author title/role displayed on blog post';
COMMENT ON COLUMN blog_posts.author_image IS 'Author profile image URL';

-- ============================================
-- VERIFICATION QUERY (run this after migrations)
-- ============================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'blog_posts'
-- ORDER BY ordinal_position;

