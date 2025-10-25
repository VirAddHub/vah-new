const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "blog");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST /api/admin/blog/upload - Upload image for blog posts
router.post("/blog/upload", upload.single('image'), (req, res) => {
    if (!req.user?.is_admin) {
        return res.status(403).json({ ok: false, error: "forbidden" });
    }

    if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image file provided" });
    }

    try {
        // Generate unique filename
        const timestamp = Date.now();
        const originalName = req.file.originalname;
        const extension = path.extname(originalName);
        const filename = `blog-${timestamp}${extension}`;
        
        // Save file to uploads directory
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, req.file.buffer);

        // Generate public URL
        const publicUrl = `${process.env.API_BASE_URL || 'https://vah-api-staging.onrender.com'}/api/media/blog/${filename}`;

        res.json({
            ok: true,
            data: {
                url: publicUrl,
                filename: filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({ ok: false, error: "Failed to upload image" });
    }
});

// GET /api/media/blog/:filename - Serve uploaded images publicly
router.get("/media/blog/:filename", (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(UPLOADS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ ok: false, error: "Image not found" });
        }

        // Set cache headers for better performance
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('Content-Type', 'image/jpeg'); // Default to JPEG

        // Send the file
        res.sendFile(filePath);
    } catch (error) {
        console.error("Error serving image:", error);
        res.status(500).json({ ok: false, error: "Failed to serve image" });
    }
});

module.exports = router;
