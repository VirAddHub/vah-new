import { Router } from "express";
import { Pool } from "pg";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/email-prefs", async (req: any, res) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "unauthorized" });

    try {
        const { rows } = await pool.query(
            `SELECT marketing, product, billing
       FROM email_prefs
       WHERE user_id = $1`,
            [user.id]
        );

        const prefs = rows[0] ?? { marketing: true, product: true, billing: true };
        res.json({ prefs });
    } catch (err: any) {
        console.error("GET /api/email-prefs", err);
        // Return safe defaults if table doesn't exist
        res.json({ prefs: { marketing: true, product: true, billing: true } });
    }
});

export default router;
