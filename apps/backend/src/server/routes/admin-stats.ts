// src/server/routes/admin-stats.ts
// Admin statistics endpoints

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
    const pool = getPool();

    try {
        // Get total users
        const userCountResult = await pool.query('SELECT COUNT(*) as total FROM "user"');
        const totalUsers = parseInt(userCountResult.rows[0].total);

        // Get user growth (users created in last 30 days vs previous 30 days)
        const recentUsersResult = await pool.query(
            'SELECT COUNT(*) as count FROM "user" WHERE created_at >= NOW() - INTERVAL \'30 days\''
        );
        const previousUsersResult = await pool.query(
            'SELECT COUNT(*) as count FROM "user" WHERE created_at >= NOW() - INTERVAL \'60 days\' AND created_at < NOW() - INTERVAL \'30 days\''
        );

        const recentUsers = parseInt(recentUsersResult.rows[0].count);
        const previousUsers = parseInt(previousUsersResult.rows[0].count);
        const userGrowth = previousUsers > 0
            ? Math.round(((recentUsers - previousUsers) / previousUsers) * 100)
            : 0;

        // Get total mail items processed
        const mailCountResult = await pool.query('SELECT COUNT(*) as total FROM mail_item');
        const mailProcessed = parseInt(mailCountResult.rows[0].total);

        // Get mail growth
        const recentMailResult = await pool.query(
            'SELECT COUNT(*) as count FROM mail_item WHERE created_at >= NOW() - INTERVAL \'30 days\''
        );
        const previousMailResult = await pool.query(
            'SELECT COUNT(*) as count FROM mail_item WHERE created_at >= NOW() - INTERVAL \'60 days\' AND created_at < NOW() - INTERVAL \'30 days\''
        );

        const recentMail = parseInt(recentMailResult.rows[0].count);
        const previousMail = parseInt(previousMailResult.rows[0].count);
        const mailGrowth = previousMail > 0
            ? Math.round(((recentMail - previousMail) / previousMail) * 100)
            : 0;

        // Get active forwarding requests (pending/processing status)
        const activeForwardsResult = await pool.query(
            `SELECT COUNT(*) as count FROM mail_item
             WHERE forwarded_physically = true AND scanned = true`
        );
        const activeForwards = parseInt(activeForwardsResult.rows[0].count);

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
