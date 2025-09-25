import { Router } from "express";
import { Pool } from "pg";
import { asyncHandler, ok } from "../../src/lib/http";
import { requireAuth } from "../../src/lib/authz";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/profile", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.session!.user.id;
    
    try {
        const { rows } = await pool.query(`
            SELECT id, email, first_name, last_name, is_admin, role, status, 
                   kyc_status, plan_status, plan_start_date, created_at, updated_at
            FROM "user"
            WHERE id = $1
        `, [userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        ok(res, {
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                is_admin: !!user.is_admin,
                role: user.role,
                status: user.status,
                kyc_status: user.kyc_status,
                plan_status: user.plan_status,
                plan_start_date: user.plan_start_date,
                created_at: user.created_at,
                updated_at: user.updated_at
            }
        });
    } catch (err) {
        console.error('Error getting user profile:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}));

export default router;
