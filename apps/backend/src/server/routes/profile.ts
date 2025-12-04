// src/server/routes/profile.ts
// User profile API endpoints

import { Router, Request, Response } from "express";
import { getPool } from '../db';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';

const router = Router();

// Configure multer for file uploads (Companies House verification)
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'data', 'ch-verification');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = (req as any).user?.id;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `ch-verification-${userId}-${timestamp}${ext}`;
        cb(null, filename);
    }
});

const chVerificationUpload = multer({
    storage: uploadStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            // Multer 2.x FileFilterCallback expects null for errors, but we pass Error for rejection
            // Type assertion needed due to strict multer 2.x types
            (cb as any)(new Error('Only image files and PDFs are allowed'), false);
        }
    }
});

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/profile
 * Get current user's profile
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                id,
                email,
                status as state,
                first_name,
                last_name,
                phone,
                company_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                forwarding_address,
                kyc_status,
                COALESCE(kyc_verified_at_ms, kyc_verified_at) as kyc_verified_at_ms,
                kyc_rejection_reason,
                companies_house_verified,
                ch_verification_proof_url,
                ch_verification_status,
                ch_verification_submitted_at,
                ch_verification_reviewed_at,
                ch_verification_notes,
                plan_id,
                subscription_status,
                created_at,
                updated_at,
                last_login_at
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        // Compute identity compliance status
        const { computeIdentityCompliance } = await import('../services/compliance');
        const compliance = computeIdentityCompliance(user);

        return res.json({
            ok: true,
            data: {
                ...user,
                compliance,
            }
        });
    } catch (error: any) {
        console.error('[GET /api/profile] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/profile/me (legacy endpoint)
 * Get current user's profile (same as GET /api/profile)
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT
                id,
                email,
                name,
                phone,
                company_name,
                address_line1,
                address_line2,
                city,
                state,
                postal_code,
                country,
                forwarding_address,
                kyc_status,
                kyc_verified_at,
                plan_id,
                subscription_status,
                created_at,
                updated_at,
                last_login_at
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: { me: result.rows[0] } });
    } catch (error: any) {
        console.error('[GET /api/profile/me] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/profile
 * Update current user's profile
 */
router.patch("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
        name,
        phone,
        company_name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        forwarding_address
    } = req.body;

    const pool = getPool();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
    }
    if (company_name !== undefined) {
        updates.push(`company_name = $${paramIndex++}`);
        values.push(company_name);
    }
    if (address_line1 !== undefined) {
        updates.push(`address_line1 = $${paramIndex++}`);
        values.push(address_line1);
    }
    if (address_line2 !== undefined) {
        updates.push(`address_line2 = $${paramIndex++}`);
        values.push(address_line2);
    }
    if (city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(city);
    }
    if (state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(state);
    }
    if (postal_code !== undefined) {
        updates.push(`postal_code = $${paramIndex++}`);
        values.push(postal_code);
    }
    if (country !== undefined) {
        updates.push(`country = $${paramIndex++}`);
        values.push(country);
    }
    if (forwarding_address !== undefined) {
        updates.push(`forwarding_address = $${paramIndex++}`);
        values.push(forwarding_address);
    }

    if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: 'no_updates_provided' });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(Date.now());

    // Add userId for WHERE clause
    values.push(userId);

    try {
        const result = await pool.query(`
            UPDATE "user"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PATCH /api/profile] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/profile/me (legacy endpoint)
 * Update current user's profile (same as PATCH /api/profile)
 */
router.patch("/me", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
        name,
        phone,
        company_name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        forwarding_address
    } = req.body;

    const pool = getPool();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
    }
    if (company_name !== undefined) {
        updates.push(`company_name = $${paramIndex++}`);
        values.push(company_name);
    }
    if (address_line1 !== undefined) {
        updates.push(`address_line1 = $${paramIndex++}`);
        values.push(address_line1);
    }
    if (address_line2 !== undefined) {
        updates.push(`address_line2 = $${paramIndex++}`);
        values.push(address_line2);
    }
    if (city !== undefined) {
        updates.push(`city = $${paramIndex++}`);
        values.push(city);
    }
    if (state !== undefined) {
        updates.push(`state = $${paramIndex++}`);
        values.push(state);
    }
    if (postal_code !== undefined) {
        updates.push(`postal_code = $${paramIndex++}`);
        values.push(postal_code);
    }
    if (country !== undefined) {
        updates.push(`country = $${paramIndex++}`);
        values.push(country);
    }
    if (forwarding_address !== undefined) {
        updates.push(`forwarding_address = $${paramIndex++}`);
        values.push(forwarding_address);
    }

    if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: 'no_updates_provided' });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(Date.now());

    // Add userId for WHERE clause
    values.push(userId);

    try {
        const result = await pool.query(`
            UPDATE "user"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PATCH /api/profile/me] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * GET /api/profile/registered-office-address
 * Get the registered office address (gated by compliance)
 */
router.get("/registered-office-address", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user profile data including compliance status
        const result = await pool.query(`
            SELECT
                kyc_status,
                ch_verification_status,
                companies_house_verified
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        // Compute identity compliance status
        const { computeIdentityCompliance } = await import('../services/compliance');
        const compliance = computeIdentityCompliance(user);

        // Gate the address - only return if both KYC and CH are approved
        if (!compliance.canUseRegisteredOfficeAddress) {
            return res.status(403).json({
                ok: false,
                error: 'IDENTITY_COMPLIANCE_REQUIRED',
                message: 'You need to complete identity checks before you can view and use your registered office address.',
                compliance,
            });
        }

        // Return the registered office address
        const { REGISTERED_OFFICE_ADDRESS } = await import('../../config/address');
        return res.json({
            ok: true,
            data: {
                address: REGISTERED_OFFICE_ADDRESS,
                compliance,
            },
        });
    } catch (error: any) {
        console.error('[GET /api/profile/registered-office-address] error:', error);
        return res.status(500).json({ ok: false, error: 'server_error', message: error.message });
    }
});

/**
 * GET /api/profile/certificate
 * Generate and download proof of address certificate
 */
router.get("/certificate", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user profile data including KYC status
        const result = await pool.query(`
            SELECT
                first_name,
                last_name,
                company_name,
                email,
                created_at,
                kyc_status
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];

        // Check KYC status - certificate requires approved KYC
        const { isKycApproved } = await import('../services/kyc-guards');
        if (!isKycApproved(user.kyc_status)) {
            return res.status(403).json({
                ok: false,
                error: 'KYC_REQUIRED',
                message: 'You must complete identity verification (KYC) before accessing your proof of address certificate.',
            });
        }
        const currentDate = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Create PDF document with exact margins: top: 70px, left: 50px, right: 50px, bottom: 70px
        // PDFKit uses single margin value, so we'll use 50px and manually position top content
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50 // Left/right/bottom margin
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="proof-of-address-${new Date().toISOString().split('T')[0]}.pdf"`);

        // Pipe PDF to response
        doc.pipe(res);

        // ===== LOGO/BRAND (Top-left, 40px margin-bottom) =====
        // PDFKit doesn't support SVG well, so we use PNG for PDFs
        const configuredLogoPath = process.env.VAH_LOGO_PATH;
        const defaultLogoPath = path.resolve(__dirname, '../../../../frontend/public/images/logo.png');
        const alternativeLogoPath = path.resolve(__dirname, '../../../../frontend/public/icons/icon-512.png');
        const logoPath = configuredLogoPath || defaultLogoPath;
        let drewImage = false;

        console.log('[Certificate] Attempting to load logo from:', logoPath);
        console.log('[Certificate] Logo file exists:', fs.existsSync(logoPath));

        try {
            if (fs.existsSync(logoPath)) {
                // Draw logo at top-left (50px from left margin, 70px from top of page), width 120px
                const imgWidth = 120;
                doc.image(logoPath, 50, 70, { width: imgWidth });
                drewImage = true;
                console.log('[Certificate] Successfully drew logo image at top-left');
            } else if (fs.existsSync(alternativeLogoPath)) {
                console.log('[Certificate] Trying alternative logo path:', alternativeLogoPath);
                const imgWidth = 120;
                doc.image(alternativeLogoPath, 50, 70, { width: imgWidth });
                drewImage = true;
                console.log('[Certificate] Successfully drew alternative logo image at top-left');
            }
        } catch (error) {
            console.error('[Certificate] Error loading logo image:', error);
        }

        if (!drewImage) {
            console.log('[Certificate] Falling back to text logo');
            doc.fillColor('#214E34')
                .fontSize(32)
                .font('Helvetica-Bold')
                .text('VirtualAddressHub', 50, 80);
        }

        // ===== TITLE BLOCK (40px margin-bottom from logo) =====
        // Position after logo: logo at 70px + logo height (~120px) + 40px margin = 230px from top
        doc.y = drewImage ? 230 : 200; // Logo at 70px + 120px height + 40px margin

        // Title: 22px, font-weight 600, margin-bottom 10px
        doc.fillColor('#000000')
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('Letter of Certification', { align: 'left' });

        // Date: 13px, color #666, margin-bottom 40px
        doc.moveDown(0.4); // ~10px spacing
        doc.fillColor('#666666')
            .fontSize(13)
            .font('Helvetica')
            .text(`Date: ${currentDate}`, { align: 'left' });

        // ===== BODY SECTION (26px margin-bottom after each block) =====
        doc.moveDown(1.8); // ~40px spacing after date

        // Salutation
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text('To Whom It May Concern,', { align: 'left' });

        doc.moveDown(1.0); // 26px spacing

        // Intro sentence paragraph
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(
                'This letter confirms that the following company is registered at:',
                {
                    align: 'left',
                    lineHeight: 1.55,
                    width: 550 // max-width: 550px
                }
            );

        doc.moveDown(1.0); // 26px spacing

        // Registered Business Address block
        doc.fillColor('#000000')
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Registered Business Address', { align: 'left' });

        doc.moveDown(0.25); // ~6px spacing (margin-bottom: 6px equivalent)

        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text('54–58 Tanner Street, London SE1 3PH, United Kingdom', {
                align: 'left',
                lineHeight: 1.55,
                width: 550
            });

        doc.moveDown(1.0); // 26px spacing

        // Account Holder block
        // Business name - use company_name as primary, fallback to individual name
        const businessName = user.company_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Business Entity';

        doc.fillColor('#000000')
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Account Holder', { align: 'left' });

        doc.moveDown(0.25); // ~6px spacing

        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(businessName, {
                align: 'left',
                lineHeight: 1.55,
                width: 550
            });

        doc.moveDown(1.0); // 26px spacing

        // Contact Name block
        doc.fillColor('#000000')
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Contact Name', { align: 'left' });

        doc.moveDown(0.25); // ~6px spacing

        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Support Team', {
                align: 'left',
                lineHeight: 1.55,
                width: 550
            });

        doc.moveDown(1.0); // 26px spacing

        // Terms paragraphs
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(
                'Under the terms of a verified Digital Mailbox subscription with VirtualAddressHub Ltd, the account holder is authorised to use the above address as their official Registered Office Address and for receiving statutory communications from Companies House and HMRC.',
                {
                    align: 'left',
                    lineHeight: 1.55,
                    width: 550
                }
            );

        doc.moveDown(0.6); // Paragraph spacing

        doc.text(
            'Subject to continued compliance with our Terms of Service and UK AML/GDPR requirements, this address may also be used as the company\'s Trading or Correspondence Address. This certification does not grant any rights of physical occupation or tenancy.',
            {
                align: 'left',
                lineHeight: 1.55,
                width: 550
            }
        );

        // ===== SIGNATURE BLOCK (40px margin-top before "Sincerely,") =====
        doc.moveDown(1.5); // ~40px spacing

        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text('Sincerely,', { align: 'left' });

        doc.moveDown(0.4);
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica-Bold')
            .text('VirtualAddressHub Customer Support', { align: 'left' });

        // ===== FOOTER (50px above footer, thin rule, bottom of page) =====
        const pageHeight = (doc as any).page.height || 842; // A4 height in points
        const footerRuleY = pageHeight - 70 - 50; // Bottom margin (70px) + 50px spacing = 120px from bottom
        const footerTextY = footerRuleY + 12; // Text starts 12px after rule

        // Ensure content doesn't overlap footer
        if (doc.y > footerRuleY - 20) {
            // Content is too close, add more space
            doc.y = footerRuleY - 30;
        }

        // Thin horizontal rule (1px, #ddd) 50px above footer
        doc.strokeColor('#DDDDDD')
            .lineWidth(1)
            .moveTo(50, footerRuleY)
            .lineTo(545, footerRuleY) // 50px margin on each side (A4 width 595 - 50*2 = 495, but using 545 for safety)
            .stroke();

        // Footer text at calculated position
        doc.y = footerTextY;

        // Footer font: 10px, color #666, line-height 1.4, text-align center
        doc.fillColor('#666666')
            .fontSize(10)
            .font('Helvetica')
            .text('VirtualAddressHub Ltd · 2nd Floor, 54–58 Tanner Street, London SE1 3PH, United Kingdom', {
                align: 'center',
                lineGap: 4 // line-height 1.4 equivalent
            })
            .text('support@virtualaddresshub.co.uk · www.virtualaddresshub.co.uk', {
                align: 'center',
                lineGap: 4
            })
            .text('Registered in England', {
                align: 'center',
                lineGap: 4
            });

        // Finalize PDF
        doc.end();

    } catch (error: any) {
        console.error('[GET /api/profile/certificate] error:', error);
        return res.status(500).json({ ok: false, error: 'certificate_generation_failed', message: error.message });
    }
});

/**
 * GET /api/profile/ch-verification
 * Get Companies House verification status for current user
 */
router.get("/ch-verification", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        const result = await pool.query(`
            SELECT 
                companies_house_verified,
                ch_verification_proof_url,
                ch_verification_status,
                ch_verification_submitted_at,
                ch_verification_reviewed_at,
                ch_verification_notes
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const row = result.rows[0];
        return res.json({
            ok: true,
            data: {
                companies_house_verified: row.companies_house_verified || false,
                ch_verification_proof_url: row.ch_verification_proof_url || null,
                ch_verification_status: row.ch_verification_status || 'not_submitted',
                ch_verification_submitted_at: row.ch_verification_submitted_at || null,
                ch_verification_reviewed_at: row.ch_verification_reviewed_at || null,
                ch_verification_notes: row.ch_verification_notes || null
            }
        });
    } catch (error: any) {
        console.error('[GET /api/profile/ch-verification] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/profile/ch-verification
 * Upload Companies House verification proof and mark as verified
 */
router.post("/ch-verification", requireAuth, chVerificationUpload.single('file'), async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'missing_file', message: 'No file provided' });
        }

        // Build the proof URL (relative path or full URL depending on your setup)
        const proofUrl = `/api/profile/media/ch-verification/${req.file.filename}`;
        const fullUrl = process.env.API_BASE_URL
            ? `${process.env.API_BASE_URL}${proofUrl}`
            : proofUrl;

        // Update user record
        const now = Date.now();
        const updateResult = await pool.query(`
            UPDATE "user"
            SET 
                companies_house_verified = false,
                ch_verification_proof_url = $1,
                ch_verification_status = 'submitted',
                ch_verification_submitted_at = NOW(),
                ch_verification_reviewed_at = NULL,
                ch_verification_reviewer_id = NULL,
                ch_verification_notes = NULL,
                updated_at = $2
            WHERE id = $3
            RETURNING companies_house_verified, ch_verification_proof_url, ch_verification_status, ch_verification_submitted_at, ch_verification_reviewed_at, ch_verification_notes
        `, [fullUrl, now, userId]);

        return res.json({
            ok: true,
            data: updateResult.rows[0]
        });
    } catch (error: any) {
        console.error('[POST /api/profile/ch-verification] error:', error);
        return res.status(500).json({ ok: false, error: 'upload_error', message: error.message });
    }
});

/**
 * GET /api/media/ch-verification/:filename
 * Serve uploaded Companies House verification files (auth-protected)
 */
router.get("/media/ch-verification/:filename", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { filename } = req.params;
    const pool = getPool();

    try {
        // Verify the file belongs to the current user
        const userResult = await pool.query(`
            SELECT ch_verification_proof_url
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const proofUrl = userResult.rows[0].ch_verification_proof_url;
        if (!proofUrl || !proofUrl.includes(filename)) {
            return res.status(403).json({ ok: false, error: 'forbidden', message: 'File does not belong to this user' });
        }

        const filePath = path.join(process.cwd(), 'data', 'ch-verification', filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ ok: false, error: 'file_not_found' });
        }

        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === '.pdf'
            ? 'application/pdf'
            : ext.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                ? `image/${ext.slice(1)}`
                : 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error: any) {
        console.error('[GET /api/media/ch-verification/:filename] error:', error);
        return res.status(500).json({ ok: false, error: 'file_serve_error', message: error.message });
    }
});

export default router;
