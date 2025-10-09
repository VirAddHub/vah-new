import express from 'express';
import { requireAdmin } from '../middleware/auth';
import { getAllPosts, getPostBySlug, getAllPostSlugs } from '../lib/posts';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const router = express.Router();

// Get all blog posts (admin)
router.get('/posts', requireAdmin, async (req, res) => {
    try {
        const includeDrafts = req.query.includeDrafts === 'true';
        const posts = getAllPosts(includeDrafts);
        
        res.json({
            ok: true,
            data: posts.map(post => ({
                slug: post.slug,
                title: post.frontMatter.title,
                description: post.frontMatter.description,
                date: post.frontMatter.date,
                updated: post.frontMatter.updated,
                tags: post.frontMatter.tags || [],
                cover: post.frontMatter.cover,
                status: post.frontMatter.status || 'published',
                ogTitle: post.frontMatter.ogTitle,
                ogDesc: post.frontMatter.ogDesc,
                noindex: post.frontMatter.noindex || false,
                content: post.content,
                excerpt: post.frontMatter.description || post.content.substring(0, 200) + '...'
            }))
        });
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch blog posts' });
    }
});

// Get single blog post (admin)
router.get('/posts/:slug', requireAdmin, async (req, res) => {
    try {
        const { slug } = req.params;
        const post = getPostBySlug(slug);
        
        if (!post) {
            return res.status(404).json({ ok: false, error: 'Post not found' });
        }
        
        res.json({
            ok: true,
            data: {
                slug: post.slug,
                title: post.frontMatter.title,
                description: post.frontMatter.description,
                date: post.frontMatter.date,
                updated: post.frontMatter.updated,
                tags: post.frontMatter.tags || [],
                cover: post.frontMatter.cover,
                status: post.frontMatter.status || 'published',
                ogTitle: post.frontMatter.ogTitle,
                ogDesc: post.frontMatter.ogDesc,
                noindex: post.frontMatter.noindex || false,
                content: post.content
            }
        });
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch blog post' });
    }
});

// Create new blog post
router.post('/posts', requireAdmin, async (req, res) => {
    try {
        const {
            slug,
            title,
            description,
            content,
            tags = [],
            cover,
            status = 'draft',
            ogTitle,
            ogDesc,
            noindex = false
        } = req.body;
        
        if (!slug || !title || !content) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Slug, title, and content are required' 
            });
        }
        
        // Check if slug already exists
        const existingPost = getPostBySlug(slug);
        if (existingPost) {
            return res.status(409).json({ 
                ok: false, 
                error: 'A post with this slug already exists' 
            });
        }
        
        const postsDir = path.join(process.cwd(), 'content', 'blog');
        if (!fs.existsSync(postsDir)) {
            fs.mkdirSync(postsDir, { recursive: true });
        }
        
        const frontMatter = {
            title,
            description,
            date: new Date().toISOString(),
            tags,
            cover,
            status,
            ogTitle,
            ogDesc,
            noindex
        };
        
        const fileContent = matter.stringify(content, frontMatter);
        const filePath = path.join(postsDir, `${slug}.mdx`);
        
        fs.writeFileSync(filePath, fileContent, 'utf8');
        
        res.json({
            ok: true,
            data: {
                slug,
                title,
                description,
                date: frontMatter.date,
                tags,
                cover,
                status,
                ogTitle,
                ogDesc,
                noindex
            }
        });
    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({ ok: false, error: 'Failed to create blog post' });
    }
});

// Update blog post
router.put('/posts/:slug', requireAdmin, async (req, res) => {
    try {
        const { slug } = req.params;
        const {
            title,
            description,
            content,
            tags = [],
            cover,
            status = 'published',
            ogTitle,
            ogDesc,
            noindex = false
        } = req.body;
        
        const existingPost = getPostBySlug(slug);
        if (!existingPost) {
            return res.status(404).json({ ok: false, error: 'Post not found' });
        }
        
        const postsDir = path.join(process.cwd(), 'content', 'blog');
        const filePath = path.join(postsDir, `${slug}.mdx`);
        
        const frontMatter = {
            title,
            description,
            date: existingPost.frontMatter.date, // Keep original date
            updated: new Date().toISOString(),
            tags,
            cover,
            status,
            ogTitle,
            ogDesc,
            noindex
        };
        
        const fileContent = matter.stringify(content, frontMatter);
        fs.writeFileSync(filePath, fileContent, 'utf8');
        
        res.json({
            ok: true,
            data: {
                slug,
                title,
                description,
                date: frontMatter.date,
                updated: frontMatter.updated,
                tags,
                cover,
                status,
                ogTitle,
                ogDesc,
                noindex
            }
        });
    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({ ok: false, error: 'Failed to update blog post' });
    }
});

// Delete blog post
router.delete('/posts/:slug', requireAdmin, async (req, res) => {
    try {
        const { slug } = req.params;
        
        const existingPost = getPostBySlug(slug);
        if (!existingPost) {
            return res.status(404).json({ ok: false, error: 'Post not found' });
        }
        
        const postsDir = path.join(process.cwd(), 'content', 'blog');
        const filePath = path.join(postsDir, `${slug}.mdx`);
        
        fs.unlinkSync(filePath);
        
        res.json({ ok: true, data: { deleted: true } });
    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({ ok: false, error: 'Failed to delete blog post' });
    }
});

// Get blog categories/tags
router.get('/categories', requireAdmin, async (req, res) => {
    try {
        const posts = getAllPosts(true);
        const allTags = new Set<string>();
        
        posts.forEach(post => {
            if (post.frontMatter.tags) {
                post.frontMatter.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        res.json({
            ok: true,
            data: Array.from(allTags).sort()
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch categories' });
    }
});

export default router;
