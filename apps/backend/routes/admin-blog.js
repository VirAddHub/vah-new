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

// Helper function to save post
function savePost(slug, postData) {
    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);

    const frontMatter = {
        title: postData.title,
        description: postData.description,
        date: postData.date,
        updated: postData.updated || new Date().toISOString(),
        tags: postData.tags || [],
        cover: postData.cover || "",
        status: postData.status || "draft",
        ogTitle: postData.ogTitle || "",
        ogDesc: postData.ogDesc || "",
        noindex: postData.noindex || false
    };

    // Generate front matter manually to avoid gray-matter issues
    const frontMatterString = Object.entries(frontMatter)
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
            } else if (typeof value === 'string') {
                return `${key}: "${value}"`;
            } else if (typeof value === 'boolean') {
                return `${key}: ${value}`;
            } else {
                return `${key}: "${value}"`;
            }
        })
        .join('\n');
    
    const content = `---\n${frontMatterString}\n---\n\n${postData.content}`;

    fs.writeFileSync(filePath, content, "utf8");
    return true;
}

// Helper function to delete post
function deletePost(slug) {
    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}

// GET /api/admin/blog/posts - List all blog posts
router.get("/blog/posts", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const includeDrafts = req.query.includeDrafts === "true";
        const slugs = getAllPostSlugs();
        const posts = slugs
            .map(slug => getPostBySlug(slug))
            .filter(post => post !== null)
            .filter(post => includeDrafts || post.status !== "draft")
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        res.json({ ok: true, data: posts });
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch posts" });
    }
});

// GET /api/admin/blog/posts/:slug - Get specific blog post
router.get("/blog/posts/:slug", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug } = req.params;
        const post = getPostBySlug(slug);

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
router.post("/blog/posts", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug, title, description, content, tags, cover, status, ogTitle, ogDesc, noindex } = req.body;

        if (!slug || !title || !content) {
            return res.status(400).json({ ok: false, error: "Missing required fields" });
        }

        // Check if post already exists
        if (getPostBySlug(slug)) {
            return res.status(409).json({ ok: false, error: "Post with this slug already exists" });
        }

        const postData = {
            slug,
            title,
            description: description || "",
            date: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: tags || [],
            cover: cover || "",
            status: status || "draft",
            ogTitle: ogTitle || "",
            ogDesc: ogDesc || "",
            noindex: noindex || false,
            content
        };

        savePost(slug, postData);

        res.json({ ok: true, data: postData });
    } catch (error) {
        console.error("Error creating blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to create post" });
    }
});

// PUT /api/admin/blog/posts/:slug - Update blog post
router.put("/blog/posts/:slug", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug } = req.params;
        const { title, description, content, tags, cover, status, ogTitle, ogDesc, noindex } = req.body;

        // Check if post exists
        const existingPost = getPostBySlug(slug);
        if (!existingPost) {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        const postData = {
            slug,
            title: title || existingPost.title,
            description: description || existingPost.description,
            date: existingPost.date, // Keep original date
            updated: new Date().toISOString(),
            tags: tags || existingPost.tags,
            cover: cover || existingPost.cover,
            status: status || existingPost.status,
            ogTitle: ogTitle || existingPost.ogTitle,
            ogDesc: ogDesc || existingPost.ogDesc,
            noindex: noindex !== undefined ? noindex : existingPost.noindex,
            content: content || existingPost.content
        };

        savePost(slug, postData);

        res.json({ ok: true, data: postData });
    } catch (error) {
        console.error("Error updating blog post:", error);
        res.status(500).json({ ok: false, error: "Failed to update post" });
    }
});

// DELETE /api/admin/blog/posts/:slug - Delete blog post
router.delete("/blog/posts/:slug", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const { slug } = req.params;

        // Check if post exists
        if (!getPostBySlug(slug)) {
            return res.status(404).json({ ok: false, error: "Post not found" });
        }

        const deleted = deletePost(slug);

        if (deleted) {
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
router.get("/blog/categories", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    try {
        const slugs = getAllPostSlugs();
        const allTags = new Set();

        slugs.forEach(slug => {
            const post = getPostBySlug(slug);
            if (post && post.tags) {
                post.tags.forEach(tag => allTags.add(tag));
            }
        });

        res.json({ ok: true, data: Array.from(allTags).sort() });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ ok: false, error: "Failed to fetch categories" });
    }
});

module.exports = router;
