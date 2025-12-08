-- Verification queries to check if blog migrations ran successfully
-- Run these in Render SQL Editor after deployment

-- 1. Check if blog_posts table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'blog_posts'
) AS table_exists;

-- 2. List all columns in blog_posts table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'blog_posts'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'blog_posts';

-- 4. Check if author columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'blog_posts' 
AND column_name LIKE 'author%'
ORDER BY column_name;

-- Expected results:
-- ✅ table_exists should be: true
-- ✅ Should have columns: id, slug, title, description, content, excerpt, date, updated, tags, cover, status, og_title, og_desc, noindex, created_at, updated_at, author_name, author_title, author_image
-- ✅ Should have indexes: idx_blog_posts_slug, idx_blog_posts_status, idx_blog_posts_date
-- ✅ Should have author columns: author_image, author_name, author_title

