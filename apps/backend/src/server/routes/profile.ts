// src/server/routes/profile.ts
// User profile API endpoints

import { Router, Request, Response } from "express";
import { getPool } from '../db';
import PDFDocument from 'pdfkit';

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

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="proof-of-address-${new Date().toISOString().split('T')[0]}.pdf"`);

        // Pipe PDF to response
        doc.pipe(res);

        // VAH Header with green branding
        doc.fillColor('#10B981') // VAH green
            .fontSize(24)
            .font('Helvetica-Bold')
            .text('Virtual Address Hub', 50, 50)
            .fontSize(12)
            .fillColor('#6B7280')
            .text('Professional Business Address Service', 50, 80);

        // VAH Logo (green square with VAH initials)
        const logoSize = 40;
        const logoX = 50;
        const logoY = 100;

        // Draw green square background
        doc.fillColor('#214E34') // Primary green color matching CSS
            .rect(logoX, logoY, logoSize, logoSize)
            .fill();

        // Add VAH text in white
        doc.fillColor('#FFFFFF')
            .fontSize(16)
            .font('Helvetica-Bold')
            .text('VAH', logoX + 8, logoY + 12);

        // Certificate title
        doc.fillColor('#000000')
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('PROOF OF ADDRESS CERTIFICATE', 50, 160, { align: 'center' });

        // Certificate content
        doc.fontSize(12)
            .font('Helvetica')
            .fillColor('#374151')
            .text('This is to certify that:', 50, 200)
            .text('', 0, 10); // Line break

        // Company name or individual name
        const displayName = user.company_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Business Entity';
        doc.font('Helvetica-Bold')
            .fontSize(14)
            .text(displayName, 50, 220)
            .font('Helvetica')
            .fontSize(12);

        doc.text('is registered at our business address:', 50, 250)
            .text('', 0, 10);

        // Virtual address
        doc.font('Helvetica-Bold')
            .fontSize(14)
            .text('71-75 Shelton Street', 50, 270)
            .text('Covent Garden', 50, 290)
            .text('London', 50, 310)
            .text('WC2H 9JQ', 50, 330)
            .text('United Kingdom', 50, 350)
            .font('Helvetica')
            .fontSize(12);

        doc.text('', 0, 20);

        // Additional details
        doc.text('This address may be used for:', 50, 390)
            .text('• Business correspondence and official mail', 70, 410)
            .text('• Companies House registrations', 70, 430)
            .text('• HMRC correspondence', 70, 450)
            .text('• Banking and financial services', 70, 470)
            .text('• Professional networking and business listings', 70, 490);

        // Footer
        doc.text('', 0, 30);
        doc.text(`Certificate generated on: ${currentDate}`, 50, 540)
            .text('For verification purposes, this certificate is digitally generated', 50, 560)
            .text('and contains the current date of issue.', 50, 580);

        // VAH footer
        doc.text('', 0, 20);
        doc.fillColor('#10B981')
            .fontSize(10)
            .text('Virtual Address Hub - Professional Business Address Service', 50, 620, { align: 'center' })
            .text('www.virtualaddresshub.co.uk', 50, 635, { align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error: any) {
        console.error('[GET /api/profile/certificate] error:', error);
        return res.status(500).json({ ok: false, error: 'certificate_generation_failed', message: error.message });
    }
});

export default router;
