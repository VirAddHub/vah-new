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

        // ===== LAYOUT / TYPOGRAPHY CONSTANTS (inspired by web template) =====
        const pageWidth = (doc as any).page.width || 595;
        const pageHeight = (doc as any).page.height || 842;
        const marginX = 50;
        const contentX = marginX;
        const contentW = pageWidth - marginX * 2; // ~495 on A4

        const COLORS = {
            text: '#111827',     // gray-900
            body: '#1F2937',     // gray-800
            muted: '#6B7280',    // gray-500/600
            border: '#E5E7EB',   // gray-200
            infoBorder: '#D1D5DB', // gray-300
            footerBg: '#F9FAFB', // gray-50
        } as const;

        const FONT = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold',
        } as const;

        const BASE_TYPE = {
            title: 20,
            body: 11.5,
            label: 11.5,
            small: 9.5,
        } as const;

        const BASE = {
            lineGap: 3,
            paragraphGap: 14,
            titleToDateGap: 26,
            afterDateGap: 34,
            afterSalutationGap: 24,
            introGap: 16,
            infoIndent: 18,
            infoLabelGap: 14,
            signatureGap: 22,
            afterTermsGap: 26,
            footerLineStep: 14,
        } as const;

        // Header block (logo + divider)
        const headerTop = 50;
        const headerHeight = 80;
        const headerBottom = headerTop + headerHeight;
        const logoX = contentX;
        const logoY = headerTop + 22;
        const logoWidth = 140;

        // ===== LOGO/BRAND (Top-left, 40px margin-bottom) =====
        // PDFKit doesn't support SVG well, so we use PNG for PDFs
        const configuredLogoPath = process.env.VAH_LOGO_PATH?.trim();
        const configuredLogoUrl = process.env.VAH_LOGO_URL?.trim();

        // NOTE: In production the backend may be deployed without the frontend filesystem.
        // Prefer a URL fetch fallback so the certificate always shows the logo.
        const appBaseUrl = (process.env.APP_BASE_URL ?? "https://virtualaddresshub.co.uk").replace(/\/+$/, "");
        const defaultRemoteLogoUrl = `${appBaseUrl}/images/logo.png`;

        const defaultLogoPath = path.resolve(__dirname, '../../../../frontend/public/images/logo.png');
        const alternativeLogoPath = path.resolve(__dirname, '../../../../frontend/public/icons/icon-512.png');

        const imgWidth = logoWidth;
        let drewImage = false;

        const fetchLogoBuffer = async (url: string): Promise<Buffer> => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            try {
                const resp = await fetch(url, { signal: controller.signal });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const ab = await resp.arrayBuffer();
                return Buffer.from(ab);
            } finally {
                clearTimeout(timeout);
            }
        };

        try {
            if (configuredLogoPath && fs.existsSync(configuredLogoPath)) {
                console.log('[Certificate] Loading logo from VAH_LOGO_PATH:', configuredLogoPath);
                doc.image(configuredLogoPath, logoX, logoY, { width: imgWidth });
                drewImage = true;
            } else {
                const logoUrlToTry = configuredLogoUrl || defaultRemoteLogoUrl;
                console.log('[Certificate] Fetching logo from URL:', logoUrlToTry);
                try {
                    const logoBuf = await fetchLogoBuffer(logoUrlToTry);
                    doc.image(logoBuf, logoX, logoY, { width: imgWidth });
                    drewImage = true;
                    console.log('[Certificate] Successfully drew logo from URL');
                } catch (error) {
                    console.warn('[Certificate] Failed to fetch logo from URL, falling back to local paths:', error);
                }

                if (!drewImage) {
                    const logoPath = configuredLogoPath || defaultLogoPath;
                    console.log('[Certificate] Attempting local logo path:', logoPath);
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, logoX, logoY, { width: imgWidth });
                        drewImage = true;
                        console.log('[Certificate] Successfully drew logo from local path');
                    } else if (fs.existsSync(alternativeLogoPath)) {
                        console.log('[Certificate] Trying alternative local logo path:', alternativeLogoPath);
                        doc.image(alternativeLogoPath, logoX, logoY, { width: imgWidth });
                        drewImage = true;
                        console.log('[Certificate] Successfully drew alternative logo from local path');
                    } else {
                        console.log('[Certificate] No local logo file found (this is expected on backend-only deploys).');
                    }
                }
            }
        } catch (error) {
            console.error('[Certificate] Error loading logo image:', error);
        }

        if (!drewImage) {
            console.log('[Certificate] Falling back to text logo');
            doc.fillColor(COLORS.text)
                .fontSize(18)
                .font(FONT.bold)
                .text('VirtualAddressHub', logoX, logoY + 8);
        }

        // Header divider (matches reference: border-b)
        doc.strokeColor(COLORS.border)
            .lineWidth(1)
            .moveTo(contentX, headerBottom)
            .lineTo(contentX + contentW, headerBottom)
            .stroke();

        // ===== SINGLE-PAGE FIT: measure content and auto-tighten if needed =====
        const footerHeight = 110;
        const footerTop = pageHeight - footerHeight;
        const contentTop = headerBottom + 30;
        const contentBottom = footerTop - 24;
        const availableH = contentBottom - contentTop;

        // Business name - use company_name as primary, fallback to individual name
        const businessName = user.company_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Business Entity';
        const contactName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Support Team';

        const registeredBusinessAddress = '54–58 Tanner Street, London SE1 3PH, United Kingdom';

        const terms1 =
            'Under the terms of a verified Digital Mailbox subscription with VirtualAddressHub Ltd, the account holder is authorised to use the above address as their official Registered Office Address and for receiving statutory communications from Companies House and HMRC.';
        const terms2 =
            "Subject to continued compliance with our Terms of Service and UK AML/GDPR requirements, this address may also be used as the company's Trading or Correspondence Address. This certification does not grant any rights of physical occupation or tenancy.";

        const measure = (scale: number) => {
            const TYPE = {
                title: BASE_TYPE.title * scale,
                body: BASE_TYPE.body * scale,
                label: BASE_TYPE.label * scale,
                small: BASE_TYPE.small * scale,
            };
            const lineGap = BASE.lineGap * scale;
            const paragraphGap = BASE.paragraphGap * scale;
            const titleToDateGap = BASE.titleToDateGap * scale;
            const afterDateGap = BASE.afterDateGap * scale;
            const afterSalutationGap = BASE.afterSalutationGap * scale;
            const introGap = BASE.introGap * scale;
            const infoIndent = BASE.infoIndent * scale;
            const infoLabelGap = BASE.infoLabelGap * scale;
            const signatureGap = BASE.signatureGap * scale;
            const afterTermsGap = BASE.afterTermsGap * scale;
            const footerLineStep = BASE.footerLineStep * scale;

            const infoWidth = (contentW - infoIndent);

            const h = (text: string, font: string, fontSize: number, width: number) => {
                doc.font(font as any).fontSize(fontSize);
                return doc.heightOfString(text, { width, lineGap });
            };

            // Title + date + salutation + intro
            let total = 0;
            total += h('Letter of Certification', FONT.bold, TYPE.title, contentW);
            total += titleToDateGap;
            total += h(`Date: ${currentDate}`, FONT.regular, TYPE.body, contentW);
            total += afterDateGap;

            total += h('To Whom It May Concern,', FONT.regular, TYPE.body, contentW);
            total += afterSalutationGap;

            total += h('This letter confirms that the following company is registered at:', FONT.regular, TYPE.body, contentW);
            total += introGap;

            // Info block: 3 label/value pairs + gaps
            total += h('Registered Business Address:', FONT.bold, TYPE.label, infoWidth) + infoLabelGap;
            total += h(registeredBusinessAddress, FONT.regular, TYPE.body, infoWidth) + paragraphGap;

            total += h('Account Holder:', FONT.bold, TYPE.label, infoWidth) + infoLabelGap;
            total += h(businessName, FONT.regular, TYPE.body, infoWidth) + paragraphGap;

            total += h('Contact Name:', FONT.bold, TYPE.label, infoWidth) + infoLabelGap;
            total += h(contactName, FONT.regular, TYPE.body, infoWidth) + paragraphGap;

            // Terms
            total += h(terms1, FONT.regular, TYPE.body, contentW) + paragraphGap;
            total += h(terms2, FONT.regular, TYPE.body, contentW) + afterTermsGap;

            // Signature (2 lines)
            total += h('Sincerely,', FONT.regular, TYPE.body, contentW) + signatureGap;
            total += h('VirtualAddressHub Customer Support', FONT.bold, TYPE.body, contentW);

            return {
                total,
                TYPE,
                lineGap,
                paragraphGap,
                titleToDateGap,
                afterDateGap,
                afterSalutationGap,
                introGap,
                infoIndent,
                infoLabelGap,
                signatureGap,
                afterTermsGap,
                footerLineStep,
            };
        };

        let chosen = measure(1.0);
        for (const s of [0.97, 0.94, 0.91, 0.88, 0.85, 0.82]) {
            if (chosen.total <= availableH) break;
            chosen = measure(s);
        }

        if (chosen.total > availableH) {
            console.warn('[Certificate] Content still exceeds single-page target; clamping spacing aggressively.');
            chosen = measure(0.80);
        }

        const TYPE = chosen.TYPE;

        // Helper: paragraph writer with consistent spacing
        const writeParagraph = (text: string, opts?: { color?: string; size?: number; font?: string; gapAfter?: number }) => {
            doc.fillColor(opts?.color ?? COLORS.body)
                .fontSize(opts?.size ?? TYPE.body)
                .font((opts?.font as any) ?? FONT.regular)
                .text(text, contentX, doc.y, {
                    width: contentW,
                    lineGap: chosen.lineGap,
                });
            doc.y += opts?.gapAfter ?? chosen.paragraphGap;
        };

        const writeLabelValue = (label: string, value: string, x: number, width: number) => {
            doc.fillColor(COLORS.text)
                .fontSize(TYPE.label)
                .font(FONT.bold)
                .text(label, x, doc.y, { width, lineGap: chosen.lineGap });
            doc.y += chosen.infoLabelGap;
            doc.fillColor(COLORS.muted)
                .fontSize(TYPE.body)
                .font(FONT.regular)
                .text(value, x, doc.y, { width, lineGap: chosen.lineGap });
            doc.y += chosen.paragraphGap;
        };

        // Start main content (fits in one page above footer)
        doc.y = contentTop;

        // Title block
        doc.fillColor(COLORS.text)
            .fontSize(TYPE.title)
            .font(FONT.bold)
            .text('Letter of Certification', contentX, doc.y, { width: contentW });
        doc.y += chosen.titleToDateGap;
        doc.fillColor(COLORS.muted)
            .fontSize(TYPE.body)
            .font(FONT.regular)
            .text(`Date: ${currentDate}`, contentX, doc.y, { width: contentW });
        doc.y += chosen.afterDateGap;

        // Salutation
        doc.fillColor(COLORS.text)
            .fontSize(TYPE.body)
            .font(FONT.regular)
            .text('To Whom It May Concern,', contentX, doc.y, { width: contentW });
        doc.y += chosen.afterSalutationGap;

        // Body intro
        writeParagraph('This letter confirms that the following company is registered at:', {
            color: COLORS.body,
            gapAfter: chosen.introGap,
        });

        // Information section (left border + indent, like the web template)
        const infoBorderX = contentX;
        const infoIndent = chosen.infoIndent;
        const infoTextX = contentX + infoIndent;
        const infoWidth = contentW - infoIndent;
        const infoTopY = doc.y;

        writeLabelValue('Registered Business Address:', registeredBusinessAddress, infoTextX, infoWidth);
        writeLabelValue('Account Holder:', businessName, infoTextX, infoWidth);
        writeLabelValue('Contact Name:', contactName, infoTextX, infoWidth);

        const infoBottomY = doc.y - 6;
        doc.strokeColor(COLORS.infoBorder)
            .lineWidth(2)
            .moveTo(infoBorderX, infoTopY)
            .lineTo(infoBorderX, infoBottomY)
            .stroke();

        // Terms paragraphs
        writeParagraph(
            terms1,
            { color: COLORS.body }
        );

        writeParagraph(
            terms2,
            { color: COLORS.body, gapAfter: chosen.afterTermsGap }
        );

        // Signature
        doc.fillColor(COLORS.body)
            .fontSize(TYPE.body)
            .font(FONT.regular)
            .text('Sincerely,', contentX, doc.y, { width: contentW });
        doc.y += chosen.signatureGap;
        doc.fillColor(COLORS.text)
            .fontSize(TYPE.body)
            .font(FONT.bold)
            .text('VirtualAddressHub Customer Support', contentX, doc.y, { width: contentW });

        // ===== FOOTER (light gray background + centered lines) =====
        // If content runs too low, clamp it (single-page certificate)
        if (doc.y > footerTop - 18) {
            doc.y = footerTop - 18;
        }

        // Footer background
        doc.save();
        doc.rect(0, footerTop, pageWidth, footerHeight).fill(COLORS.footerBg);
        doc.restore();

        // Footer top border
        doc.strokeColor(COLORS.border)
            .lineWidth(1)
            .moveTo(0, footerTop)
            .lineTo(pageWidth, footerTop)
            .stroke();

        // Footer text
        const footerTextX = contentX;
        const footerTextW = contentW;
        let fy = footerTop + 18;

        doc.fillColor(COLORS.body)
            .fontSize(TYPE.small)
            .font(FONT.bold)
            .text('VirtualAddressHub Ltd', footerTextX, fy, { width: footerTextW, align: 'center' });
        fy += chosen.footerLineStep;

        doc.fillColor(COLORS.muted)
            .fontSize(TYPE.small)
            .font(FONT.regular)
            .text('2nd Floor Left, 54–58 Tanner Street, London SE1 3PH, United Kingdom', footerTextX, fy, { width: footerTextW, align: 'center' });
        fy += chosen.footerLineStep;

        doc.text('support@virtualaddresshub.co.uk · www.virtualaddresshub.co.uk', footerTextX, fy, { width: footerTextW, align: 'center' });
        fy += chosen.footerLineStep;

        doc.fillColor('#9CA3AF') // gray-400
            .text('Registered in England', footerTextX, fy, { width: footerTextW, align: 'center' });

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
