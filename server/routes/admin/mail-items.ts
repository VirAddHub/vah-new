import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok, created, notFound, badRequest } from "../../../src/lib/http";
import { requireAdmin } from "../../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// List mail items with tabs + search + paging
router.get('/api/admin/mail-items', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { status, search, limit = 20, offset = 0 } = req.query;

    const { rows } = await pool.query(`
        SELECT mi.id, mi.user_id, u.first_name, u.last_name, mi.sender, mi.subject, mi.tag,
               mi.status, mi.created_at, mi.scan_token
        FROM mail_item mi
        JOIN "user" u ON u.id = mi.user_id
        WHERE ($1::text IS NULL OR mi.status = $1)
          AND ($2::text IS NULL OR (
               mi.sender ILIKE '%'||$2||'%' OR mi.subject ILIKE '%'||$2||'%' OR
               u.email ILIKE '%'||$2||'%' OR u.first_name ILIKE '%'||$2||'%' OR u.last_name ILIKE '%'||$2||'%'
          ))
        ORDER BY mi.created_at DESC
        LIMIT $3 OFFSET $4
    `, [status || null, search || null, parseInt(limit), parseInt(offset)]);

    ok(res, { items: rows });
}));

// Create mail item
router.post('/api/admin/mail-items', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { user_id, sender, subject, tag } = req.body;

    if (!user_id || !sender || !subject) {
        return badRequest(res, 'user_id, sender, and subject are required');
    }

    const { rows } = await pool.query(`
        INSERT INTO mail_item (user_id, sender, subject, tag, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'received', EXTRACT(EPOCH FROM NOW()) * 1000, EXTRACT(EPOCH FROM NOW()) * 1000)
        RETURNING id, user_id, sender, subject, tag, status, created_at
    `, [user_id, sender, subject, tag || null]);

    created(res, { mail_item: rows[0] });
}));

// Update mail item tag/status
router.patch('/api/admin/mail-items/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { tag, status } = req.body;

    if (!tag && !status) {
        return badRequest(res, 'tag or status must be provided');
    }

    const validStatuses = ['received', 'pending', 'processed', 'forwarded'];
    if (status && !validStatuses.includes(status)) {
        return badRequest(res, 'status must be one of: received, pending, processed, forwarded');
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (tag !== undefined) {
        updateFields.push(`tag = $${paramCount++}`);
        values.push(tag);
    }

    if (status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(status);
    }

    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(Math.floor(Date.now()));

    values.push(id); // for WHERE clause

    const { rows } = await pool.query(`
        UPDATE mail_item 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, user_id, sender, subject, tag, status, created_at, updated_at
    `, values);

    if (rows.length === 0) {
        return notFound(res, 'Mail item not found');
    }

    ok(res, { mail_item: rows[0] });
}));

// Get scan URL for mail item
router.get('/api/mail-items/:id/scan-url', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const { rows } = await pool.query(`
        SELECT scan_token
        FROM mail_item
        WHERE id = $1 AND scan_token IS NOT NULL
    `, [id]);

    if (rows.length === 0) {
        return notFound(res, 'Scan not available for this mail item');
    }

    // Construct scan URL (adjust domain as needed)
    const scanUrl = `https://vah-api-staging.onrender.com/api/mail-items/${id}/scan?token=${rows[0].scan_token}`;
    
    ok(res, { url: scanUrl });
}));

export default router;
