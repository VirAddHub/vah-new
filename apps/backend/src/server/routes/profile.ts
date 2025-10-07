// src/server/routes/profile.ts
// User profile API endpoints

import { Router, Request, Response } from "express";
import { getPool } from '../db';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const router = Router();

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
                kyc_status,
                COALESCE(kyc_verified_at_ms, kyc_verified_at) as kyc_verified_at_ms,
                kyc_rejection_reason,
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

        return res.json({ ok: true, data: result.rows[0] });
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
        country
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
 * GET /api/profile/certificate
 * Generate and download proof of address certificate
 */
router.get("/certificate", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    try {
        // Get user profile data
        const result = await pool.query(`
            SELECT
                first_name,
                last_name,
                company_name,
                email,
                created_at
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const user = result.rows[0];
        const currentDate = new Date().toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Create PDF document with tighter margins for single page
        const doc = new PDFDocument({
            size: 'A4',
            margin: 30
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="proof-of-address-${new Date().toISOString().split('T')[0]}.pdf"`);

        // Pipe PDF to response
        doc.pipe(res);

        // ===== BRAND LOGO (Top Center) =====
        // Try to embed a real logo image; fall back to text if not available
        const configuredLogoPath = process.env.VAH_LOGO_PATH;
        const defaultLogoPath = path.resolve(__dirname, '../../../frontend/public/icons/icon-512.png');
        const logoPath = configuredLogoPath || defaultLogoPath;
        let drewImage = false;
        try {
            if (fs.existsSync(logoPath)) {
                // Draw centered at the top with constrained width
                const imgWidth = 140; // looks clean on A4
                const pageWidth = (doc as any).page.width || 595.28; // pdfkit default A4 width in pt
                const x = (pageWidth - imgWidth) / 2;
                doc.image(logoPath, x, 24, { width: imgWidth });
                drewImage = true;
            }
        } catch { }
        if (!drewImage) {
            doc.fillColor('#214E34')
                .fontSize(28)
                .font('Helvetica-Bold')
                .text('VAH', 30, 30, { align: 'center' });
        }

        // ===== LETTER TITLE =====
        doc.fillColor('#000000')
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('Letter of Certification', 30, 70);

        // ===== DATE =====
        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica')
            .text(`Date: ${currentDate}`, 30, 95);

        // ===== SALUTATION =====
        doc.text('To Whom It May Concern,', 30, 115);

        // ===== MAIN BODY =====
        doc.moveDown(0.8);
        doc.text(
            'This letter confirms that the following company is registered at:',
            { paragraphGap: 6 }
        );

        // ===== REGISTERED ADDRESS BLOCK =====
        doc.moveDown(0.4);
        doc.fillColor('#214E34')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('Registered Business Address:', 50, doc.y);

        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica')
            .text('71-75 Shelton Street', 50, doc.y + 4)
            .text('Covent Garden', 50, doc.y + 18)
            .text('London, WC2H 9JQ', 50, doc.y + 32)
            .text('United Kingdom', 50, doc.y + 46);

        // ===== ACCOUNT DETAILS =====
        doc.moveDown(1.2);

        // Company/Individual name
        const displayName = user.company_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Business Entity';

        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('Account Holder:', 30, doc.y);

        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica')
            .text(displayName, 30, doc.y + 4);

        doc.moveDown(0.6);

        // Contact details
        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('Contact Name:', 30, doc.y);

        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica')
            .text(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A', 30, doc.y + 4);

        // ===== TERMS PARAGRAPH =====
        doc.moveDown(1.2);

        doc.fillColor('#000000')
            .fontSize(11)
            .font('Helvetica')
            .text(
                'Under the terms of a verified digital mailbox subscription with VirtualAddressHub Ltd, the account holder is authorised to use the above address as their official Registered Office Address and for receiving statutory communications from Companies House and HMRC.',
                { paragraphGap: 6 }
            );

        doc.text(
            'Subject to ongoing compliance with our Terms of Service and UK AML/GDPR requirements, this address may also be used as the company\'s Trading or Correspondence Address. This confirmation does not confer rights of physical occupation or tenancy.',
            { paragraphGap: 8 }
        );

        // ===== CLOSING =====
        doc.moveDown(1.2);
        doc.text('Sincerely,', 30, doc.y);
        doc.text('VirtualAddressHub Customer Support', 30, doc.y + 16);

        // ===== FOOTER =====
        doc.moveDown(1.5);
        doc.fillColor('#6B7280')
            .fontSize(8)
            .font('Helvetica')
            .text('VirtualAddressHub Ltd. 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom', 30, doc.y, { align: 'center' })
            .text('T: +44 (0) 20 1234 5678 | E: support@virtualaddresshub.co.uk | W: www.virtualaddresshub.co.uk', 30, doc.y + 12, { align: 'center' })
            .text('VirtualAddressHub Ltd. Registered Office: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom', 30, doc.y + 24, { align: 'center' })
            .text('Registered in England | VAT no: [VAT_NUMBER]', 30, doc.y + 36, { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error: any) {
        console.error('[GET /api/profile/certificate] error:', error);
        return res.status(500).json({ ok: false, error: 'certificate_generation_failed', message: error.message });
    }
});

export default router;
