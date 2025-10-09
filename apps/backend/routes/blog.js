const express = require("express");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const router = express.Router();

// Blog posts directory
const POSTS_DIR = path.join(process.cwd(), "content", "blog");

// Ensure posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
}

// Helper function to get all post slugs
function getAllPostSlugs() {
    if (!fs.existsSync(POSTS_DIR)) return [];
    return fs.readdirSync(POSTS_DIR)
        .filter(f => f.endsWith(".mdx"))
        .map(f => f.replace(/\.mdx$/, ""));
}

// Helper function to get post by slug
function getPostBySlug(slug) {
    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);

    return {
        slug,
        title: data.title || "",
        description: data.description || "",
        date: data.date || new Date().toISOString(),
        updated: data.updated || null,
        tags: data.tags || [],
        cover: data.cover || "",
        status: data.status || "draft",
        ogTitle: data.ogTitle || "",
        ogDesc: data.ogDesc || "",
        noindex: data.noindex || false,
        content,
        excerpt: content.substring(0, 200) + "..."
    };
}

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
router.get("/blog/posts", (req, res) => {
    try {
        const slugs = getAllPostSlugs();
        const posts = slugs
            .map(slug => getPostBySlug(slug))
            .filter(post => post !== null)
            .filter(post => post.status === "published") // Only published posts
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(post => {
                const dateFormatted = formatDate(post.date);
                return {
                    id: post.slug, // Use slug as ID for consistency
                    slug: post.slug,
                    title: post.title,
                    excerpt: post.excerpt,
                    dateLong: dateFormatted.long,
                    dateShort: dateFormatted.short,
                    readTime: estimateReadTime(post.content),
                    category: post.tags[0] || "General", // Use first tag as category
                    imageUrl: post.cover || "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBidWlsZGluZyUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NTc0MTE2NTV8MA&ixlib=rb-4.1.0&q=80&w=1080",
                    description: post.description,
                    tags: post.tags
                };
            });

        res.json({ ok: true, data: posts });
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch posts" });
    }
});

// GET /api/blog/posts/:slug - Get specific blog post for public display
router.get("/blog/posts/:slug", (req, res) => {
    try {
        const { slug } = req.params;
        const post = getPostBySlug(slug);

        if (!post) {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        if (post.status !== "published") {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        const dateFormatted = formatDate(post.date);
        const responseData = {
            slug: post.slug,
            title: post.title,
            description: post.description,
            date: post.date,
            dateLong: dateFormatted.long,
            dateShort: dateFormatted.short,
            updated: post.updated,
            tags: post.tags,
            cover: post.cover,
            ogTitle: post.ogTitle,
            ogDesc: post.ogDesc,
            noindex: post.noindex,
            content: post.content,
            excerpt: post.excerpt,
            readTime: estimateReadTime(post.content)
        };

        res.json({ ok: true, data: responseData });
    } catch (error) {
        console.error("Error fetching blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch post" });
    }
});

module.exports = router;
