const express = require("express");
const { getPool } = require("../src/server/db");

const router = express.Router();

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return {
        long: date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }),
        short: date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short'
        })
    };
}

// Helper function to estimate read time
function estimateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
}

// GET /api/blog/posts - Get published blog posts for public display
router.get("/blog/posts", async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT 
                slug, title, description, content, excerpt, date, updated, tags, cover, 
                status, og_title, og_desc, noindex
            FROM blog_posts 
            WHERE status = 'published'
            ORDER BY date DESC`
        );

        const posts = result.rows.map(post => {
            const dateFormatted = formatDate(post.date);
            return {
                id: post.slug, // Use slug as ID for consistency
                slug: post.slug,
                title: post.title,
                excerpt: post.excerpt || (post.content ? post.content.substring(0, 200) + "..." : ""),
                dateLong: dateFormatted.long,
                dateShort: dateFormatted.short,
                readTime: estimateReadTime(post.content || ""),
                category: (post.tags && post.tags[0]) || "General", // Use first tag as category
                imageUrl: post.cover || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
                description: post.description,
                tags: post.tags || [],
                status: post.status
            };
        });

        return res.json({ ok: true, data: posts });
    } catch (error) {
        console.error("[blog] Error fetching posts:", error);
        return res.status(500).json({
            ok: false,
            error: "server_error",
            message: "Failed to fetch blog posts"
        });
    }
});

// GET /api/blog/posts/:slug - Get specific blog post for public display
router.get("/blog/posts/:slug", async (req, res) => {
    const { slug } = req.params;

    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({
            ok: false,
            error: "invalid_slug",
            message: "Invalid blog post slug"
        });
    }

    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT 
                slug, title, description, content, excerpt, date, updated, tags, cover, 
                status, og_title, og_desc, noindex
            FROM blog_posts 
            WHERE slug = $1 AND status = 'published'`,
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: "not_found",
                message: "Post not found"
            });
        }

        const post = result.rows[0];
        const dateFormatted = formatDate(post.date);
        const responseData = {
            slug: post.slug,
            title: post.title,
            description: post.description,
            date: post.date,
            dateLong: dateFormatted.long,
            dateShort: dateFormatted.short,
            updated: post.updated,
            tags: post.tags || [],
            cover: post.cover,
            ogTitle: post.og_title,
            ogDesc: post.og_desc,
            noindex: post.noindex,
            content: post.content,
            excerpt: post.excerpt || (post.content ? post.content.substring(0, 200) + "..." : ""),
            readTime: estimateReadTime(post.content || "")
        };

        return res.json({ ok: true, data: responseData });
    } catch (error) {
        console.error("[GET /api/blog/posts/:slug] error:", error);
        return res.status(500).json({
            ok: false,
            error: "server_error",
            message: error?.message || "Unexpected error"
        });
    }
});

module.exports = router;
