import { Router, Request, Response } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { requireAdmin } from "../../middleware/auth";

const router = Router();

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
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        // Step 1: Whitelist file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            return cb(new Error('File extension not allowed. Only image files are permitted.'));
        }

        // Step 2: Basic mimetype check (can be spoofed, but fail fast)
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('File type not allowed. Only image files are permitted.'));
        }

        // Note: Magic-byte validation happens in the route handler
        cb(null, true);
    }
});

/**
 * Validate file using magic bytes (file-type library)
 * This prevents spoofed Content-Type headers
 */
async function validateImageMagicBytes(fileBuffer: Buffer, originalName: string) {
    try {
        const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
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

        const extMap: Record<string, string[]> = {
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
    } catch (error: any) {
        return { valid: false, error: `File validation error: ${error.message}` };
    }
}

// Ensure uploads directory exists. Use DATA_DIR for persistent storage (e.g. Render disk at /var/data)
// so blog cover images survive redeploys. See render.yaml: disk mountPath + DATA_DIR env.
const basePath = process.env.DATA_DIR ? process.env.DATA_DIR : process.cwd();
const UPLOADS_DIR = path.join(basePath, "uploads", "blog");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST /api/admin/blog/upload (and /api/blog/upload)
router.post("/blog/upload", requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
    // Note: requireAdmin reliably covers the 'is_admin' authentication fallback.

    if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image file provided" });
    }

    try {
        // SECURITY: Validate file using magic bytes (prevents Content-Type spoofing)
        const validation = await validateImageMagicBytes(req.file.buffer, req.file.originalname);
        if (!validation.valid) {
            console.warn('[POST /blog/upload] File validation failed:', {
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
        fs.writeFileSync(filePath, req.file.buffer as any);

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

// GET /api/media/blog/:filename (and /api/admin/media/blog/:filename)
router.get("/media/blog/:filename", (req: Request, res: Response) => {
    try {
        const filename = req.params.filename as string;
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

export default router;
