import { Router } from 'express';
import { many } from '../../db-helpers';

const router = Router();

router.get('/plans', async (_req, res) => {
  try {
    const rows = await many<{ id: string; name: string; price_pence: number }>(
      `select id, name, price_pence from plans order by price_pence asc`
    );
    return res.status(200).json({ ok: true, data: rows, source: 'db' });
  } catch (e) {
    // Safe stub if DB not reachable
    return res.status(200).json({
      ok: true,
      data: [{ id: 'monthly', name: 'Digital Mailbox', price_pence: 999 }],
      source: 'stub',
    });
  }
});

export default router;
