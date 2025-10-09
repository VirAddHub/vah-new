// src/server/routes/admin-stats.ts
// Admin statistics endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import { cachedAdminQuery } from '../../lib/query-cache';

const router = Router();

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
        // Calculate time ranges
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);

        // Execute all queries in parallel with caching
        const [
            userCountResult,
            recentUsersResult,
            previousUsersResult,
            mailCountResult,
            recentMailResult,
            previousMailResult,
            activeForwardsResult
        ] = await Promise.all([
            cachedAdminQuery('SELECT COUNT(*) as total FROM "user" WHERE deleted_at IS NULL'),
            cachedAdminQuery('SELECT COUNT(*) as count FROM "user" WHERE created_at >= $1 AND deleted_at IS NULL', [thirtyDaysAgo]),
            cachedAdminQuery('SELECT COUNT(*) as count FROM "user" WHERE created_at >= $1 AND created_at < $2 AND deleted_at IS NULL', [sixtyDaysAgo, thirtyDaysAgo]),
            cachedAdminQuery('SELECT COUNT(*) as total FROM mail_item WHERE deleted = false'),
            cachedAdminQuery('SELECT COUNT(*) as count FROM mail_item WHERE created_at >= $1 AND deleted = false', [thirtyDaysAgo]),
            cachedAdminQuery('SELECT COUNT(*) as count FROM mail_item WHERE created_at >= $1 AND created_at < $2 AND deleted = false', [sixtyDaysAgo, thirtyDaysAgo]),
            cachedAdminQuery('SELECT COUNT(*) as count FROM mail_item WHERE forwarded_physically = true AND scanned = true AND deleted = false')
        ]);

        const totalUsers = parseInt(userCountResult[0]?.total || '0');
        const recentUsers = parseInt(recentUsersResult[0]?.count || '0');
        const previousUsers = parseInt(previousUsersResult[0]?.count || '0');
        const userGrowth = previousUsers > 0
            ? Math.round(((recentUsers - previousUsers) / previousUsers) * 100)
            : 0;

        const mailProcessed = parseInt(mailCountResult[0]?.total || '0');
        const recentMail = parseInt(recentMailResult[0]?.count || '0');
        const previousMail = parseInt(previousMailResult[0]?.count || '0');
        const mailGrowth = previousMail > 0
            ? Math.round(((recentMail - previousMail) / previousMail) * 100)
            : 0;

        const activeForwards = parseInt(activeForwardsResult[0]?.count || '0');

        // Revenue calculations would go here if you have billing data
        // For now, using placeholder values
        const monthlyRevenue = 0;
        const revenueGrowth = 0;
        const forwardGrowth = 0;

        return res.json({
            ok: true,
            data: {
                totalUsers,
                monthlyRevenue,
                mailProcessed,
                activeForwards,
                userGrowth,
                revenueGrowth,
                mailGrowth,
                forwardGrowth
            }
        });
    } catch (error: any) {
        console.error('[GET /api/admin/stats] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

export default router;
