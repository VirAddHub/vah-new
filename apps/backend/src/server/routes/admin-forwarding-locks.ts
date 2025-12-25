// apps/backend/src/server/routes/admin-forwarding-locks.ts
import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { getPool } from '../../server/db';
import { z } from 'zod';
import { logger } from '../../lib/logger';

const router = Router();

// In-memory lock store (in production, use Redis)
const locks = new Map<number, {
  request_id: number;
  admin_id: number;
  admin_name: string;
  locked_at: number;
}>();

// Clean up expired locks (older than 5 minutes)
// Guard against duplicate intervals (dev hot reload / accidental multiple imports).
let cleanupInterval: NodeJS.Timeout | null = null;
function startCleanupInterval() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    let cleaned = 0;
    for (const [requestId, lock] of locks.entries()) {
      if (now - lock.locked_at > fiveMinutes) {
        locks.delete(requestId);
        cleaned += 1;
      }
    }

    if (cleaned > 0) {
      logger.debug('[LockManager] auto-unlocked expired locks', { cleaned });
    }
  }, 60_000); // Check every minute
}
startCleanupInterval();

export function stopForwardingLocksCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[LockManager] cleanup interval stopped');
  }
}

const LockSchema = z.object({
  admin_id: z.number().int().positive(),
  admin_name: z.string().min(1),
});

// POST /api/admin/forwarding/requests/:id/lock
router.post('/admin/forwarding/requests/:id/lock', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const admin = req.user;
    
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const parse = LockSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_body',
        details: parse.error.flatten()
      });
    }

    const { admin_id, admin_name } = parse.data;

    // Check if request exists
    const pool = getPool();
    const requestResult = await pool.query(`
      SELECT id FROM forwarding_request WHERE id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'request_not_found',
        message: `Forwarding request ${id} not found`
      });
    }

    // Check if already locked by someone else
    const existingLock = locks.get(id);
    if (existingLock && existingLock.admin_id !== admin_id) {
      return res.status(409).json({
        ok: false,
        error: 'already_locked',
        message: `Request is locked by ${existingLock.admin_name}`,
        locked_by: existingLock.admin_name,
        locked_at: existingLock.locked_at
      });
    }

    // Lock the request
    locks.set(id, {
      request_id: id,
      admin_id,
      admin_name,
      locked_at: Date.now()
    });

    logger.debug('[LockManager] locked', { requestId: id, adminId: admin_id });

    res.json({
      ok: true,
      message: 'Request locked successfully',
      locked_at: Date.now()
    });

  } catch (error: any) {
    console.error('[LockManager] Lock error:', error);
    res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

// POST /api/admin/forwarding/requests/:id/unlock
router.post('/admin/forwarding/requests/:id/unlock', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const admin = req.user;
    
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const existingLock = locks.get(id);
    if (!existingLock) {
      return res.status(404).json({
        ok: false,
        error: 'not_locked',
        message: 'Request is not locked'
      });
    }

    // Only the admin who locked it can unlock it
    if (existingLock.admin_id !== admin.id) {
      return res.status(403).json({
        ok: false,
        error: 'not_authorized',
        message: 'Only the admin who locked this request can unlock it'
      });
    }

    // Unlock the request
    locks.delete(id);

    logger.debug('[LockManager] unlocked', { requestId: id, adminId: admin.id });

    res.json({
      ok: true,
      message: 'Request unlocked successfully'
    });

  } catch (error: any) {
    console.error('[LockManager] Unlock error:', error);
    res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

// GET /api/admin/forwarding/requests/:id/lock-status
router.get('/admin/forwarding/requests/:id/lock-status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const lock = locks.get(id);

    if (!lock) {
      return res.json({
        ok: true,
        locked: false
      });
    }

    res.json({
      ok: true,
      locked: true,
      locked_by: lock.admin_name,
      locked_at: lock.locked_at,
      locked_by_id: lock.admin_id
    });

  } catch (error: any) {
    console.error('[LockManager] Lock status error:', error);
    res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

// POST /api/admin/forwarding/requests/:id/force-unlock
router.post('/admin/forwarding/requests/:id/force-unlock', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const admin = req.user;
    
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const existingLock = locks.get(id);
    if (!existingLock) {
      return res.status(404).json({
        ok: false,
        error: 'not_locked',
        message: 'Request is not locked'
      });
    }

    // Log the force unlock for audit purposes
    logger.warn('[LockManager] force unlock', { requestId: id, adminId: admin.id });

    // Force unlock the request (any admin can force unlock)
    locks.delete(id);

    res.json({
      ok: true,
      message: 'Request force unlocked successfully',
      previous_locker: existingLock.admin_name
    });

  } catch (error: any) {
    console.error('[LockManager] Force unlock error:', error);
    res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

// GET /api/admin/forwarding/locks (get all locks)
router.get('/admin/forwarding/locks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const allLocks = Array.from(locks.values());
    
    res.json({
      ok: true,
      locks: allLocks
    });

  } catch (error: any) {
    console.error('[LockManager] Get locks error:', error);
    res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: error.message
    });
  }
});

export default router;
