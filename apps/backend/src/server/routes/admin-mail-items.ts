// src/server/routes/admin-mail-items.ts
// Admin mail items management endpoints

import { Router, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Rate limiting for admin mail items - more generous for admin usage
const adminMailItemsLimiter = rateLimit({
    windowMs: 10_000, // 10 seconds
    limit: 30, // 30 requests per 10 seconds (more generous than forwarding)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as any).user;
        return u?.id ? `admin:${u.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
        res.setHeader("Retry-After", "3");
        return res.status(429).json({ ok: false, error: "rate_limited" });
    },
});

// Request coalescing cache to prevent duplicate requests
type Key = string;
const inflight = new Map<Key, Promise<any>>();
const COALESCE_TTL_MS = 2_000; // Reduced to 2 seconds for faster response

function keyFrom(req: Request): Key {
    const u = (req as any).user;
    const id = u?.id ?? "anon";
    // Normalize query params by sorting to handle different ordering
    const sortedQuery = Object.entries(req.query as Record<string, string>).sort();
    const qp = new URLSearchParams(sortedQuery).toString();
    return `${id}:${req.path}?${qp}`;
}

/**
 * GET /api/admin/mail-items
 * Get all mail items (admin only)
 */
router.get('/mail-items', requireAdmin, adminMailItemsLimiter, async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, max-age=5");

    const key = keyFrom(req);
    if (inflight.has(key)) {
        console.log(`[admin-mail-items] Coalescing request for key: ${key}`);
        try {
            const result = await inflight.get(key)!;
            return res.json(result);
        } catch {
            // fall through to fresh execution
        }
    }

    const exec = (async () => {
        const pool = getPool();
        const { status, user_id, limit = '100', offset = '0' } = req.query;

        const limitNum = parseInt(limit as string) || 100;
        const offsetNum = parseInt(offset as string) || 0;

        try {
            let query = `
            SELECT
                m.id,
                m.user_id,
                m.subject,
                m.sender_name,
                m.tag,
                m.status,
                m.forwarding_status,
                m.created_at,
                m.received_date,
                m.received_at_ms,
                m.scanned,
                m.deleted,
                m.file_size,
                m.scan_file_url,
                m.physical_destruction_date,
                m.expires_at,
                u.email as user_email,
                u.first_name,
                u.last_name,
                f.name as file_name,
                f.size as file_size,
                f.web_url as file_url,
                -- Calculate days until/past 30-day expiry
                -- Use received_at_ms first (most accurate), then received_date, then created_at as fallback
                CASE 
                    WHEN m.received_at_ms IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days' - now())) / 86400
                    WHEN m.received_date IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (m.received_date::timestamptz + INTERVAL '30 days' - now())) / 86400
                    WHEN m.created_at IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (to_timestamp(m.created_at / 1000) + INTERVAL '30 days' - now())) / 86400
                    ELSE NULL
                END as days_until_deletion,
                -- Check if past 30 days (same fallback logic)
                -- Uses >= so items on day 30 are considered past 30 days
                CASE 
                    WHEN m.received_at_ms IS NOT NULL AND (now() - to_timestamp(m.received_at_ms / 1000)) >= INTERVAL '30 days' THEN true
                    WHEN m.received_date IS NOT NULL AND (now() - m.received_date::timestamptz) >= INTERVAL '30 days' THEN true
                    WHEN m.created_at IS NOT NULL AND (now() - to_timestamp(m.created_at / 1000)) >= INTERVAL '30 days' THEN true
                    ELSE false
                END as past_30_days
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            WHERE m.deleted = false
            AND (
                -- Include scanned items OR items with files OR items with scan URLs
                (m.scanned = true OR m.scan_file_url IS NOT NULL OR f.id IS NOT NULL)
                -- OR include items that have dates (even if not marked scanned) - they might need destruction
                OR (m.received_at_ms IS NOT NULL OR m.received_date IS NOT NULL OR m.created_at IS NOT NULL)
            )
            AND (m.received_at_ms IS NOT NULL OR m.received_date IS NOT NULL OR m.created_at IS NOT NULL)
        `;

            const params: any[] = [];
            let paramIndex = 1;

            if (status && status !== 'all') {
                query += ` AND m.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (user_id) {
                query += ` AND m.user_id = $${paramIndex}`;
                params.push(parseInt(user_id as string));
                paramIndex++;
            }

            query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limitNum, offsetNum);

            const result = await pool.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) FROM mail_item m WHERE m.deleted = false';
            const countParams: any[] = [];
            let countParamIndex = 1;

            if (status && status !== 'all') {
                countQuery += ` AND m.status = $${countParamIndex}`;
                countParams.push(status);
                countParamIndex++;
            }

            if (user_id) {
                countQuery += ` AND m.user_id = $${countParamIndex}`;
                countParams.push(parseInt(user_id as string));
                countParamIndex++;
            }

            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].count);

            return {
                ok: true,
                items: result.rows,
                total: total,
                data: result.rows, // Keep for backward compatibility
                pagination: {
                    limit: limitNum,
                    offset: offsetNum,
                    total
                }
            };
        } catch (error: any) {
            console.error('[GET /api/admin/mail-items] error:', error);
            throw error;
        }
    })();

    inflight.set(key, exec);
    try {
        const result = await exec;
        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    } finally {
        setTimeout(() => inflight.delete(key), COALESCE_TTL_MS);
    }
});

