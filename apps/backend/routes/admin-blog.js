const express = require("express");
const { getPool } = require("../src/server/db");

const router = express.Router();

// Helper function to get post by slug from database
async function getPostBySlug(slug) {
    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT 
                slug, title, description, content, excerpt, date, updated, tags, cover, 
                status, og_title, og_desc, noindex, author_name, author_title, author_image
            FROM blog_posts 
            WHERE slug = $1`,
            [slug]
        );

        if (result.rows.length === 0) return null;

        const post = result.rows[0];
        return {
            slug: post.slug,
            title: post.title,
            description: post.description || "",
            date: post.date,
            updated: post.updated,
            tags: post.tags || [],
            cover: post.cover || "",
            status: post.status || "draft",
            ogTitle: post.og_title || "",
            ogDesc: post.og_desc || "",
            noindex: post.noindex || false,
            content: post.content,
            excerpt: post.excerpt || (post.content ? post.content.substring(0, 200) + "..." : ""),
            authorName: post.author_name || "Liban Adan",
            authorTitle: post.author_title || "Founder, VirtualAddressHub",
            authorImage: post.author_image || "/images/authors/liban.jpg"
        };
    } catch (error) {
        console.error(`[getPostBySlug] Error reading post "${slug}":`, error);
        return null;
    }
}

// GET /api/admin/blog/posts - List all blog posts
router.get("/blog/posts", async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const includeDrafts = req.query.includeDrafts === "true";
        const pool = getPool();

        let query = `SELECT 
            slug, title, description, content, excerpt, date, updated, tags, cover, 
            status, og_title, og_desc, noindex, author_name, author_title, author_image
        FROM blog_posts`;

        if (!includeDrafts) {
            query += ` WHERE status != 'draft'`;
        }

        query += ` ORDER BY date DESC`;

        const result = await pool.query(query);
        const posts = result.rows.map(post => ({
            slug: post.slug,
            title: post.title,
            description: post.description || "",
            date: post.date,
            updated: post.updated,
            tags: post.tags || [],
            cover: post.cover || "",
            status: post.status || "draft",
            ogTitle: post.og_title || "",
            ogDesc: post.og_desc || "",
            noindex: post.noindex || false,
            content: post.content,
            excerpt: post.excerpt || (post.content ? post.content.substring(0, 200) + "..." : "")
        }));

        res.json({ ok: true, data: posts });
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch posts" });
    }
});

// GET /api/admin/blog/posts/:slug - Get specific blog post
router.get("/blog/posts/:slug", async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug } = req.params;
        const post = await getPostBySlug(slug);

        if (!post) {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        res.json({ ok: true, data: post });
    } catch (error) {
        console.error("Error fetching blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch post" });
    }
});

// POST /api/admin/blog/posts - Create new blog post
router.post("/blog/posts", async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug, title, description, content, tags, cover, status, ogTitle, ogDesc, noindex, authorName, authorTitle, authorImage } = req.body;

        if (!slug || !title || !content) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        // Check if post already exists
        const existing = await getPostBySlug(slug);
        if (existing) {
            return res.status(409).json({ ok: false, error: "Post with this slug already exists" });
        }

        // Normalize status - only 'draft' or 'published'
        const normalizedStatus = (status === "draft" || status === "published") ? status : "published";
        const now = new Date().toISOString();
        const excerpt = content ? content.substring(0, 200) + "..." : "";

        const pool = getPool();
        await pool.query(
            `INSERT INTO blog_posts (
                slug, title, description, content, excerpt, date, updated, tags, cover, 
                status, og_title, og_desc, noindex, author_name, author_title, author_image, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
                slug,
                title,
                description || "",
                content,
                excerpt,
                now,
                now,
                tags || [],
                cover || "",
                normalizedStatus,
                ogTitle || "",
                ogDesc || "",
                noindex || false,
                authorName || "Liban Adan",
                authorTitle || "Founder, VirtualAddressHub",
                authorImage || "/images/authors/liban.jpg",
                now,
                now
            ]
        );

        const postData = {
            slug,
            title,
            description: description || "",
            date: now,
            updated: now,
            tags: tags || [],
            cover: cover || "",
            status: normalizedStatus,
            ogTitle: ogTitle || "",
            ogDesc: ogDesc || "",
            noindex: noindex || false,
            content,
            excerpt,
            authorName: authorName || "Liban Adan",
            authorTitle: authorTitle || "Founder, VirtualAddressHub",
            authorImage: authorImage || "/images/authors/liban.jpg"
        };

        res.json({ ok: true, data: postData });
    } catch (error) {
        console.error("Error creating blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to create post" });
    }
});

