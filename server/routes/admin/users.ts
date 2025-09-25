import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok, created, notFound, badRequest } from "../../../src/lib/http";
import { requireAdmin } from "../../../src/lib/authz";
import bcrypt from 'bcrypt';

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get users with search, filters, and stats
router.get('/api/admin/users', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { search, status, plan, kyc, limit = 20, offset = 0 } = req.query;

    try {
        const { rows } = await pool.query(`
            SELECT
              u.id, u.email, u.first_name, u.last_name, u.is_admin, u.status,
              u.plan_status as plan, u.kyc_status, u.created_at, u.last_login_at,
              COALESCE(SUM(i.amount_pence) FILTER(WHERE i.status='paid'),0)::bigint AS total_spent_pence,
              COALESCE(COUNT(mi.id),0)::bigint AS mail_count
            FROM "user" u
            LEFT JOIN invoice i ON i.user_id = u.id
            LEFT JOIN mail_item mi ON mi.user_id = u.id
            WHERE ($1::text IS NULL OR (u.email ILIKE '%'||$1||'%' OR u.first_name ILIKE '%'||$1||'%' OR u.last_name ILIKE '%'||$1||'%'))
              AND ($2::text IS NULL OR u.status = $2)
              AND ($3::text IS NULL OR u.plan_status = $3)
              AND ($4::text IS NULL OR u.kyc_status = $4)
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT $5 OFFSET $6
        `, [search || null, status || null, plan || null, kyc || null, parseInt(limit), parseInt(offset)]);

        ok(res, { users: rows });
    } catch (err) {
        console.error('[admin.users] error', err);
        ok(res, { users: [] });
    }
}));

// Get user stats
router.get('/api/admin/users/stats', requireAdmin, asyncHandler(async (req: any, res: any) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                COUNT(*) FILTER(WHERE status = 'active') as active_count,
                COUNT(*) FILTER(WHERE status = 'suspended') as suspended_count,
                COUNT(*) FILTER(WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER(WHERE plan_status = 'active') as plan_active_count,
                COUNT(*) FILTER(WHERE kyc_status = 'approved') as kyc_approved_count,
                COUNT(*) FILTER(WHERE kyc_status = 'pending') as kyc_pending_count,
                COUNT(*) FILTER(WHERE kyc_status = 'rejected') as kyc_rejected_count,
                COUNT(*) as total_count
            FROM "user"
        `);

        ok(res, { stats: rows[0] || {} });
    } catch (err) {
        console.error('[admin.users.stats] error', err);
        ok(res, { stats: {} });
    }
}));

// Create user
router.post('/api/admin/users', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { 
        email, password, first_name, last_name, phone, company_name, 
        business_type, company_number, vat_number, address, plan, is_admin = false 
    } = req.body;

    if (!email || !password || !first_name || !last_name) {
        return badRequest(res, 'email, password, first_name, and last_name are required');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const now = Math.floor(Date.now());

    try {
        const { rows } = await pool.query(`
            INSERT INTO "user" (
                email, password_hash, first_name, last_name, phone, company_name,
                business_type, company_number, vat_number, address, plan_status, 
                is_admin, status, kyc_status, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', 'pending', $13, $13)
            RETURNING id, email, first_name, last_name, is_admin, status, plan_status, kyc_status, created_at
        `, [
            email, password_hash, first_name, last_name, phone || null, company_name || null,
            business_type || null, company_number || null, vat_number || null, 
            address ? JSON.stringify(address) : null, plan || 'inactive', is_admin, now
        ]);

        created(res, { user: rows[0] });
    } catch (err: any) {
        if (err.code === '23505') { // Unique constraint violation
            return badRequest(res, 'User with this email already exists');
        }
        throw err;
    }
}));

// Update user
router.put('/api/admin/users/:id', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
        return badRequest(res, 'At least one field must be provided for update');
    }

    const allowedFields = [
        'email', 'first_name', 'last_name', 'phone', 'company_name', 
        'business_type', 'company_number', 'vat_number', 'address', 
        'plan_status', 'is_admin', 'status', 'kyc_status'
    ];

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            if (key === 'address' && typeof value === 'object') {
                updateFields.push(`${key} = $${paramCount++}`);
                values.push(JSON.stringify(value));
            } else {
                updateFields.push(`${key} = $${paramCount++}`);
                values.push(value);
            }
        }
    }

    if (updateFields.length === 0) {
        return badRequest(res, 'No valid fields provided for update');
    }

    updateFields.push(`updated_at = $${paramCount++}`);
    values.push(Math.floor(Date.now()));
    values.push(id);

    const { rows } = await pool.query(`
        UPDATE "user" 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, first_name, last_name, is_admin, status, plan_status, kyc_status, created_at, updated_at
    `, values);

    if (rows.length === 0) {
        return notFound(res, 'User not found');
    }

    ok(res, { user: rows[0] });
}));

// Suspend user
router.put('/api/admin/users/:id/suspend', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const { rows } = await pool.query(`
        UPDATE "user" 
        SET status = 'suspended', updated_at = $1
        WHERE id = $2
        RETURNING id, email, first_name, last_name, status, updated_at
    `, [Math.floor(Date.now()), id]);

    if (rows.length === 0) {
        return notFound(res, 'User not found');
    }

    ok(res, { user: rows[0] });
}));

// Activate user
router.put('/api/admin/users/:id/activate', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const { rows } = await pool.query(`
        UPDATE "user" 
        SET status = 'active', updated_at = $1
        WHERE id = $2
        RETURNING id, email, first_name, last_name, status, updated_at
    `, [Math.floor(Date.now()), id]);

    if (rows.length === 0) {
        return notFound(res, 'User not found');
    }

    ok(res, { user: rows[0] });
}));

// Update KYC status
router.put('/api/admin/users/:id/kyc-status', requireAdmin, asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['approved', 'pending', 'rejected'].includes(status)) {
        return badRequest(res, 'status must be one of: approved, pending, rejected');
    }

    const { rows } = await pool.query(`
        UPDATE "user" 
        SET kyc_status = $1, updated_at = $2
        WHERE id = $3
        RETURNING id, email, first_name, last_name, kyc_status, updated_at
    `, [status, Math.floor(Date.now()), id]);

    if (rows.length === 0) {
        return notFound(res, 'User not found');
    }

    ok(res, { user: rows[0] });
}));

export default router;