/**
 * GET /api/admin/mail-items/:id
 * Get specific mail item (admin only)
 */
router.get('/mail-items/:id', requireAdmin, async (req: Request, res: Response) => {
    const mailId = parseInt(req.params.id);
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        const result = await pool.query(`
            SELECT
                m.*,
                u.email as user_email,
                u.first_name,
                u.last_name,
                u.phone,
                f.name as file_name,
                f.size as file_size,
                f.web_url as file_url,
                f.mime as file_mime,
                -- Get admin who marked as destroyed
                admin_user.email as destroyed_by_email,
                admin_user.first_name as destroyed_by_first_name,
                admin_user.last_name as destroyed_by_last_name,
                admin_audit.created_at as destroyed_by_at
            FROM mail_item m
            JOIN "user" u ON m.user_id = u.id
            LEFT JOIN file f ON m.file_id = f.id
            LEFT JOIN admin_audit ON admin_audit.target_type = 'mail_item' 
                AND admin_audit.target_id = m.id 
                AND admin_audit.action = 'physical_destruction_confirmed'
            LEFT JOIN "user" admin_user ON admin_user.id = admin_audit.admin_id
            WHERE m.id = $1
        `, [mailId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[GET /api/admin/mail-items/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * PUT /api/admin/mail-items/:id
 * Update mail item (admin only)
 */
router.put('/mail-items/:id', requireAdmin, async (req: Request, res: Response) => {
    const mailId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    const {
        status,
        subject,
        sender_name,
        tag,
        notes,
        forwarding_status
    } = req.body;

    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (typeof status === 'string') {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (typeof subject === 'string') {
            updates.push(`subject = $${paramIndex++}`);
            values.push(subject);
        }

        if (typeof sender_name === 'string') {
            updates.push(`sender_name = $${paramIndex++}`);
            values.push(sender_name);
        }

        if (typeof tag === 'string') {
            updates.push(`tag = $${paramIndex++}`);
            values.push(tag);
        }

        if (typeof notes === 'string') {
            updates.push(`notes = $${paramIndex++}`);
            values.push(notes);
        }

        if (typeof forwarding_status === 'string') {
            updates.push(`forwarding_status = $${paramIndex++}`);
            values.push(forwarding_status);
        }

        updates.push(`updated_by = $${paramIndex++}`);
        values.push(adminId);

        updates.push(`updated_at = $${paramIndex++}`);
        values.push(Date.now());

        values.push(mailId);

        if (updates.length === 2) { // Only updated_by and updated_at
            return res.status(400).json({ ok: false, error: 'no_changes' });
        }

        const result = await pool.query(
            `UPDATE mail_item SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'update_mail_item', 'mail_item', $2, $3, $4)
        `, [adminId, mailId, JSON.stringify(req.body), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[PUT /api/admin/mail-items/:id] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/admin/mail-items/:id/log-physical-dispatch
 * Log physical dispatch for mail item (admin only)
 */
router.post('/mail-items/:id/log-physical-dispatch', requireAdmin, async (req: Request, res: Response) => {
    const mailId = parseInt(req.params.id);
    const adminId = req.user!.id;
    const { tracking_number, courier, dispatched_at } = req.body;
    const pool = getPool();

    if (!mailId) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    try {
        // Build dispatch notes
        const dispatchNotes = [
            'Physically dispatched',
            tracking_number ? `Tracking: ${tracking_number}` : '',
            courier ? `Courier: ${courier}` : '',
            dispatched_at ? `Dispatched at: ${new Date(dispatched_at).toISOString()}` : ''
        ].filter(Boolean).join('\n');

        const result = await pool.query(`
            UPDATE mail_item
            SET
                forwarded_physically = true,
                status = 'dispatched',
                notes = COALESCE(notes, '') || $1,
                updated_by = $2,
                updated_at = $3
            WHERE id = $4
            RETURNING *
        `, ['\n' + dispatchNotes, adminId, Date.now(), mailId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const mail = result.rows[0];

        // Create notification for user
        await pool.query(`
            INSERT INTO notification (user_id, type, title, body, read, created_at)
            VALUES ($1, 'mail_dispatched', 'Mail Dispatched', $2, false, $3)
        `, [
            mail.user_id,
            `Your mail has been physically dispatched${tracking_number ? ` (Tracking: ${tracking_number})` : ''}.`,
            Date.now()
        ]);

        // Log admin action
        await pool.query(`
            INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
            VALUES ($1, 'log_physical_dispatch', 'mail_item', $2, $3, $4)
        `, [adminId, mailId, JSON.stringify({ tracking_number, courier, dispatched_at }), Date.now()]);

        return res.json({ ok: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('[POST /api/admin/mail-items/:id/log-physical-dispatch] error:', error);
        return res.status(500).json({ ok: false, error: 'database_error', message: error.message });
    }
});

/**
 * POST /api/admin/mail-items/:id/mark-destroyed
 * Mark physical mail as destroyed (admin only)
 * Required for HMRC AML compliance - tracks physical destruction confirmation
 * 
 * COMPLIANCE REQUIREMENTS:
 * - Validates eligibility_date has passed before allowing destruction
 * - Creates admin_audit record for audit trail
 * - Creates destruction_log record with all required compliance fields
 * - Prevents duplicate destruction records (UNIQUE constraint on mail_item_id)
 */
router.post('/mail-items/:id/mark-destroyed', requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const pool = getPool();
    const adminUser = (req as any).user;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ ok: false, error: 'invalid_id' });
    }

    // HARD REQUIREMENT: Admin authentication is mandatory - no fallbacks allowed
    if (!adminUser || !adminUser.id) {
        console.error('[MARK DESTROYED] Rejected: No admin user in request context');
        return res.status(403).json({ 
            ok: false, 
            error: 'admin_authentication_required',
            message: 'Admin authentication required to destroy mail'
        });
    }

    const mailItemId = parseInt(id);
    const adminId = adminUser.id;
    const RETENTION_DAYS = 30; // GDPR retention period

    try {
        console.log('[MARK DESTROYED] Starting destruction request', { mailItemId, adminUserId: req.user?.id });
        
        // Step 1: Fetch mail item with all required data
        const fetchResult = await pool.query(
            `
            SELECT 
                m.id,
                m.user_id,
                m.received_at_ms,
                m.received_date,
                m.created_at,
                m.deleted,
                m.status,
                m.subject,
                m.sender_name,
                u.first_name AS user_first_name,
                u.last_name AS user_last_name,
                u.email AS user_email,
                u.company_name,
                u.is_admin AS user_is_admin
            FROM mail_item m
            JOIN "user" u ON u.id = m.user_id
            WHERE m.id = $1
            `,
            [mailItemId]
        );

        if (fetchResult.rows.length === 0) {
            console.error('[MARK DESTROYED] Mail item not found', { mailItemId });
            return res.status(404).json({ ok: false, error: 'mail_item_not_found' });
        }

        const mailItem = fetchResult.rows[0];

        // Prevent destroying mail for internal staff accounts
        if (mailItem.user_is_admin) {
            console.error('[MARK DESTROYED] Rejected: Cannot destroy mail for internal staff', { mailItemId, userId: mailItem.user_id });
            return res.status(400).json({ 
                ok: false, 
                error: 'invalid_destruction_target',
                message: 'Cannot destroy mail for internal staff accounts'
            });
        }

        // Step 2: Calculate receipt_date and eligibility_date
        let receiptDate: Date | null = null;
        if (mailItem.received_at_ms) {
            // received_at_ms is BIGINT (milliseconds since epoch)
            // PostgreSQL may return it as string for large numbers, so parse it
            const ms = typeof mailItem.received_at_ms === 'string' 
                ? parseInt(mailItem.received_at_ms, 10) 
                : mailItem.received_at_ms;
            receiptDate = new Date(ms);
        } else if (mailItem.received_date) {
            // received_date is TEXT (YYYY-MM-DD format)
            receiptDate = new Date(mailItem.received_date);
        } else if (mailItem.created_at) {
            // created_at is BIGINT (milliseconds since epoch)
            const ms = typeof mailItem.created_at === 'string' 
                ? parseInt(mailItem.created_at, 10) 
                : mailItem.created_at;
            receiptDate = new Date(ms);
        }

        if (!receiptDate || isNaN(receiptDate.getTime())) {
            console.error('[MARK DESTROYED] Rejected: Missing receipt date', { 
                mailItemId, 
                received_at_ms: mailItem.received_at_ms,
                received_at_ms_type: typeof mailItem.received_at_ms,
                received_date: mailItem.received_date,
                created_at: mailItem.created_at,
                created_at_type: typeof mailItem.created_at
            });
            return res.status(400).json({ 
                ok: false, 
                error: 'missing_receipt_date',
                message: 'Mail item must have a receipt date to be destroyed'
            });
        }

        // Calculate eligibility date (receipt_date + retention_days)
        const eligibilityDate = new Date(receiptDate);
        eligibilityDate.setDate(eligibilityDate.getDate() + RETENTION_DAYS);

        // Step 3: Validate eligibility_date has passed
        const now = new Date();
        if (eligibilityDate > now) {
            const daysRemaining = Math.ceil((eligibilityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            console.error('[MARK DESTROYED] Rejected: Not eligible yet', { 
                mailItemId,
                receiptDate: receiptDate.toISOString().split('T')[0],
                eligibilityDate: eligibilityDate.toISOString().split('T')[0],
                daysRemaining
            });
            return res.status(400).json({ 
                ok: false, 
                error: 'not_eligible_for_destruction',
                message: `Mail is not eligible for destruction yet. Eligibility date: ${eligibilityDate.toISOString().split('T')[0]} (${daysRemaining} days remaining)`
            });
        }

        // Step 4: Check if already destroyed (prevent duplicates)
        const existingDestruction = await pool.query(
            `SELECT id FROM destruction_log WHERE mail_item_id = $1`,
            [mailItemId]
        );

        if (existingDestruction.rows.length > 0) {
            console.error('[MARK DESTROYED] Rejected: Already destroyed', { mailItemId, existingId: existingDestruction.rows[0].id });
            return res.status(400).json({ 
                ok: false, 
                error: 'already_destroyed',
                message: 'This mail item has already been logged as destroyed'
            });
        }

        // Step 5: Get admin user details for staff attribution (MANDATORY - no fallbacks)
        const adminResult = await pool.query(
            `
            SELECT 
                id,
                first_name,
                last_name,
                email,
                is_admin
            FROM "user"
            WHERE id = $1 AND is_admin = TRUE
            `,
            [adminId]
        );

        if (adminResult.rows.length === 0) {
            console.error('[MARK DESTROYED] Rejected: Admin user not found or not authorized', { adminId });
            return res.status(403).json({ 
                ok: false, 
                error: 'admin_authentication_required',
                message: 'Admin authentication required to destroy mail'
            });
        }

        const admin = adminResult.rows[0];

        // VALIDATION: Admin must have identifiable name - NO FALLBACKS TO "Unknown"
        if (!admin.first_name && !admin.last_name && !admin.email) {
            console.error('[MARK DESTROYED] Rejected: Admin user has no identifiable name', { adminId, admin });
            return res.status(500).json({ 
                ok: false, 
                error: 'admin_identity_incomplete',
                message: 'Admin user account is missing required identity information. Cannot proceed with destruction logging.'
            });
        }

        // Build staff name - explicit validation, no fallbacks
        let staffName: string;
        if (admin.first_name && admin.last_name) {
            staffName = `${admin.first_name} ${admin.last_name}`;
        } else if (admin.first_name) {
            staffName = admin.first_name;
        } else if (admin.last_name) {
            staffName = admin.last_name;
        } else if (admin.email) {
            // Use email as last resort, but extract name part if possible
            const emailName = admin.email.split('@')[0];
            staffName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        } else {
            // This should never happen due to check above, but TypeScript needs it
            throw new Error('Admin identity validation failed: no name or email available');
        }

        // Build staff initials - explicit validation, no fallbacks
        let staffInitials: string;
        if (admin.first_name && admin.last_name) {
            staffInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
        } else if (admin.first_name) {
            staffInitials = admin.first_name.substring(0, 2).toUpperCase().padEnd(2, admin.first_name[0]);
        } else if (admin.last_name) {
            staffInitials = admin.last_name.substring(0, 2).toUpperCase().padEnd(2, admin.last_name[0]);
        } else if (admin.email) {
            const emailPrefix = admin.email.split('@')[0];
            staffInitials = emailPrefix.substring(0, 2).toUpperCase().padEnd(2, emailPrefix[0]);
        } else {
            // This should never happen due to check above
            throw new Error('Admin identity validation failed: cannot derive initials');
        }

        // GUARD: Ensure we never write "Unknown" or "UN"
        if (staffName.toLowerCase().includes('unknown') || staffInitials === 'UN') {
            console.error('[MARK DESTROYED] Rejected: Staff attribution would be "Unknown"', { adminId, staffName, staffInitials });
            return res.status(500).json({ 
                ok: false, 
                error: 'staff_attribution_invalid',
                message: 'Cannot determine staff identity for destruction logging. Admin account must have name or email.'
            });
        }

        // Step 6: Generate user display name (never show internal staff)
        const userDisplayName = mailItem.company_name 
            || (mailItem.user_first_name && mailItem.user_last_name 
                ? `${mailItem.user_first_name} ${mailItem.user_last_name}`
                : mailItem.user_first_name || mailItem.user_last_name || mailItem.user_email || `User #${mailItem.user_id}`);

        // Step 7: Generate factual notes explaining WHY destruction occurred
        const notes = `30-day retention period expired with no forwarding request. Eligibility date: ${eligibilityDate.toISOString().split('T')[0]}`;

        // Step 8: Begin transaction for atomic operations
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 8a: Create admin_audit record
            await client.query(
                `
                INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                `,
                [
                    adminId,
                    'physical_destruction_confirmed',
                    'mail_item',
                    mailItemId,
                    JSON.stringify({
                        receipt_date: receiptDate.toISOString().split('T')[0],
                        eligibility_date: eligibilityDate.toISOString().split('T')[0],
                        retention_days: RETENTION_DAYS
                    }),
                    Date.now()
                ]
            );

            // 8b: Create destruction_log record with actor attribution
            await client.query(
                `
                INSERT INTO destruction_log (
                    mail_item_id,
                    user_id,
                    user_display_name,
                    receipt_date,
                    eligibility_date,
                    recorded_at,
                    destruction_status,
                    actor_type,
                    action_source,
                    staff_user_id,
                    staff_name,
                    staff_initials,
                    notes,
                    destruction_method
                ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13)
                `,
                [
                    mailItemId,
                    mailItem.user_id,
                    userDisplayName,
                    receiptDate.toISOString().split('T')[0],
                    eligibilityDate.toISOString().split('T')[0],
                    'completed',
                    'admin', // actor_type: manual admin action
                    'admin_ui', // action_source: from admin dashboard
                    adminId, // staff_user_id: authenticated admin
                    staffName,
                    staffInitials,
                    notes,
                    'Cross-cut shredder'
                ]
            );

            // 8c: Update mail_item with physical_destruction_date
            await client.query(
                `
                UPDATE mail_item
                SET physical_destruction_date = NOW(),
                    destruction_logged = TRUE,
                    updated_at = $1
                WHERE id = $2
                `,
                [Date.now(), mailItemId]
            );

            // Commit transaction
            await client.query('COMMIT');

            console.log('[MARK DESTROYED] Successfully logged destruction', {
                mailItemId,
                adminId,
                staffName,
                eligibilityDate: eligibilityDate.toISOString().split('T')[0]
            });

            return res.json({ ok: true });
        } catch (txError: any) {
            console.error('[MARK DESTROYED] Transaction error, rolling back:', txError);
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError: any) {
                console.error('[MARK DESTROYED] Rollback failed:', rollbackError);
            }
            throw txError;
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('[MARK DESTROYED FAILED]', error);
        
        // Handle unique constraint violation (duplicate)
        if (error.code === '23505' && error.constraint === 'unique_mail_item_destruction') {
            return res.status(400).json({
                ok: false,
                error: 'already_destroyed',
                message: 'This mail item has already been logged as destroyed'
            });
        }

        // Handle CHECK constraint violations (e.g., "Unknown" staff_name)
        if (error.code === '23514') {
            const constraintName = error.constraint || '';
            if (constraintName.includes('staff_name') || constraintName.includes('staff_initials')) {
                return res.status(400).json({
                    ok: false,
                    error: 'invalid_staff_attribution',
                    message: 'Invalid staff attribution. Staff name and initials cannot be "Unknown" or "UN".',
                    details: error.message
                });
            }
            if (constraintName.includes('admin_action_requires_staff_user')) {
                return res.status(400).json({
                    ok: false,
                    error: 'invalid_actor_type',
                    message: 'Admin actions must have staff_user_id. System actions must have staff_user_id = NULL.',
                    details: error.message
                });
            }
            return res.status(400).json({
                ok: false,
                error: 'constraint_violation',
                message: 'Database constraint violation',
                details: error.message,
                constraint: constraintName
            });
        }

        // Handle foreign key violations
        if (error.code === '23503') {
        return res.status(400).json({
                ok: false,
                error: 'invalid_reference',
                message: 'Invalid reference to related record',
                details: error.message
            });
        }

        // Return 500 for unexpected errors
        console.error('[MARK DESTROYED FAILED] Full error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            constraint: error.constraint,
            detail: error.detail,
            hint: error.hint,
            mailItemId,
            adminId
        });
        
        return res.status(500).json({
            ok: false,
            error: 'destruction_logging_failed',
            message: error.message || 'Failed to log destruction',
            code: error.code,
            constraint: error.constraint,
            detail: error.detail,
            hint: error.hint
        });
    }
});

/**
 * POST /api/admin/mail-items/test-excel-write
 * Test endpoint to verify Excel destruction log write functionality
 * This endpoint runs the test script that appends a row to the Excel table
 */
router.post('/mail-items/test-excel-write', requireAdmin, async (_req: Request, res: Response) => {
    try {
        // Dynamically import the test script function
        const { appendRowToExcelTable } = await import('../../jobs/testDestructionLogWrite');

        const result = await appendRowToExcelTable();

        return res.json({
            ok: true,
            message: 'Test Excel write completed successfully',
            result
        });
    } catch (error: any) {
        console.error('[POST /api/admin/mail-items/test-excel-write] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'test_failed',
            message: error?.message || 'Failed to run Excel write test',
            details: error?.stack,
            columnInfo: error?.details || null // Include column metadata if available
        });
    }
});

export default router;
