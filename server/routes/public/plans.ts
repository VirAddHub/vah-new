import { Router } from "express";
import { Pool } from "pg";

const router = Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get("/api/plans", async (req: any, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, price_usd, features, sort_order
       FROM plans
       WHERE active = true
       ORDER BY sort_order NULLS LAST, price_usd ASC`
    );
    
    res.json({ items: rows });
  } catch (err: any) {
    console.error("GET /api/plans", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
