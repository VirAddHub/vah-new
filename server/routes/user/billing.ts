import { Router } from "express";
import { Pool } from "pg";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/billing", async (req: any, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "unauthorized" });

    try {
        const { rows } = await pool.query(
            `SELECT s.id, s.status, s.current_period_end, p.name as plan_name, p.price_cents, p.currency
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
            [user.id]
        );

        res.json({ subscription: rows[0] ?? null });
    } catch (err: any) {
        console.error("GET /api/billing", err);
        res.status(500).json({ error: "server_error" });
    }
});

export default router;
