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

router.get("/api/email-prefs", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.session!.user.id;

    try {
        // Get user's email preferences (assuming they're stored in user table or separate prefs table)
        const { rows } = await pool.query(`
            SELECT email_marketing, email_product, email_billing
            FROM "user"
            WHERE id = $1
        `, [userId]);

        const user = rows[0];
        ok(res, {
            prefs: {
                marketing: user?.email_marketing ?? true,
                product: user?.email_product ?? true,
                billing: user?.email_billing ?? true
            }
        });
    } catch (err) {
        console.error('Error getting email preferences:', err);
        // Return default preferences if there's an error
        ok(res, {
            prefs: {
                marketing: true,
                product: true,
                billing: true
            }
        });
    }
}));

export default router;
