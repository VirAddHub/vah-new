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
                forwarding_address,
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

        // Create PDF document with wide margins for clean, airy layout
        const doc = new PDFDocument({
            size: 'A4',
            margin: 60 // Wide margins for professional spacing
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="proof-of-address-${new Date().toISOString().split('T')[0]}.pdf"`);

        // Pipe PDF to response
        doc.pipe(res);

        // ===== LOGO/HEADER (Top Left or Center) =====
        const configuredLogoPath = process.env.VAH_LOGO_PATH;
        const defaultLogoPath = path.resolve(__dirname, '../../../../frontend/public/icons/icon-512.png');
        const alternativeLogoPath = path.resolve(__dirname, '../../../../frontend/public/icons/icon-192.png');
        const logoPath = configuredLogoPath || defaultLogoPath;
        let drewImage = false;

        console.log('[Certificate] Attempting to load logo from:', logoPath);
        console.log('[Certificate] Logo file exists:', fs.existsSync(logoPath));

        try {
            if (fs.existsSync(logoPath)) {
                // Draw logo at top-left with constrained width
                const imgWidth = 120;
                doc.image(logoPath, 60, 60, { width: imgWidth });
                drewImage = true;
                console.log('[Certificate] Successfully drew logo image at top-left');
            } else if (fs.existsSync(alternativeLogoPath)) {
                console.log('[Certificate] Trying alternative logo path:', alternativeLogoPath);
                const imgWidth = 120;
                doc.image(alternativeLogoPath, 60, 60, { width: imgWidth });
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
                .text('VirtualAddressHub', 60, 70);
        }

        // ===== LARGE TOP WHITESPACE =====
        // Move down 70-80px from logo position for airy spacing
        doc.y = drewImage ? 200 : 150; // Large top margin

        // ===== TITLE (Left-aligned, Bold, 18-20px) =====
        doc.fillColor('#000000')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('Letter of Certification', { align: 'left' });

        // ===== DATE (Directly under title, subtle 12-14px) =====
        doc.moveDown(0.5);
        doc.fillColor('#666666')
            .fontSize(13)
            .font('Helvetica')
            .text(`Date: ${currentDate}`, { align: 'left' });

        // ===== GENEROUS SPACING BEFORE BODY =====
        doc.moveDown(2.0); // 24-32px equivalent spacing

        // ===== SALUTATION =====
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text('To Whom It May Concern,', { align: 'left' });

        // ===== MAIN BODY (12-13px, 1.5 line-height) =====
        doc.moveDown(1.2); // 20-28px spacing before section
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(
                'This letter confirms that the following company is registered at:',
                { 
                    align: 'left',
                    lineGap: 6,
                    paragraphGap: 8
                }
            );

        // ===== REGISTERED ADDRESS BLOCK =====
        doc.moveDown(1.5); // Generous spacing before section header

        doc.fillColor('#000000')
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Registered Business Address', { align: 'left' });

        doc.moveDown(0.4);
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text('54-58 Tanner Street, 2nd Floor, London SE1 3PH, United Kingdom', { align: 'left' });

        // ===== ACCOUNT DETAILS SECTION =====
        doc.moveDown(1.8); // 40-50px spacing before signature block area

        // Business name - use company_name as primary, fallback to individual name
        const businessName = user.company_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Business Entity';

        doc.fillColor('#000000')
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Account Holder', { align: 'left' });

        doc.moveDown(0.3);
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(businessName, { align: 'left' });

        doc.moveDown(1.2);

        // Contact details
        doc.fillColor('#000000')
            .fontSize(15)
            .font('Helvetica-Bold')
            .text('Contact Name', { align: 'left' });

        doc.moveDown(0.3);
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Support Team', { align: 'left' });

        // ===== TERMS PARAGRAPH =====
        doc.moveDown(2.0); // Large spacing before terms

        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text(
                'Under the terms of a verified Digital Mailbox subscription with VirtualAddressHub Ltd, the account holder is authorised to use the above address as their official Registered Office Address and for receiving statutory communications from Companies House and HMRC.',
                { 
                    align: 'left',
                    lineGap: 6,
                    paragraphGap: 12
                }
            );

        doc.text(
            'Subject to continued compliance with our Terms of Service and UK AML/GDPR requirements, this address may also be used as the company\'s Trading or Correspondence Address. This certification does not grant any rights of physical occupation or tenancy.',
            { 
                align: 'left',
                lineGap: 6,
                paragraphGap: 12
            }
        );

        // ===== CLOSING =====
        doc.moveDown(2.0); // 40-50px spacing before signature
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica')
            .text('Sincerely,', { align: 'left' });

        doc.moveDown(0.5);
        doc.fillColor('#000000')
            .fontSize(13)
            .font('Helvetica-Bold')
            .text('VirtualAddressHub Customer Support', { align: 'left' });

        // ===== FOOTER =====
        // Calculate position at bottom of page with lots of whitespace
        const pageHeight = (doc as any).page.height || 842; // A4 height in points
        const footerStartY = pageHeight - 80; // Position footer 80pt from bottom (lots of whitespace above)

        // Ensure we don't overlap content - if current position is too low, move footer down
        if (doc.y > footerStartY - 20) {
            doc.y = footerStartY - 20; // Add extra space before footer
        } else {
            // Move to footer position with generous whitespace
            doc.y = footerStartY;
        }

        // Add thin divider line above footer
        doc.strokeColor('#E5E7EB')
            .lineWidth(0.5)
            .moveTo(60, doc.y)
            .lineTo(535, doc.y) // 60pt margin on each side
            .stroke();

        doc.moveDown(1.0); // Generous spacing after divider

        // Footer content with smaller, muted text (9-10px)
        doc.fillColor('#9CA3AF')
            .fontSize(10)
            .font('Helvetica')
            .text('VirtualAddressHub Ltd · 54-58 Tanner Street, 2nd Floor, London SE1 3PH, United Kingdom', { align: 'center' })
            .text('support@virtualaddresshub.co.uk · www.virtualaddresshub.co.uk', { align: 'center' })
            .text('Registered in England', { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error: any) {
        console.error('[GET /api/profile/certificate] error:', error);
        return res.status(500).json({ ok: false, error: 'certificate_generation_failed', message: error.message });
    }
});

export default router;
