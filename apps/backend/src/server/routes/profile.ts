// src/server/routes/profile.ts
// User profile API endpoints

import { Router, Request, Response } from "express";
import { getPool } from '../db';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import multer, { FileFilterCallback } from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '../../lib/logger';

const router = Router();

// Allowed file extensions (whitelist approach)
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
];

// Configure multer for file uploads (Companies House verification)
// Using memory storage to validate magic bytes before saving
const uploadStorage = multer.memoryStorage();

const chVerificationUpload = multer({
    storage: uploadStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: async (req, file, cb) => {
        try {
            // Step 1: Whitelist file extension (client-provided, but first check)
            const ext = path.extname(file.originalname).toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                return (cb as any)(new Error('File extension not allowed. Only PDF and image files are permitted.'), false);
            }

            // Step 2: Basic mimetype check (can be spoofed, but fail fast)
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                return (cb as any)(new Error('File type not allowed. Only PDF and image files are permitted.'), false);
            }

            // Note: Magic-byte validation happens after multer processes the file
            // in the route handler, before saving to disk
            cb(null, true);
        } catch (error: any) {
            (cb as any)(new Error(`File validation error: ${error.message}`), false);
        }
    }
});

/**
 * Validate file using magic bytes (file-type library)
 * This prevents spoofed Content-Type headers
 */
