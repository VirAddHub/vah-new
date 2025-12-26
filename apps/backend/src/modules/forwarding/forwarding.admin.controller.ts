// apps/backend/src/modules/forwarding/forwarding.admin.controller.ts
import { Request, Response } from 'express';
import { getPool } from '../../server/db';
import { z } from 'zod';
import { sendMailForwarded } from '../../lib/mailer';
import { MAIL_STATUS, toCanonical, isTransitionAllowed, getNextStatuses, type MailStatus } from './mailStatus';
import { metrics } from '../../lib/metrics';
import { clearAdminForwardingCache } from '../../server/routes/admin-forwarding';
// import logger from '../../lib/logger'; // Using console for now

const ACTION_TO_STATUS = {
    mark_reviewed: MAIL_STATUS.Requested, // Map to Requested since Reviewed is not in our canonical statuses
    start_processing: MAIL_STATUS.Processing,
    mark_dispatched: MAIL_STATUS.Dispatched,
    mark_delivered: MAIL_STATUS.Delivered,
    cancel: 'Cancelled', // Keep as string since Cancelled is not in our canonical statuses
} as const;

const STATUS_TO_ACTION: Record<string, keyof typeof ACTION_TO_STATUS> = {
    [MAIL_STATUS.Requested]: "mark_reviewed",
    [MAIL_STATUS.Processing]: "start_processing",
    [MAIL_STATUS.Dispatched]: "mark_dispatched",
    [MAIL_STATUS.Delivered]: "mark_delivered",
};

// Use shared transitions - this will be replaced by the shared constants
const allowedTransitions: Record<string, string[]> = {
    [MAIL_STATUS.Requested]: [MAIL_STATUS.Processing],
    [MAIL_STATUS.Processing]: [MAIL_STATUS.Dispatched],
    [MAIL_STATUS.Dispatched]: [MAIL_STATUS.Delivered],
    [MAIL_STATUS.Delivered]: [],
    'Cancelled': [], // Keep for backward compatibility
};

const AdminUpdateSchema = z.object({
    action: z.enum(['mark_reviewed', 'start_processing', 'mark_dispatched', 'mark_delivered', 'cancel']).optional(),
    status: z.string().optional(),
    courier: z.string().trim().max(100).optional().nullable(),
    tracking_number: z.string().trim().max(120).optional().nullable(),
    admin_notes: z.string().trim().max(2000).optional().nullable(),
});

// Helper to validate transitions using shared constants
function canMove(from: string, to: string): boolean {
    try {
        const fromStatus = toCanonical(from) as MailStatus;
        const toStatus = toCanonical(to) as MailStatus;
        const allowed = isTransitionAllowed(fromStatus, toStatus);
        console.log(`[canMove] ${from} → ${to} (${fromStatus} → ${toStatus}): ${allowed}`);
        return allowed;
    } catch (error) {
        console.error(`[canMove] Error validating transition ${from} → ${to}:`, error);
        return false;
    }
}

// Status mapping for case-insensitive filtering
const STATUS_MAP = new Map<string, string>([
    ["requested", "Requested"],
    ["reviewed", "Reviewed"],
    ["processing", "Processing"],
    ["dispatched", "Dispatched"],
    ["delivered", "Delivered"],
    ["cancelled", "Cancelled"],
    ["all", "all"], // Special case for showing all statuses
    ["active", "active"], // Special case for showing active requests (excludes completed)
]);

