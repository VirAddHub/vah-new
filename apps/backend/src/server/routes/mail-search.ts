/**
 * Mail Search Route
 *
 * GET /api/mail-search/search
 * GET /api/mail-search/search/test
 *
 * Replaces SQLite FTS and LIKE with Postgres ILIKE.
 *
 * Fixed from JS original:
 *  - Removed broken FTS implementation (FTS tables were removed to fix DB corruption)
 *  - Changed LIKE to ILIKE for case-insensitive Postgres search
 *  - Replaced synchronous db.prepare with async Postgres pool
 *  - timeDb() was dropped (Postgres pool handles its own connection/timings via pg package)
 */

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { safeAccessPath } from '../../lib/accessLog';

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
    let userId = Number(req.user?.id || 0);

    // Dev overrides
    if (!userId && process.env.NODE_ENV !== 'production') {
        const hdr = Number(req.header('x-dev-user-id') || 0);
        if (hdr) userId = hdr;
        const qid = Number(req.query.userId || 0);
        if (!userId && qid) userId = qid;
    }

    if (!userId) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }

    const q = String(req.query.q || '').trim();
    const limit = Math.max(0, Math.min(100, Number(req.query.limit || 20)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const tag = String(req.query.tag || '').trim();
    const status = String(req.query.status || '').trim();
    const includeDeleted = req.query.deleted === 'true';

    // Build conditions securely
    const conditions: string[] = ['m.user_id = $1'];
    const params: (string | number | boolean)[] = [userId];
    let p = 2;

    if (!includeDeleted) {
        conditions.push(`(m.deleted IS FALSE OR m.deleted IS NULL)`);
    }

    if (tag) {
        conditions.push(`m.tag = $${p++}`);
        params.push(tag);
    }

    if (status) {
        conditions.push(`m.status = $${p++}`);
        params.push(status);
    }

    let searchCondition = '';
    if (q) {
        // Strip % and _ so they don't behave as wildcards for user input
        const cleanQ = q.replace(/[%_]/g, '');
        const likeQ = `%${cleanQ}%`;
        
        searchCondition = `
            AND (m.subject ILIKE $${p} 
                 OR m.sender_name ILIKE $${p} 
                 OR m.notes ILIKE $${p} 
                 OR m.tag ILIKE $${p})
        `;
        params.push(likeQ);
        p++; // Since the same parameter is used 4 times, we only increment `p` once.
             // Wait, wait... Postgres positional args allow reusing the same index!
             // So we can use $p multiple times.
    }

    const whereClause = `WHERE ${conditions.join(' AND ')} ${searchCondition}`;

    const sqlItems = `
        SELECT m.id, m.created_at, m.subject, m.sender_name, m.tag, m.status, m.scanned, m.deleted,
               m.file_id, m.forwarding_status, m.expires_at
        FROM mail_item m
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT $${p} OFFSET $${p + 1}
    `;

    const sqlCount = `
        SELECT COUNT(*) AS c FROM mail_item m
        ${whereClause}
    `;

    try {
        const pool = getPool();

        // Perform both queries concurrently
        const [itemsResult, countResult] = await Promise.all([
            pool.query(sqlItems, [...params, limit, offset]),
            pool.query(sqlCount, params)
        ]);

        const total = parseInt(countResult.rows[0].c, 10);
        return res.json({ ok: true, total, items: itemsResult.rows });

    } catch (e: any) {
        console.error('[GET /api/mail-search/search] error:', e);
        return res.status(500).json({ ok: false, error: 'database_error', message: e.message });
    }
});

// tiny probe to confirm mount + auth
router.get('/search/test', (req: Request, res: Response) => {
    res.json({ ok: true, path: safeAccessPath(req), user: req.user || null });
});

export default router;
