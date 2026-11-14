import { Router, Request, Response } from "express";
import { logger } from '../../lib/logger';
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { requireAdmin } from "../../middleware/auth";
import { safeErrorMessage } from '../../lib/safeError';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();

// Allowed file extensions and MIME types for blog images
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Configure multer for memory storage (used regardless of upload destination)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (
        req: Request,
        file: { originalname: string; mimetype: string },
        cb: multer.FileFilterCallback,
    ) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            return cb(new Error('File extension not allowed. Only image files are permitted.'));
        }
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('File type not allowed. Only image files are permitted.'));
        }
        cb(null, true);
    }
});

// ── Cloudinary configuration ─────────────────────────────────────────────────
// Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your
// Render environment variables. If not set, falls back to local disk.
const CLOUDINARY_CONFIGURED =
    !!(process.env.CLOUDINARY_CLOUD_NAME &&
       process.env.CLOUDINARY_API_KEY &&
       process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_CONFIGURED) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    logger.info('[admin-media] Cloudinary configured — images will be uploaded to Cloudinary');
} else {
    logger.info('[admin-media] Cloudinary not configured — falling back to local disk');
}

// ── Magic-byte validation ─────────────────────────────────────────────────────
async function validateImageMagicBytes(fileBuffer: Buffer, originalName: string) {
    try {
        const uint8Array = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
        const fileType = await fileTypeFromBuffer(uint8Array);
        if (!fileType) return { valid: false, error: 'Could not determine file type from file contents' };

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
            '.webp': ['.webp'],
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

// ── Upload to Cloudinary ──────────────────────────────────────────────────────
function uploadToCloudinary(buffer: Buffer): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'vah-blog',
                resource_type: 'image',
                transformation: [{ quality: 'auto', fetch_format: 'auto' }],
            },
            (error, result) => {
                if (error || !result) return reject(error || new Error('No result from Cloudinary'));
                resolve({ url: result.secure_url, public_id: result.public_id });
            }
        );
        stream.end(buffer);
    });
}

// ── Local disk fallback ───────────────────────────────────────────────────────
const basePath = process.env.DATA_DIR ? process.env.DATA_DIR : process.cwd();
const UPLOADS_DIR = path.join(basePath, "uploads", "blog");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── POST /api/admin/blog/upload ───────────────────────────────────────────────
router.post("/blog/upload", requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ ok: false, error: "No image file provided" });
    }

    try {
        // Validate magic bytes
        const validation = await validateImageMagicBytes(req.file.buffer, req.file.originalname);
        if (!validation.valid) {
            logger.warn('[POST /blog/upload] File validation failed:', {
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                error: validation.error,
            });
            return res.status(400).json({
                ok: false,
                error: 'invalid_file',
                message: validation.error || 'File validation failed. Only image files are allowed.',
            });
        }

        // ── Cloudinary path ──────────────────────────────────────────────────
        if (CLOUDINARY_CONFIGURED) {
            const { url, public_id } = await uploadToCloudinary(req.file.buffer);
            logger.info('[admin-media] Uploaded to Cloudinary:', { public_id, url });
            return res.json({
                ok: true,
                data: {
                    url,
                    public_id,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                    source: 'cloudinary',
                },
            });
        }

        // ── Local disk fallback ──────────────────────────────────────────────
        const timestamp = Date.now();
        const extension = path.extname(req.file.originalname);
        const filename = `blog-${timestamp}${extension}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, req.file.buffer as any);

        const apiBase = process.env.API_BASE_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');
        if (!apiBase) {
            logger.error('[admin-media] API_BASE_URL is not set in production');
            return res.status(500).json({ ok: false, error: 'server_misconfiguration' });
        }
        const publicUrl = `${apiBase}/api/media/blog/${filename}`;

        return res.json({
            ok: true,
            data: {
                url: publicUrl,
                filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
                source: 'local',
            },
        });
    } catch (error) {
        logger.error("Error uploading image:", error);
        return res.status(500).json({ ok: false, error: "Failed to upload image" });
    }
});

// ── GET /api/media/blog/:filename (local disk serving) ────────────────────────
router.get("/media/blog/:filename", (req: Request, res: Response) => {
    try {
        const filename = req.params.filename as string;
        if (!filename || /[\/\\\0]|\.\.|^\.$/.test(filename)) {
            return res.status(400).json({ ok: false, error: "invalid_filename" });
        }

        const filePath = path.join(UPLOADS_DIR, filename);
        let resolvedPath: string;
        try {
            resolvedPath = fs.realpathSync(filePath);
        } catch {
            return res.status(404).json({ ok: false, error: "Image not found" });
        }

        const resolvedBase = fs.realpathSync(UPLOADS_DIR);
        if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
            return res.status(400).json({ ok: false, error: "invalid_filename" });
        }

        res.setHeader('Cache-Control', 'public, max-age=31536000');
        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
        };
        res.setHeader('Content-Type', mimeMap[ext] ?? 'image/jpeg');
        res.sendFile(resolvedPath);
    } catch (error) {
        logger.error("Error serving image:", safeErrorMessage(error));
        res.status(500).json({ ok: false, error: "Failed to serve image" });
    }
});

export default router;
