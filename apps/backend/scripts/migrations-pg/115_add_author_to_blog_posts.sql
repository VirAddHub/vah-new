-- Migration: Add author field to blog_posts table
-- This allows each post to have a custom author instead of hardcoded "Liban Adan"

ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'Liban Adan',
ADD COLUMN IF NOT EXISTS author_title TEXT DEFAULT 'Founder, VirtualAddressHub',
ADD COLUMN IF NOT EXISTS author_image TEXT DEFAULT '/images/authors/liban.jpg';

COMMENT ON COLUMN blog_posts.author_name IS 'Author name displayed on blog post';
COMMENT ON COLUMN blog_posts.author_title IS 'Author title/role displayed on blog post';
COMMENT ON COLUMN blog_posts.author_image IS 'Author profile image URL';