// List queue for admin (filterable)
export async function adminListForwarding(req: Request, res: Response) {
    try {
        const rawStatus = (req.query.status ?? '').toString().trim();
        const status = rawStatus ? STATUS_MAP.get(rawStatus.toLowerCase()) : undefined;
        const q = (req.query.q ?? '').toString().trim();
        const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
        const offset = Math.max(0, Number(req.query.offset) || 0);

        const values: any[] = [];
        let where = 'WHERE 1=1';

        // By default, exclude completed requests (Delivered and Cancelled)
        // Only show them if explicitly requested via status filter
        if (status === 'all') {
            // Show all statuses including completed ones
            // No additional WHERE clause needed
        } else if (status === 'active') {
            // Show only active requests (exclude completed)
            where += ` AND fr.status NOT IN ('Delivered', 'Cancelled')`;
        } else if (status) {
            values.push(status);
            where += ` AND fr.status = $${values.length}`;
        } else {
            // Default: exclude completed requests
            where += ` AND fr.status NOT IN ('Delivered', 'Cancelled')`;
        }

        if (q) {
            values.push(`%${q}%`);
            where += ` AND (
        fr.to_name ILIKE $${values.length}
        OR fr.postal ILIKE $${values.length}
        OR coalesce(fr.courier,'') ILIKE $${values.length}
        OR coalesce(fr.tracking_number,'') ILIKE $${values.length}
        OR coalesce(u.email,'') ILIKE $${values.length}
        OR coalesce(mi.subject,'') ILIKE $${values.length}
      )`;
        }

        values.push(limit, offset);

        const pool = getPool();
        // Order by dispatched_at for dispatched requests, otherwise by created_at
        const orderBy = status === 'Dispatched'
            ? 'ORDER BY COALESCE(fr.dispatched_at, fr.created_at) DESC'
            : 'ORDER BY fr.created_at DESC';

        const sql = `
      SELECT fr.*, mi.subject, mi.tag, u.email, u.first_name, u.last_name,
             COALESCE(
               NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
               u.email
             ) as user_name
      FROM forwarding_request fr
      JOIN mail_item mi ON mi.id = fr.mail_item_id
      JOIN "user" u ON u.id = fr.user_id
      ${where}
      ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

        const { rows } = await pool.query(sql, values);

        // Debug: Log the first row to see the data structure
        if (rows.length > 0) {
            console.log('[adminListForwarding] First row sample:', {
                id: rows[0].id,
                created_at: rows[0].created_at,
                created_at_type: typeof rows[0].created_at,
                created_at_value: rows[0].created_at
            });
        }

        // Ensure all timestamp fields are numbers (PostgreSQL might return BIGINT as string)
        const processedRows = rows.map(row => ({
            ...row,
            created_at: typeof row.created_at === 'string' ? parseInt(row.created_at, 10) : row.created_at,
            updated_at: typeof row.updated_at === 'string' ? parseInt(row.updated_at, 10) : row.updated_at,
            dispatched_at: typeof row.dispatched_at === 'string' ? parseInt(row.dispatched_at, 10) : row.dispatched_at,
            delivered_at: typeof row.delivered_at === 'string' ? parseInt(row.delivered_at, 10) : row.delivered_at,
            processing_at: typeof row.processing_at === 'string' ? parseInt(row.processing_at, 10) : row.processing_at,
            reviewed_at: typeof row.reviewed_at === 'string' ? parseInt(row.reviewed_at, 10) : row.reviewed_at,
            cancelled_at: typeof row.cancelled_at === 'string' ? parseInt(row.cancelled_at, 10) : row.cancelled_at
        }));

        return res.json({ ok: true, data: processedRows });
    } catch (e: any) {
        console.error('[AdminForwarding] list error', e);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
}

// Admin update (review/process/dispatch/deliver/cancel)
export async function adminUpdateForwarding(req: Request, res: Response) {
    const admin = req.user;
    if (!admin) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const adminId = typeof admin.id === 'string' ? Number.parseInt(admin.id, 10) : Number(admin.id);
    if (!Number.isFinite(adminId)) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const id = Number(req.params.id);
    const parse = AdminUpdateSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ ok: false, error: 'invalid_body', details: parse.error.flatten() });
    }

    const { action, status, courier, tracking_number, admin_notes } = parse.data;

    // Normalize to ACTION
    let normalizedAction = action as keyof typeof ACTION_TO_STATUS | undefined;
    if (!normalizedAction && status) {
        try {
            const nextCanon = toCanonical(status);
            normalizedAction = STATUS_TO_ACTION[nextCanon];
        } catch (error) {
            return res.status(422).json({
                ok: false,
                error: "invalid_payload",
                message: `Invalid status format: ${status}`
            });
        }
    }

    if (!normalizedAction) {
        return res.status(422).json({
            ok: false,
            error: "invalid_payload",
            message: "Missing or invalid action/status. Must provide either 'action' or 'status'."
        });
    }

    const nextStatus = ACTION_TO_STATUS[normalizedAction];

    try {
        const pool = getPool();

        // Start transaction for atomic operations
        await pool.query('BEGIN');

        try {
            // Single optimized query to get all needed data
            const cur = await pool.query(`
                SELECT fr.id, fr.status, fr.mail_item_id, fr.user_id,
                       mi.subject, mi.tag,
                       u.email, u.first_name, u.last_name,
                       fr.to_name, fr.address1, fr.address2, fr.city, fr.state, fr.postal, fr.country
                FROM forwarding_request fr
                JOIN mail_item mi ON mi.id = fr.mail_item_id
                JOIN "user" u ON u.id = fr.user_id
                WHERE fr.id = $1
            `, [id]);

            if (cur.rowCount === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({ ok: false, error: 'not_found' });
            }

            const current = cur.rows[0].status;
            console.log(`[AdminForwarding] Request ${id} current status: "${current}", attempting to move to: "${nextStatus}"`);
            console.log(`[AdminForwarding] STRICT_STATUS_GUARD enabled: ${process.env.STRICT_STATUS_GUARD === "1"}`);

            // Strict status guard - enforce allowed transitions when enabled
            if (process.env.STRICT_STATUS_GUARD === "1") {
                try {
                    const currentStatus = toCanonical(current) as MailStatus;
                    const nextStatusCanonical = toCanonical(nextStatus) as MailStatus;
                    const allowed = getNextStatuses(currentStatus);

                    if (!allowed.includes(nextStatusCanonical)) {
                        await pool.query('ROLLBACK');
                        console.warn(`[STRICT_STATUS_GUARD] Illegal transition ${currentStatus} → ${nextStatusCanonical} for request ${id}`);

                        // Record illegal transition attempt
                        metrics.recordIllegalTransition(currentStatus, nextStatusCanonical, id);

                        return res.status(400).json({
                            ok: false,
                            error: 'illegal_transition',
                            message: `Illegal transition: ${currentStatus} → ${nextStatusCanonical}`,
                            id: String(id),
                            from: currentStatus,
                            to: nextStatusCanonical,
                            allowed: allowed
                        });
                    }
                } catch (error) {
                    await pool.query('ROLLBACK');
                    console.error(`[STRICT_STATUS_GUARD] Invalid status: ${error}`);
                    return res.status(400).json({
                        ok: false,
                        error: 'invalid_status',
                        message: 'Invalid status format'
                    });
                }
            }

            if (!canMove(current, nextStatus)) {
                await pool.query('ROLLBACK');
                console.warn(`[AdminForwarding] canMove() rejected transition ${current} → ${nextStatus} for request ${id}`);
                return res.status(400).json({
                    ok: false,
                    error: 'illegal_transition',
                    message: `Illegal transition ${current} → ${nextStatus}`,
                    id: String(id),
                    from: current,
                    to: nextStatus,
                    allowed: getNextStatuses(toCanonical(current))
                });
            }

            // build update
            const now = new Date();
            const nowTimestamp = now.getTime(); // Convert to Unix timestamp in milliseconds
            const sets: string[] = ['status = $1', 'updated_at = $2'];
            const vals: any[] = [nextStatus, nowTimestamp];

            // timestamps by status
            if (nextStatus === MAIL_STATUS.Requested && action === 'mark_reviewed') {
                sets.push('reviewed_at = $3', 'reviewed_by = $4');
                vals.push(nowTimestamp, admin.id);
            }
            if (nextStatus === MAIL_STATUS.Processing) {
                sets.push('processing_at = $3');
                vals.push(nowTimestamp);

                // Add usage charges for forwarding (in transaction)
                const month = new Date();
                month.setDate(1);
                month.setHours(0, 0, 0, 0);
                const yyyymm = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

                await pool.query(`
                INSERT INTO usage_charges (user_id, period_yyyymm, type, qty, amount_pence, notes, created_at)
                VALUES ($1, $2, 'forwarding', 1, 200, 'Handling fee', $3)
            `, [cur.rows[0].user_id, yyyymm, nowTimestamp]);
            }
            if (nextStatus === MAIL_STATUS.Dispatched) {
                sets.push('dispatched_at = $3');
                vals.push(nowTimestamp);
            }
            if (nextStatus === MAIL_STATUS.Delivered) {
                sets.push('delivered_at = $3');
                vals.push(nowTimestamp);
            }
            if (nextStatus === 'Cancelled') {
                sets.push('cancelled_at = $3');
                vals.push(nowTimestamp);
            }

            // courier / tracking / notes (optional)
            if (courier !== undefined) {
                sets.push(`courier = $${vals.length + 1}`);
                vals.push(courier);
            }
            if (tracking_number !== undefined) {
                sets.push(`tracking_number = $${vals.length + 1}`);
                vals.push(tracking_number);
            }
            if (admin_notes !== undefined) {
                sets.push(`admin_notes = $${vals.length + 1}`);
                vals.push(admin_notes);
            }

            // where id = last parameter
            vals.push(id);
            const upd = await pool.query(
                `UPDATE forwarding_request SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
                vals
            );

            // mirror onto mail_item.forwarding_status (optional, if column exists)
            try {
                await pool.query('UPDATE mail_item SET forwarding_status = $1 WHERE id = $2', [nextStatus, cur.rows[0].mail_item_id]);
            } catch { }

            // audit (if table exists)
            try {
                await pool.query(
                    `INSERT INTO mail_event(mail_item_id, user_id, event, meta_json, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
                    [cur.rows[0].mail_item_id, admin.id, `forwarding.${nextStatus.toLowerCase()}`, JSON.stringify({ courier, tracking_number, admin_notes }), nowTimestamp]
                );
            } catch { }

            // Commit the transaction
            await pool.query('COMMIT');

            // Record successful status transition
            try {
                const currentStatus = toCanonical(current) as MailStatus;
                const nextStatusCanonical = toCanonical(nextStatus) as MailStatus;
                metrics.recordStatusTransition(currentStatus, nextStatusCanonical);
            } catch (error) {
                console.warn(`[METRICS] Failed to record transition: ${error}`);
            }

            // Send email notification when status is changed to "Dispatched" or "Delivered" (async, non-blocking)
            if (nextStatus === MAIL_STATUS.Dispatched || nextStatus === MAIL_STATUS.Delivered) {
                setImmediate(async () => {
                    try {
                        // Use data we already have from the initial query
                        const userData = cur.rows[0];

                        // Build forwarding address
                        const parts = [
                            userData.to_name,
                            userData.address1,
                            userData.address2,
                            userData.city,
                            userData.state,
                            userData.postal,
                            userData.country
                        ].filter(Boolean);
                        const forwarding_address = parts.length > 0 ? parts.join(', ') : 'Your forwarding address';

                        await sendMailForwarded({
                            email: userData.email,
                            firstName: userData.first_name || "there",
                            forwarding_address: forwarding_address,
                            forwarded_date: new Date().toLocaleDateString('en-GB')
                        });
                        console.log(`[AdminForwarding] Sent ${nextStatus.toLowerCase()} notification to ${userData.email} for request ${id}`);
                    } catch (emailError) {
                        console.error(`[AdminForwarding] Failed to send ${nextStatus.toLowerCase()} email for request ${id}:`, emailError);
                    }
                });
            }

            console.log(`[AdminForwarding] Updated request ${id} to ${nextStatus} by admin ${admin.id}`);

            // Clear cache to ensure fresh data on next GET request
            clearAdminForwardingCache(adminId);

            return res.json({ ok: true, data: upd.rows[0] });

        } catch (transactionError) {
            await pool.query('ROLLBACK');
            throw transactionError;
        }

    } catch (e: any) {
        console.error('[AdminForwarding] update error', e);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
}