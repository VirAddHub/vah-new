// apps/backend/src/modules/forwarding/forwarding.admin.controller.ts
import { Request, Response } from 'express';
import { getPool } from '../../server/db';
import { z } from 'zod';
import { sendMailForwarded } from '../../lib/mailer';
// import logger from '../../lib/logger'; // Using console for now

const ACTION_TO_STATUS = {
    mark_reviewed: 'Reviewed',
    start_processing: 'Processing',
    mark_dispatched: 'Dispatched',
    mark_delivered: 'Delivered',
    cancel: 'Cancelled',
} as const;

const allowedTransitions: Record<string, string[]> = {
    Requested: ['Reviewed', 'Processing', 'Cancelled'],
    Reviewed: ['Processing', 'Cancelled'],
    Processing: ['Dispatched', 'Cancelled'],
    Dispatched: ['Delivered'],
    Delivered: [],
    Cancelled: [],
};

const AdminUpdateSchema = z.object({
    action: z.enum(['mark_reviewed', 'start_processing', 'mark_dispatched', 'mark_delivered', 'cancel']),
    courier: z.string().trim().max(100).optional().nullable(),
    tracking_number: z.string().trim().max(120).optional().nullable(),
    admin_notes: z.string().trim().max(2000).optional().nullable(),
});

// Helper to validate transitions locally
function canMove(from: string, to: string): boolean {
    const nexts = allowedTransitions[from] || [];
    return nexts.includes(to);
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
        const sql = `
      SELECT fr.*, mi.subject, mi.tag, u.email
      FROM forwarding_request fr
      JOIN mail_item mi ON mi.id = fr.mail_item_id
      JOIN "user" u ON u.id = fr.user_id
      ${where}
      ORDER BY fr.created_at DESC
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

        // Ensure created_at is a number (PostgreSQL might return BIGINT as string)
        const processedRows = rows.map(row => ({
            ...row,
            created_at: typeof row.created_at === 'string' ? parseInt(row.created_at, 10) : row.created_at
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

    const id = Number(req.params.id);
    const parse = AdminUpdateSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ ok: false, error: 'invalid_body', details: parse.error.flatten() });
    }

    const { action, courier, tracking_number, admin_notes } = parse.data;
    const nextStatus = ACTION_TO_STATUS[action];

    try {
        const pool = getPool();

        // load current
        const cur = await pool.query('SELECT id, status, mail_item_id FROM forwarding_request WHERE id = $1', [id]);
        if (cur.rowCount === 0) {
            return res.status(404).json({ ok: false, error: 'not_found' });
        }

        const current = cur.rows[0].status;
        if (!canMove(current, nextStatus)) {
            return res.status(400).json({
                ok: false,
                error: 'illegal_transition',
                from: current,
                to: nextStatus
            });
        }

        // build update
        const now = new Date();
        const nowTimestamp = now.getTime(); // Convert to Unix timestamp in milliseconds
        const sets: string[] = ['status = $1', 'updated_at = $2'];
        const vals: any[] = [nextStatus, nowTimestamp];

        // timestamps by status
        if (nextStatus === 'Reviewed') {
            sets.push('reviewed_at = $3', 'reviewed_by = $4');
            vals.push(nowTimestamp, admin.id);
        }
        if (nextStatus === 'Processing') {
            sets.push('processing_at = $3');
            vals.push(nowTimestamp);
        }
        if (nextStatus === 'Dispatched') {
            sets.push('dispatched_at = $3');
            vals.push(nowTimestamp);
            
            // Add usage charges for forwarding
            try {
                const now = Date.now();
                const month = new Date(); 
                month.setDate(1); 
                month.setHours(0,0,0,0);
                const yyyymm = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}`;

                // Get user_id from forwarding request
                const userResult = await pool.query(`
                    SELECT user_id FROM forwarding_request WHERE id = $1
                `, [id]);
                
                if (userResult.rows.length > 0) {
                    const userId = userResult.rows[0].user_id;
                    
                    // £2 handling fee
                    await pool.query(`
                        INSERT INTO usage_charges (user_id, period_yyyymm, type, qty, amount_pence, notes, created_at)
                        VALUES ($1, $2, 'forwarding', 1, 200, 'Handling fee', $3)
                    `, [userId, yyyymm, now]);

                    // TODO: Add postage at cost if you have a value
                    // if (typeof postagePence === 'number' && postagePence > 0) {
                    //     await pool.query(`
                    //         INSERT INTO usage_charges (user_id, period_yyyymm, type, qty, amount_pence, notes, created_at)
                    //         VALUES ($1, $2, 'postage', 1, $3, 'Royal Mail postage', $4)
                    //     `, [userId, yyyymm, postagePence, now]);
                    // }
                }
            } catch (usageError) {
                console.error('[adminUpdateForwarding] Usage tracking failed:', usageError);
                // Don't fail the main operation if usage tracking fails
            }
        }
        if (nextStatus === 'Delivered') {
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
                `INSERT INTO mail_event(mail_item_id, user_id, event, meta_json)
         VALUES ($1, $2, $3, $4)`,
                [cur.rows[0].mail_item_id, admin.id, `forwarding.${nextStatus.toLowerCase()}`, JSON.stringify({ courier, tracking_number, admin_notes })]
            );
        } catch { }

        // Send email notification when status is changed to "Dispatched" or "Delivered"
        if (nextStatus === 'Dispatched' || nextStatus === 'Delivered') {
            try {
                // Get user details for email
                const userQuery = await pool.query(`
                    SELECT u.email, u.first_name, u.last_name, fr.tracking_number, fr.courier
                    FROM forwarding_request fr
                    JOIN "user" u ON u.id = fr.user_id
                    WHERE fr.id = $1
                `, [id]);

                if (userQuery.rows.length > 0) {
                    const user = userQuery.rows[0];

                    // Get the forwarding address from the request
                    const addressQuery = await pool.query(`
                        SELECT to_name, address1, address2, city, state, postal, country
                        FROM forwarding_request
                        WHERE id = $1
                    `, [id]);

                    let forwarding_address = 'Your forwarding address';
                    if (addressQuery.rows.length > 0) {
                        const addr = addressQuery.rows[0];
                        const parts = [
                            addr.to_name,
                            addr.address1,
                            addr.address2,
                            addr.city,
                            addr.state,
                            addr.postal,
                            addr.country
                        ].filter(Boolean);
                        forwarding_address = parts.join(', ');
                    }

                    await sendMailForwarded({
                        email: user.email,
                        name: user.first_name || user.email,
                        forwarding_address: forwarding_address,
                        forwarded_date: new Date().toLocaleDateString('en-GB')
                    });
                    console.log(`[AdminForwarding] Sent delivery notification email to ${user.email} for request ${id}`);
                }
            } catch (emailError) {
                console.error(`[AdminForwarding] Failed to send delivery email for request ${id}:`, emailError);
                // Don't fail the request - the status update succeeded, just email failed
            }
        }

        console.log(`[AdminForwarding] Updated request ${id} to ${nextStatus} by admin ${admin.id}`);
        return res.json({ ok: true, data: upd.rows[0] });
    } catch (e: any) {
        console.error('[AdminForwarding] update error', e);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
}