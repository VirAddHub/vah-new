// apps/backend/src/modules/forwarding/forwarding.admin.controller.ts
import { Request, Response } from 'express';
import { getPool } from '../../server/db';
import { z } from 'zod';
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
        if (status) {
            values.push(status);
            where += ` AND fr.status = $${values.length}`;
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
        return res.json({ ok: true, data: rows });
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
        const sets: string[] = ['status = $1', 'updated_at = $2'];
        const vals: any[] = [nextStatus, now];

        // timestamps by status
        if (nextStatus === 'Reviewed') {
            sets.push('reviewed_at = $3', 'reviewed_by = $4');
            vals.push(now, admin.id);
        }
        if (nextStatus === 'Processing') {
            sets.push('processing_at = $3');
            vals.push(now);
        }
        if (nextStatus === 'Dispatched') {
            sets.push('dispatched_at = $3');
            vals.push(now);
        }
        if (nextStatus === 'Delivered') {
            sets.push('delivered_at = $3');
            vals.push(now);
        }
        if (nextStatus === 'Cancelled') {
            sets.push('cancelled_at = $3');
            vals.push(now);
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

        console.log(`[AdminForwarding] Updated request ${id} to ${nextStatus} by admin ${admin.id}`);
        return res.json({ ok: true, data: upd.rows[0] });
    } catch (e: any) {
        console.error('[AdminForwarding] update error', e);
        return res.status(500).json({ ok: false, error: 'internal_error' });
    }
}