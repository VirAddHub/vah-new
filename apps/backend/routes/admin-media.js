const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { fileTypeFromBuffer } = require("file-type");

const router = express.Router();

// Allowed file extensions and MIME types for blog images
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Step 1: Whitelist file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            return cb(new Error('File extension not allowed. Only image files are permitted.'), false);
        }

        // Step 2: Basic mimetype check (can be spoofed, but fail fast)
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('File type not allowed. Only image files are permitted.'), false);
        }

        // Note: Magic-byte validation happens in the route handler
        cb(null, true);
    }
});

/**
 * Validate file using magic bytes (file-type library)
 * This prevents spoofed Content-Type headers
 */
async function validateImageMagicBytes(fileBuffer, originalName) {
    try {
        const uint8Array = new Uint8Array(fileBuffer);
        const fileType = await fileTypeFromBuffer(uint8Array);

        if (!fileType) {
            return { valid: false, error: 'Could not determine file type from file contents' };
        }

        const { mime, ext } = fileType;
        
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime)) {
            return { valid: false, error: `File type mismatch: detected ${mime}, expected image` };
        }

        const originalExt = path.extname(originalName).toLowerCase();
        const detectedExt = `.${ext}`;
        
        const extMap = {
            '.jpg': ['.jpg', '.jpeg'],
            '.jpeg': ['.jpg', '.jpeg'],
            '.png': ['.png'],
            '.gif': ['.gif'],
            '.webp': ['.webp']
        };

        const validExts = extMap[detectedExt] || [detectedExt];
        if (!validExts.includes(originalExt)) {
            return { valid: false, error: `File extension mismatch: detected ${detectedExt}, got ${originalExt}` };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: `File validation error: ${error.message}` };
    }
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "blog");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST /api/admin/blog/upload - Upload image for blog posts
router.post("/blog/upload", upload.single('image'), async (req, res) => {
    if (!req.user?.is_admin) {
        return res.status(403).json({ ok: false, error: "forbidden" });
    }

    if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image file provided" });
    }

    try {
        // SECURITY: Validate file using magic bytes (prevents Content-Type spoofing)
        const validation = await validateImageMagicBytes(req.file.buffer, req.file.originalname);
        if (!validation.valid) {
            console.warn('[POST /api/admin/blog/upload] File validation failed:', {
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                error: validation.error
            });
            return res.status(400).json({ 
                ok: false, 
                error: 'invalid_file', 
                message: validation.error || 'File validation failed. Only image files are allowed.' 
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = req.file.originalname;
        const extension = path.extname(originalName);
        const filename = `blog-${timestamp}${extension}`;

        // Save validated file to disk
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
