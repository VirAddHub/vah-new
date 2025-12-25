// apps/backend/src/server/routes/businessOwners.ts
// Business owners management routes

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import * as businessOwnersService from '../services/businessOwners';

const router = Router();

function toNumberId(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
        const n = Number.parseInt(value, 10);
        return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
}

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
    if (!req.user?.id) {
        return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    next();
}

/**
 * GET /api/business-owners
 * Get all business owners for the authenticated user
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = toNumberId(req.user!.id);
        if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'unauthenticated' });
        const owners = await businessOwnersService.getBusinessOwners(userId);
        
        return res.json({
            ok: true,
            data: owners,
        });
    } catch (error: unknown) {
        console.error('[GET /api/business-owners] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});

/**
 * POST /api/business-owners
 * Add a new business owner
 * 
 * Body: { fullName: string, email: string }
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = toNumberId(req.user!.id);
        if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'unauthenticated' });
        const { fullName, email } = req.body;
        
        if (!fullName || !email) {
            return res.status(400).json({
                ok: false,
                error: 'validation_error',
                message: 'fullName and email are required',
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim().toLowerCase())) {
            return res.status(400).json({
                ok: false,
                error: 'validation_error',
                message: 'Invalid email format',
            });
        }
        
        const result = await businessOwnersService.createBusinessOwner(
            userId,
            fullName,
            email
        );
        
        // If this is the first owner added, clear owners_pending_info flag
        const pool = getPool();
        await pool.query(
            `UPDATE "user" 
             SET owners_pending_info = false
             WHERE id = $1 AND owners_pending_info = true`,
            [userId]
        );
        
        return res.json({
            ok: true,
            data: {
                id: result.id,
                fullName,
                email,
                message: 'Business owner added and verification email sent',
            },
        });
    } catch (error: unknown) {
        console.error('[POST /api/business-owners] error:', error);
        return res.status(400).json({
            ok: false,
            error: 'validation_error',
            message: (error instanceof Error && error.message) ? error.message : 'Failed to add business owner',
        });
    }
});

/**
 * POST /api/business-owners/:id/resend
 * Resend verification invite for a business owner
 */
router.post('/:id/resend', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = toNumberId(req.user!.id);
        if (!Number.isFinite(userId)) return res.status(401).json({ ok: false, error: 'unauthenticated' });
        const ownerId = parseInt(req.params.id, 10);
        
        if (isNaN(ownerId)) {
            return res.status(400).json({
                ok: false,
                error: 'validation_error',
                message: 'Invalid owner ID',
            });
        }
        
        // Verify owner belongs to user
        const pool = getPool();
        const ownerCheck = await pool.query(
            'SELECT id FROM business_owner WHERE id = $1 AND user_id = $2',
            [ownerId, userId]
        );
        
        if (ownerCheck.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: 'not_found',
                message: 'Business owner not found',
            });
        }
        
        await businessOwnersService.resendBusinessOwnerInvite(ownerId);
        
        return res.json({
            ok: true,
            data: {
                message: 'Verification email resent',
            },
        });
    } catch (error: any) {
        console.error('[POST /api/business-owners/:id/resend] error:', error);
        return res.status(400).json({
            ok: false,
            error: 'validation_error',
            message: error.message || 'Failed to resend invite',
        });
    }
});

/**
 * GET /api/business-owners/verify?token=...
 * Verify invite token (public, no auth required)
 */
router.get('/verify', async (req: Request, res: Response) => {
    try {
        const token = req.query.token as string;
        
        if (!token) {
            return res.json({
                ok: true,
                data: {
                    valid: false,
                    message: 'Token is required',
                },
            });
        }
        
        const owner = await businessOwnersService.verifyBusinessOwnerInviteToken(token);
        
        if (!owner) {
            return res.json({
                ok: true,
                data: {
                    valid: false,
                    message: 'Invalid or expired token',
                },
            });
        }
        
        return res.json({
            ok: true,
            data: {
                valid: true,
                owner: {
                    id: owner.ownerId,
                    fullName: owner.fullName,
                    email: owner.email,
                },
            },
        });
    } catch (error: any) {
        console.error('[GET /api/business-owners/verify] error:', error);
        return res.json({
            ok: true,
            data: {
                valid: false,
                message: 'Error verifying token',
            },
        });
    }
});

/**
 * POST /api/business-owners/verify/start
 * Start identity verification for a business owner (public, no auth required)
 * 
 * Body: { token: string }
 */
router.post('/verify/start', async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.json({
                ok: true,
                data: {
                    started: false,
                    message: 'Token is required',
                },
            });
        }
        
        const owner = await businessOwnersService.verifyBusinessOwnerInviteToken(token);
        
        if (!owner) {
            return res.json({
                ok: true,
                data: {
                    started: false,
                    message: 'Invalid or expired token',
                },
            });
        }
        
        // Mark invite as used
        await businessOwnersService.markBusinessOwnerInviteUsed(token);
        
        // TODO: Start Sumsub verification flow
        // For now, just mark as pending
        const pool = getPool();
        await pool.query(
            `UPDATE business_owner 
             SET kyc_id_status = 'pending', kyc_updated_at = NOW()
             WHERE id = $1`,
            [owner.ownerId]
        );
        
        return res.json({
            ok: true,
            data: {
                started: true,
                message: 'Identity verification started',
            },
        });
    } catch (error: any) {
        console.error('[POST /api/business-owners/verify/start] error:', error);
        return res.json({
            ok: true,
            data: {
                started: false,
                message: 'Error starting verification',
            },
        });
    }
});

export default router;