async function validateFileMagicBytes(fileBuffer: Buffer, originalName: string): Promise<{ valid: boolean; error?: string }> {
    try {
        // Read magic bytes to determine actual file type
        // Convert Buffer to Uint8Array for file-type compatibility
        const uint8Array = new Uint8Array(fileBuffer);
        const fileType = await fileTypeFromBuffer(uint8Array);

        if (!fileType) {
            return { valid: false, error: 'Could not determine file type from file contents' };
        }

        // Verify the detected type matches allowed types
        const { mime, ext } = fileType;

        // Check MIME type
        if (!ALLOWED_MIME_TYPES.includes(mime)) {
            return { valid: false, error: `File type mismatch: detected ${mime}, expected PDF or image` };
        }

        // Check extension matches detected type
        const originalExt = path.extname(originalName).toLowerCase();
        const detectedExt = `.${ext}`;

        // Map common extensions
        const extMap: Record<string, string[]> = {
            '.jpg': ['.jpg', '.jpeg'],
            '.jpeg': ['.jpg', '.jpeg'],
            '.png': ['.png'],
            '.gif': ['.gif'],
            '.webp': ['.webp'],
            '.pdf': ['.pdf']
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
        // Check if middle_names column exists
        const hasMiddleNames = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'user' AND column_name = 'middle_names'
        `).then(r => r.rows.length > 0).catch(() => false);

        const middleNamesSelect = hasMiddleNames ? 'middle_names,' : '';

        const result = await pool.query(`
            SELECT
                id,
                email,
                status as state,
                first_name,
                last_name,
                ${middleNamesSelect}
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
                is_sole_controller,
                additional_controllers_count,
                controllers_declared_at,
                owners_pending_info,
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

        // 🔍 STEP 1: Log DB value
        console.log("🟢 PROFILE DB ROW:", {
            userId: user.id,
            forwarding_address: user.forwarding_address,
            rawUser: user,
        });

        // Compute identity compliance status
        const { computeIdentityCompliance } = await import('../services/compliance');
        const compliance = await computeIdentityCompliance(user);

        // Derived field: controllers_verification_required
        // True if user declared they are NOT the sole controller
        const controllersVerificationRequired = user.is_sole_controller === false;

        // 🔍 STEP 2: Log API response shape
        const response = {
            ok: true,
            data: {
                ...user,
                compliance,
                controllers_verification_required: controllersVerificationRequired,
            }
        };

        console.log("🟦 PROFILE API RESPONSE:", {
            ok: response.ok,
            data: {
                id: response.data.id,
                email: response.data.email,
                forwarding_address: response.data.forwarding_address,
            }
        });

        return res.json(response);
    } catch (error: any) {
        logger.error('[GET /api/profile] error', { message: error?.message ?? String(error) });
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
        logger.error('[GET /api/profile/me] error', { message: error?.message ?? String(error) });
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/profile
 * Update current user's profile
 */
router.patch("/", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    // Debug: Log payload keys only (never full body) in non-production
    if (process.env.NODE_ENV !== 'production') {
        logger.debug("[profile] PATCH payload keys", { keys: Object.keys(req.body || {}) });
    }

    // EXPLICIT ALLOWLIST: Only these fields can be updated via profile endpoint
    // Note: email and phone should use /api/profile/contact endpoint (email requires verification)
    const ALLOWED_FIELDS = [
        'first_name',
        'last_name',
        'middle_names',
        'forwarding_address',
        'name', // legacy field
        'company_name' // if explicitly allowed
    ];

    // EXPLICIT DENYLIST: These fields are NEVER allowed to be updated via profile endpoint
    const DENIED_FIELDS = [
        // Registered office address (immutable)
        'address_line1',
        'address_line2',
        'city',
        'state',
        'postal_code',
        'country',
        // Payment/mandate fields (webhook/admin only)
        'gocardless_mandate_id',
        'gocardless_customer_id',
        'gocardless_redirect_flow_id',
        'subscription_status',
        'plan_id',
        'plan_status',
        // Verification fields (admin/webhook only)
        'kyc_status',
        'kyc_verified_at',
        'kyc_verified_at_ms',
        'companies_house_verified',
        'ch_verification_status',
        // System fields
        'id',
        'created_at',
        'updated_at', // Updated automatically
        'last_login_at',
        'is_admin',
        'role',
        'status',
        'password',
        'password_reset_token',
        'password_reset_expires',
        'password_reset_used_at'
    ];

    // Check for denied fields first (fail fast)
    const deniedFields = Object.keys(req.body).filter(key => DENIED_FIELDS.includes(key));
    if (deniedFields.length > 0) {
        const fieldNames = deniedFields.join(', ');
        if (deniedFields.some(f => ['address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'].includes(f))) {
            return res.status(400).json({
                ok: false,
                error: 'registered_office_immutable',
                message: 'Registered office address cannot be changed here.'
            });
        }
        if (deniedFields.some(f => ['gocardless_mandate_id', 'gocardless_customer_id', 'gocardless_redirect_flow_id', 'subscription_status', 'plan_id', 'plan_status'].includes(f))) {
            return res.status(400).json({
                ok: false,
                error: 'payment_fields_immutable',
                message: 'Payment and mandate fields cannot be changed via profile endpoint.'
            });
        }
        return res.status(400).json({
            ok: false,
            error: 'field_not_allowed',
            message: `The following fields cannot be updated: ${fieldNames}`
        });
    }

    // Extract only allowed fields from request body
    // Note: email and phone updates should use /api/profile/contact endpoint
    const {
        name,
        first_name,
        last_name,
        middle_names,
        company_name,
        forwarding_address,
        // email and phone are not extracted here - they should use /api/profile/contact
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (first_name !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(first_name);
    }
    if (last_name !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(last_name);
    }
    // Check if middle_names column exists before trying to update it
    let hasMiddleNamesColumn = false;
    if (middle_names !== undefined) {
        try {
            const colCheck = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'middle_names'
            `);
            hasMiddleNamesColumn = colCheck.rows.length > 0;
            if (hasMiddleNamesColumn) {
                updates.push(`middle_names = $${paramIndex++}`);
                values.push(middle_names);
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    logger.debug('[PATCH /api/profile] middle_names column does not exist, skipping update');
                }
            }
        } catch (e) {
            logger.warn('[PATCH /api/profile] could_not_check_middle_names_column', { message: (e as any)?.message ?? String(e) });
        }
    }
    // Note: phone and email updates should use /api/profile/contact endpoint
    if (company_name !== undefined) {
        updates.push(`company_name = $${paramIndex++}`);
        values.push(company_name);
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
        // Get old values for audit log
        const oldUserResult = await pool.query('SELECT email, phone, forwarding_address FROM "user" WHERE id = $1', [userId]);
        const oldUser = oldUserResult.rows[0];

        const result = await pool.query(`
            UPDATE "user"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const newUser = result.rows[0];

        // Debug: Log saved forwarding snapshot
        const afterResult = await pool.query(`
            SELECT id, email, forwarding_address
            FROM "user" 
            WHERE id = $1
        `, [userId]);
        if (process.env.NODE_ENV !== 'production') {
            logger.debug("[profile] saved forwarding snapshot", {
                userId: afterResult.rows[0].id,
                hasForwardingAddress: Boolean(afterResult.rows[0].forwarding_address),
                forwardingAddressLinesCount: afterResult.rows[0].forwarding_address
                    ? String(afterResult.rows[0].forwarding_address).split('\n').length
                    : 0,
            });
        }

        // Log changes to activity_log for audit trail
        // Note: email and phone changes are logged in /api/profile/contact endpoint
        const changes: string[] = [];
        if (forwarding_address !== undefined && oldUser?.forwarding_address !== forwarding_address) {
            changes.push('forwarding_address updated');
        }

        if (changes.length > 0) {
            try {
                await pool.query(`
                    INSERT INTO activity_log (user_id, action, details, created_at)
                    VALUES ($1, $2, $3, $4)
                `, [
                    userId,
                    'profile.updated',
                    JSON.stringify({ changes, updated_fields: Object.keys(req.body) }),
                    Date.now()
                ]);
            } catch (auditError) {
                // Don't fail the request if audit logging fails
                logger.warn('[PATCH /api/profile] failed_to_log_activity_nonfatal', {
                    message: (auditError as any)?.message ?? String(auditError),
                });
            }
        }

        return res.json({ ok: true, data: newUser });
    } catch (error: any) {
        logger.error('[PATCH /api/profile] error', { message: error?.message ?? String(error) });
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PATCH /api/profile/me (legacy endpoint)
 * Update current user's profile (same as PATCH /api/profile)
 */
router.patch("/me", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();

    // Same allowlist/denylist as main endpoint
    const ALLOWED_FIELDS = [
        'first_name',
        'last_name',
        'middle_names',
        'phone',
        'email',
        'forwarding_address',
        'name',
        'company_name'
    ];

    const DENIED_FIELDS = [
        'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
        'gocardless_mandate_id', 'gocardless_customer_id', 'gocardless_redirect_flow_id',
        'subscription_status', 'plan_id', 'plan_status',
        'kyc_status', 'kyc_verified_at', 'kyc_verified_at_ms', 'companies_house_verified',
        'id', 'created_at', 'updated_at', 'last_login_at', 'is_admin', 'role', 'status',
        'password', 'password_reset_token', 'password_reset_expires', 'password_reset_used_at'
    ];

    // Check for denied fields
    const deniedFields = Object.keys(req.body).filter(key => DENIED_FIELDS.includes(key));
    if (deniedFields.length > 0) {
        const fieldNames = deniedFields.join(', ');
        if (deniedFields.some(f => ['address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'].includes(f))) {
            return res.status(400).json({
                ok: false,
                error: 'registered_office_immutable',
                message: 'Registered office address cannot be changed here.'
            });
        }
        if (deniedFields.some(f => ['gocardless_mandate_id', 'gocardless_customer_id', 'gocardless_redirect_flow_id', 'subscription_status', 'plan_id', 'plan_status'].includes(f))) {
            return res.status(400).json({
                ok: false,
                error: 'payment_fields_immutable',
                message: 'Payment and mandate fields cannot be changed via profile endpoint.'
            });
        }
        return res.status(400).json({
            ok: false,
            error: 'field_not_allowed',
            message: `The following fields cannot be updated: ${fieldNames}`
        });
    }

    const {
        name,
        first_name,
        last_name,
        middle_names,
        phone,
        email,
        company_name,
        forwarding_address
    } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (first_name !== undefined) {
        updates.push(`first_name = $${paramIndex++}`);
        values.push(first_name);
    }
    if (last_name !== undefined) {
        updates.push(`last_name = $${paramIndex++}`);
        values.push(last_name);
    }
    // Check if middle_names column exists before trying to update it
    let hasMiddleNamesColumnMe = false;
    if (middle_names !== undefined) {
        try {
            const colCheck = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'user' AND column_name = 'middle_names'
            `);
            hasMiddleNamesColumnMe = colCheck.rows.length > 0;
            if (hasMiddleNamesColumnMe) {
                updates.push(`middle_names = $${paramIndex++}`);
                values.push(middle_names);
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    logger.debug('[PATCH /api/profile/me] middle_names column does not exist, skipping update');
                }
            }
        } catch (e) {
            logger.warn('[PATCH /api/profile/me] could_not_check_middle_names_column', { message: (e as any)?.message ?? String(e) });
        }
    }
    if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
    }
    if (email !== undefined) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                ok: false,
                error: 'invalid_email',
                message: 'Please provide a valid email address.'
            });
        }
        // Check if email is already in use by another user
        const emailCheck = await pool.query(
            'SELECT id FROM "user" WHERE email = $1 AND id != $2',
            [email, userId]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({
                ok: false,
                error: 'email_already_in_use',
                message: 'This email address is already in use by another account.'
            });
        }
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
    }
    if (company_name !== undefined) {
        updates.push(`company_name = $${paramIndex++}`);
        values.push(company_name);
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
        // Get old values for audit log
        const oldUserResult = await pool.query('SELECT email, phone, forwarding_address FROM "user" WHERE id = $1', [userId]);
        const oldUser = oldUserResult.rows[0];

        const result = await pool.query(`
            UPDATE "user"
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'user_not_found' });
        }

        const newUser = result.rows[0];

        // Debug: Log saved forwarding snapshot after update
        const afterResult = await pool.query(`
            SELECT id, email, forwarding_address 
            FROM "user" 
            WHERE id = $1
        `, [userId]);
        if (process.env.NODE_ENV !== 'production') {
            logger.debug("[profile] saved forwarding snapshot", {
                userId: afterResult.rows[0]?.id,
                hasForwardingAddress: Boolean(afterResult.rows[0]?.forwarding_address),
                forwardingAddressLinesCount: afterResult.rows[0]?.forwarding_address
                    ? String(afterResult.rows[0].forwarding_address).split('\n').length
                    : 0,
            });
        }

        // Log changes to activity_log for audit trail
        const changes: string[] = [];
        if (email !== undefined && oldUser?.email !== email) {
            changes.push(`email: ${oldUser?.email || 'none'} → ${email}`);
        }
        if (phone !== undefined && oldUser?.phone !== phone) {
            changes.push(`phone: ${oldUser?.phone || 'none'} → ${phone}`);
        }
        if (forwarding_address !== undefined && oldUser?.forwarding_address !== forwarding_address) {
            changes.push('forwarding_address updated');
        }

        if (changes.length > 0) {
            try {
                await pool.query(`
                    INSERT INTO activity_log (user_id, action, details, created_at)
                    VALUES ($1, $2, $3, $4)
                `, [
                    userId,
                    'profile.updated',
                    JSON.stringify({ changes, updated_fields: Object.keys(req.body) }),
                    Date.now()
                ]);
            } catch (auditError) {
                // Don't fail the request if audit logging fails
                logger.warn('[PATCH /api/profile/me] failed_to_log_activity_nonfatal', {
                    message: (auditError as any)?.message ?? String(auditError),
                });
            }
        }

        return res.json({ ok: true, data: newUser });
    } catch (error: any) {
        logger.error('[PATCH /api/profile/me] error', { message: error?.message ?? String(error) });
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
        const compliance = await computeIdentityCompliance(user);

        // Gate the address - only return if KYC is approved AND all required owners verified
        const { isKycApproved } = await import('../services/kyc-guards');
        if (!isKycApproved(user.kyc_status)) {
            return res.status(403).json({
                ok: false,
                error: 'KYC_REQUIRED',
                message: 'You need to complete identity verification (KYC) before you can view and use your registered office address.',
                compliance,
            });
        }

        // Return the registered office address
        const { REGISTERED_OFFICE_ADDRESS, VAH_ADDRESS_INLINE } = await import('../../config/address');
        return res.json({
            ok: true,
            data: {
                line1: REGISTERED_OFFICE_ADDRESS.line1,
                line2: REGISTERED_OFFICE_ADDRESS.line2,
                city: REGISTERED_OFFICE_ADDRESS.city,
                postcode: REGISTERED_OFFICE_ADDRESS.postcode,
                country: REGISTERED_OFFICE_ADDRESS.country,
                inline: VAH_ADDRESS_INLINE,
            },
        });
    } catch (error: any) {
        logger.error('[GET /api/profile/registered-office-address] error', { message: error?.message ?? String(error) });
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
        res.setHeader('Content-Disposition', `attachment; filename="business-address-confirmation-${new Date().toISOString().split('T')[0]}.pdf"`);

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
            title: 18,
            body: 11.25,
            label: 10,
            small: 9.25,
        } as const;

        const BASE = {
            lineGap: 3,
            paragraphGap: 10,
            titleToDateGap: 10,
            afterDateGap: 16,
            cardPadding: 14,
            cardGap: 14,
            sectionGap: 10,
            signatureGap: 10,
            footerLineStep: 14,
        } as const;

        // Header block (logo + divider)
        const headerTop = 50;
        const headerHeight = 70;
        const headerBottom = headerTop + headerHeight;
        const logoX = contentX;
        const logoY = headerTop + 18;
        const logoWidth = 110;

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
                if (process.env.NODE_ENV !== 'production') {
                    logger.debug('[Certificate] loading_logo_from_VAH_LOGO_PATH', { configuredLogoPath });
                }
                doc.image(configuredLogoPath, logoX, logoY, { width: imgWidth });
                drewImage = true;
            } else {
                const logoUrlToTry = configuredLogoUrl || defaultRemoteLogoUrl;
                if (process.env.NODE_ENV !== 'production') {
                    logger.debug('[Certificate] fetching_logo_from_url', { logoUrlToTry });
                }
                try {
                    const logoBuf = await fetchLogoBuffer(logoUrlToTry);
                    doc.image(logoBuf, logoX, logoY, { width: imgWidth });
                    drewImage = true;
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug('[Certificate] drew_logo_from_url');
                    }
                } catch (error) {
                    logger.warn('[Certificate] fetch_logo_failed_fallback_to_local', {
                        message: (error as any)?.message ?? String(error),
                    });
                }

                if (!drewImage) {
                    const logoPath = configuredLogoPath || defaultLogoPath;
                    if (process.env.NODE_ENV !== 'production') {
                        logger.debug('[Certificate] attempting_local_logo_path', { logoPath });
                    }
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, logoX, logoY, { width: imgWidth });
                        drewImage = true;
                        if (process.env.NODE_ENV !== 'production') {
                            logger.debug('[Certificate] drew_logo_from_local_path');
                        }
                    } else if (fs.existsSync(alternativeLogoPath)) {
                        if (process.env.NODE_ENV !== 'production') {
                            logger.debug('[Certificate] trying_alternative_local_logo_path', { alternativeLogoPath });
                        }
                        doc.image(alternativeLogoPath, logoX, logoY, { width: imgWidth });
                        drewImage = true;
                        if (process.env.NODE_ENV !== 'production') {
                            logger.debug('[Certificate] drew_logo_from_alternative_local_path');
                        }
                    } else {
                        if (process.env.NODE_ENV !== 'production') {
                            logger.debug('[Certificate] no_local_logo_file_found');
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('[Certificate] logo_load_error', { message: (error as any)?.message ?? String(error) });
        }

        if (!drewImage) {
            if (process.env.NODE_ENV !== 'production') {
                logger.debug('[Certificate] falling_back_to_text_logo');
            }
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
        // IMPORTANT: PDFKit enforces a bottom margin for text flow (page.height - margins.bottom).
        // If we place footer text at/after that y, PDFKit will push it onto a new page.
        // So the footer must live inside the content box (above the bottom margin).
        const footerHeight = 110;
        const pageInnerBottom = pageHeight - ((doc as any).page.margins?.bottom ?? 50);
        const footerTop = pageInnerBottom - footerHeight;
        const contentTop = headerBottom + 30;
        const contentBottom = footerTop - 24;
        const availableH = contentBottom - contentTop;

        // Canonical: authorised company should be the user's company name
        const businessName = user.company_name || '—';
        const contactName = 'Customer Support';
        const signatureCompany = 'VirtualAddressHub Ltd';
        const supportEmail = 'support@virtualaddresshub.co.uk';

        const { VAH_ADDRESS_INLINE } = await import('../../config/address');
        const registeredBusinessAddress = VAH_ADDRESS_INLINE;

        const statement1 = 'This letter confirms that the company named above is authorised to use the registered business address specified above as its Registered Office Address for Companies House purposes and for the receipt of official correspondence from HM Revenue & Customs (HMRC). This authorisation does not confer any tenancy, lease, or right of physical occupation, and remains valid only while the company maintains an active subscription and complies with applicable UK Anti-Money Laundering (AML), Know Your Customer (KYC), and General Data Protection Regulation (GDPR) requirements.';
        const statement2 = '';
        const note1 = 'This document is provided for business address verification purposes only.';
        const note2 = '';

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
            const cardPadding = (BASE as any).cardPadding * scale;
            const cardGap = (BASE as any).cardGap * scale;
            const sectionGap = (BASE as any).sectionGap * scale;
            const signatureGap = (BASE as any).signatureGap * scale;
            const footerLineStep = BASE.footerLineStep * scale;

            const h = (text: string, font: string, fontSize: number, width: number) => {
                doc.font(font as any).fontSize(fontSize);
                return doc.heightOfString(text, { width, lineGap });
            };

            const innerW = contentW - cardPadding * 2;
            const fieldGap = 8 * scale;

            const hField = (label: string, value: string) => {
                // label (small) + value (body)
                return (
                    h(label, FONT.bold, TYPE.small, innerW) +
                    (2 * scale) +
                    h(value, FONT.regular, TYPE.body, innerW) +
                    fieldGap
                );
            };

            const verifiedCardH =
                cardPadding +
                h('Verified details', FONT.bold, TYPE.small, innerW) +
                (10 * scale) +
                hField('Registered Office Address', registeredBusinessAddress) +
                hField('Authorised Company', businessName) +
                hField('Issued by', signatureCompany) +
                hField('Date of issue', currentDate) +
                (cardPadding - fieldGap);

            const notesCardH =
                cardPadding +
                h('Important notes', FONT.bold, TYPE.small, innerW) +
                (8 * scale) +
                h(note1, FONT.regular, TYPE.small, innerW) +
                cardPadding;

            // Title + cards + statements + signature (date issued appears once in Verified details)
            let total = 0;
            total += h('Business Address Confirmation', FONT.bold, TYPE.title, contentW);
            total += titleToDateGap;
            total += afterDateGap;

            total += verifiedCardH;
            total += cardGap;

            total += h(statement1, FONT.regular, TYPE.body, contentW) + cardGap;

            total += notesCardH;
            total += cardGap;

            total += h(signatureCompany, FONT.bold, TYPE.body, contentW) + signatureGap;
            total += h(contactName, FONT.regular, TYPE.small, contentW) + (2 * scale);
            total += h(supportEmail, FONT.regular, TYPE.small, contentW);

            return {
                total,
                TYPE,
                lineGap,
                paragraphGap,
                titleToDateGap,
                afterDateGap,
                cardPadding,
                cardGap,
                sectionGap,
                signatureGap,
                footerLineStep,
            };
        };

        let chosen = measure(1.0);
        for (const s of [0.97, 0.94, 0.91, 0.88, 0.85, 0.82]) {
            if (chosen.total <= availableH) break;
            chosen = measure(s);
        }

        if (chosen.total > availableH) {
            logger.warn('[Certificate] content_still_exceeds_single_page_target_clamping');
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

        const writeField = (label: string, value: string, x: number, width: number) => {
            doc.fillColor(COLORS.muted)
                .fontSize(TYPE.small)
                .font(FONT.regular)
                .text(label, x, doc.y, { width, lineGap: chosen.lineGap });
            doc.y += 2;
            doc.fillColor(COLORS.text)
                .fontSize(TYPE.body)
                .font(FONT.bold)
                .text(value, x, doc.y, { width, lineGap: chosen.lineGap });
            doc.y += 10;
        };

        // Start main content (fits in one page above footer)
        doc.y = contentTop;

        // Title block
        doc.fillColor(COLORS.text)
            .fontSize(TYPE.title)
            .font(FONT.bold)
            .text('Business Address Confirmation', contentX, doc.y, { width: contentW });
        doc.y += chosen.titleToDateGap;
        doc.y += chosen.afterDateGap;

        // Verified details card
        const cardX = contentX;
        const cardY = doc.y;
        const cardW = contentW;
        const pad = chosen.cardPadding;
        const innerX = cardX + pad;
        const innerW = cardW - pad * 2;

        const calcVerifiedCardHeight = () => {
            const h = (text: string, font: string, fontSize: number, width: number) => {
                doc.font(font as any).fontSize(fontSize);
                return doc.heightOfString(text, { width, lineGap: chosen.lineGap });
            };
            const fieldGap = 10;
            const hf = (label: string, value: string) =>
                h(label, FONT.regular, TYPE.small, innerW) + 2 + h(value, FONT.bold, TYPE.body, innerW) + fieldGap;
            return pad + h('Verified details', FONT.bold, TYPE.small, innerW) + 10 + hf('Registered Office Address', registeredBusinessAddress) + hf('Authorised Company', businessName) + hf('Issued by', signatureCompany) + hf('Date of issue', currentDate) + (pad - fieldGap);
        };

        const cardH = calcVerifiedCardHeight();
        doc.save();
        doc.roundedRect(cardX, cardY, cardW, cardH, 8).fill('#FFFFFF').stroke(COLORS.border);
        doc.restore();

        doc.y = cardY + pad;
        doc.fillColor(COLORS.muted).fontSize(TYPE.small).font(FONT.bold).text('Verified details', innerX, doc.y, { width: innerW, lineGap: chosen.lineGap });
        doc.y += 10;
        writeField('Registered Office Address', registeredBusinessAddress, innerX, innerW);
        writeField('Authorised Company', businessName, innerX, innerW);
        writeField('Issued by', signatureCompany, innerX, innerW);
        writeField('Date of issue', currentDate, innerX, innerW);
        doc.y = cardY + cardH + chosen.cardGap;

        // Statements
        writeParagraph(statement1, { color: COLORS.body, gapAfter: chosen.cardGap });

        // Notes card
        const notesY = doc.y;
        const calcNotesHeight = () => {
            const h = (text: string, font: string, fontSize: number, width: number) => {
                doc.font(font as any).fontSize(fontSize);
                return doc.heightOfString(text, { width, lineGap: chosen.lineGap });
            };
            return pad + h('Important notes', FONT.bold, TYPE.small, innerW) + 8 + h(note1, FONT.regular, TYPE.small, innerW) + pad;
        };
        const notesH = calcNotesHeight();
        doc.save();
        doc.roundedRect(cardX, notesY, cardW, notesH, 8).fill(COLORS.footerBg).stroke(COLORS.border);
        doc.restore();
        doc.y = notesY + pad;
        doc.fillColor(COLORS.muted).fontSize(TYPE.small).font(FONT.bold).text('Important notes', innerX, doc.y, { width: innerW, lineGap: chosen.lineGap });
        doc.y += 8;
        doc.fillColor(COLORS.muted).fontSize(TYPE.small).font(FONT.regular).text(note1, innerX, doc.y, { width: innerW, lineGap: chosen.lineGap });
        doc.y = notesY + notesH + chosen.cardGap;

        // Signature (simple)
        doc.fillColor(COLORS.text)
            .fontSize(TYPE.body)
            .font(FONT.bold)
            .text(signatureCompany, contentX, doc.y, { width: contentW });
        doc.y += chosen.signatureGap;
        doc.fillColor(COLORS.muted)
            .fontSize(TYPE.small)
            .font(FONT.regular)
            .text(contactName, contentX, doc.y, { width: contentW });
        doc.y += (TYPE.small + 4);
        doc.text(supportEmail, contentX, doc.y, { width: contentW });

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
            .text(registeredBusinessAddress, footerTextX, fy, { width: footerTextW, align: 'center' });
        fy += chosen.footerLineStep;

        doc.text('support@virtualaddresshub.co.uk · www.virtualaddresshub.co.uk', footerTextX, fy, { width: footerTextW, align: 'center' });
        fy += chosen.footerLineStep;

        doc.fillColor('#9CA3AF') // gray-400
            .text('Registered in England', footerTextX, fy, { width: footerTextW, align: 'center' });

        // Finalize PDF
        doc.end();

    } catch (error: any) {
        logger.error('[GET /api/profile/certificate] error', { message: error?.message ?? String(error) });
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
        logger.error('[GET /api/profile/ch-verification] error', { message: error?.message ?? String(error) });
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

        // SECURITY: Validate file using magic bytes (prevents Content-Type spoofing)
        const validation = await validateFileMagicBytes(req.file.buffer, req.file.originalname);
        if (!validation.valid) {
            logger.warn('[POST /api/profile/ch-verification] file_validation_failed', {
                userId,
                filename: req.file.originalname,
                mimetype: req.file.mimetype,
                error: validation.error,
            });
            return res.status(400).json({
                ok: false,
                error: 'invalid_file',
                message: validation.error || 'File validation failed. Only PDF and image files are allowed.'
            });
        }

        // File is valid - save to disk
        const uploadDir = path.join(process.cwd(), 'data', 'ch-verification');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname);
        const filename = `ch-verification-${userId}-${timestamp}${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Write validated file to disk
        // req.file.buffer is already a Buffer from multer memoryStorage
        // Convert to Uint8Array for TypeScript compatibility
        const fileData = new Uint8Array(req.file.buffer);
        await fs.promises.writeFile(filePath, fileData);

        // Build the proof URL (relative path or full URL depending on your setup)
        const proofUrl = `/api/profile/media/ch-verification/${filename}`;
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
        logger.error('[POST /api/profile/ch-verification] error', { message: error?.message ?? String(error) });
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
        logger.error('[GET /api/media/ch-verification/:filename] error', { message: error?.message ?? String(error) });
        return res.status(500).json({ ok: false, error: 'file_serve_error', message: error.message });
    }
});

/**
 * PATCH /api/profile/controllers
 * Update controllers declaration
 * 
 * Body:
 * {
 *   "isSoleController": boolean,
 *   "additionalControllersCount"?: number | null
 * }
 * 
 * Validation:
 * - If isSoleController === true: additionalControllersCount must be null or 0
 * - If isSoleController === false: additionalControllersCount can be null (unknown) or >= 1
 */
router.patch("/controllers", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const pool = getPool();
    const { isSoleController, additionalControllersCount } = req.body;

    // Validate required field
    if (isSoleController === undefined || typeof isSoleController !== 'boolean') {
        return res.status(400).json({
            ok: false,
            error: 'validation_error',
            message: 'isSoleController is required and must be a boolean.',
        });
    }

    // Validate and normalize additionalControllersCount
    let normalizedCount: number | null = null;

    if (isSoleController === true) {
        // If sole controller, count must be null or 0
        if (additionalControllersCount !== null && additionalControllersCount !== undefined && additionalControllersCount !== 0) {
            return res.status(400).json({
                ok: false,
                error: 'validation_error',
                message: 'If you are the sole controller, additionalControllersCount must be null or 0.',
            });
        }
        normalizedCount = null;
    } else {
        // If not sole controller, count can be null (unknown) or >= 1
        if (additionalControllersCount !== null && additionalControllersCount !== undefined) {
            const count = Number(additionalControllersCount);
            if (isNaN(count) || count < 1) {
                return res.status(400).json({
                    ok: false,
                    error: 'validation_error',
                    message: 'If there are other controllers, additionalControllersCount must be at least 1.',
                });
            }
            normalizedCount = count;
        } else {
            normalizedCount = null; // Unknown is allowed
        }
    }

    try {
        // Update user row
        await pool.query(
            `UPDATE "user" 
             SET is_sole_controller = $1,
                 additional_controllers_count = $2,
                 controllers_declared_at = NOW(),
                 updated_at = $3
             WHERE id = $4`,
            [isSoleController, normalizedCount, Date.now(), userId]
        );

        // Get updated user data
        const result = await pool.query(
            `SELECT is_sole_controller, additional_controllers_count, controllers_declared_at
             FROM "user"
             WHERE id = $1`,
            [userId]
        );

        const user = result.rows[0];
        const controllersVerificationRequired = user.is_sole_controller === false;

        return res.json({
            ok: true,
            data: {
                is_sole_controller: user.is_sole_controller,
                additional_controllers_count: user.additional_controllers_count,
                controllers_declared_at: user.controllers_declared_at,
                controllers_verification_required: controllersVerificationRequired,
            },
        });
    } catch (error: any) {
        logger.error('[PATCH /api/profile/controllers] error', { message: error?.message ?? String(error) });
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message,
        });
    }
});

export default router;
