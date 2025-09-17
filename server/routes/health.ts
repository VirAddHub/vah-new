import { Router } from 'express';
import { db, DB_KIND } from '../db';

const r = Router();
r.get('/health', async (_req, res) => {
  try {
    await db.get('SELECT 1', []);
    res.json({ ok: true, db: DB_KIND });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message, db: DB_KIND });
  }
});
export default r;