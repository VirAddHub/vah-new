import { Router } from "express";
import { Pool } from "pg";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/tickets", async (req: any, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "unauthorized" });

    try {
        const { rows } = await pool.query(
            `SELECT id, subject, status, created_at
       FROM support_tickets
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
            [user.id]
        );
        res.json({ items: rows });
    } catch (err: any) {
        console.error("GET /api/tickets", err);
        res.status(500).json({ error: "server_error" });
    }
});

export default router;