// PUT /api/admin/blog/posts/:slug - Update blog post
router.put("/blog/posts/:slug", async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug } = req.params;
        const { title, description, content, tags, cover, status, ogTitle, ogDesc, noindex, authorName, authorTitle, authorImage } = req.body;

        // Check if post exists
        const existingPost = await getPostBySlug(slug);
        if (!existingPost) {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        // Normalize status - only 'draft' or 'published', default to existing status if not provided
        const normalizedStatus = status
            ? ((status === "draft" || status === "published") ? status : existingPost.status)
            : existingPost.status;

        const now = new Date().toISOString();
        const excerpt = content ? content.substring(0, 200) + "..." : existingPost.excerpt;

        const pool = getPool();
        await pool.query(
            `UPDATE blog_posts SET
                title = $1,
                description = $2,
                content = $3,
                excerpt = $4,
                updated = $5,
                tags = $6,
                cover = $7,
                status = $8,
                og_title = $9,
                og_desc = $10,
                noindex = $11,
                author_name = $12,
                author_title = $13,
                author_image = $14,
                updated_at = $15
            WHERE slug = $16`,
            [
                title || existingPost.title,
                description !== undefined ? description : existingPost.description,
                content || existingPost.content,
                excerpt,
                now,
                tags !== undefined ? tags : existingPost.tags,
                cover !== undefined ? cover : existingPost.cover,
                normalizedStatus,
                ogTitle !== undefined ? ogTitle : existingPost.ogTitle,
                ogDesc !== undefined ? ogDesc : existingPost.ogDesc,
                noindex !== undefined ? noindex : existingPost.noindex,
                authorName !== undefined ? authorName : (existingPost.authorName || "Liban Adan"),
                authorTitle !== undefined ? authorTitle : (existingPost.authorTitle || "Founder, VirtualAddressHub"),
                authorImage !== undefined ? authorImage : (existingPost.authorImage || "/images/authors/liban.jpg"),
                now,
                slug
            ]
        );

        const postData = {
            slug,
            title: title || existingPost.title,
            description: description !== undefined ? description : existingPost.description,
            date: existingPost.date, // Keep original date
            updated: now,
            tags: tags !== undefined ? tags : existingPost.tags,
            cover: cover !== undefined ? cover : existingPost.cover,
            status: normalizedStatus,
            ogTitle: ogTitle !== undefined ? ogTitle : existingPost.ogTitle,
            ogDesc: ogDesc !== undefined ? ogDesc : existingPost.ogDesc,
            noindex: noindex !== undefined ? noindex : existingPost.noindex,
            content: content || existingPost.content,
            excerpt,
            authorName: authorName !== undefined ? authorName : (existingPost.authorName || "Liban Adan"),
            authorTitle: authorTitle !== undefined ? authorTitle : (existingPost.authorTitle || "Founder, VirtualAddressHub"),
            authorImage: authorImage !== undefined ? authorImage : (existingPost.authorImage || "/images/authors/liban.jpg")
        };

        res.json({ ok: true, data: postData });
    } catch (error) {
        console.error("Error updating blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to update post" });
    }
});

// DELETE /api/admin/blog/posts/:slug - Delete blog post
router.delete("/blog/posts/:slug", async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug } = req.params;

        // Check if post exists
        const existing = await getPostBySlug(slug);
        if (!existing) {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        const pool = getPool();
        const result = await pool.query(
            `DELETE FROM blog_posts WHERE slug = $1`,
            [slug]
        );

        if (result.rowCount > 0) {
            res.json({ ok: true, message: "Post deleted successfully" });
        } else {
            res.status(500).json({ ok: false, error: "Failed to delete post" });
        }
    } catch (error) {
        console.error("Error deleting blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to delete post" });
    }
});

// GET /api/admin/blog/categories - Get all categories/tags
router.get("/blog/categories", async (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT DISTINCT unnest(tags) AS tag FROM blog_posts WHERE tags IS NOT NULL AND array_length(tags, 1) > 0`
        );

        const allTags = result.rows.map(row => row.tag).filter(Boolean);
        const uniqueTags = [...new Set(allTags)].sort();

        res.json({ ok: true, data: uniqueTags });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch categories" });
    }
});

module.exports = router;
