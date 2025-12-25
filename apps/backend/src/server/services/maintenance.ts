import { concurrencyService } from '../services/concurrency';
import { getPool } from '../db';
import { logger } from '../../lib/logger';

export class SystemMaintenanceService {
    private static instance: SystemMaintenanceService;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    static getInstance(): SystemMaintenanceService {
        if (!SystemMaintenanceService.instance) {
            SystemMaintenanceService.instance = new SystemMaintenanceService();
        }
        return SystemMaintenanceService.instance;
    }

    /**
     * Start the maintenance service
     */
    start(): void {
        if (this.isRunning) {
            logger.debug('[SystemMaintenance] Service already running');
            return;
        }

        logger.info('[SystemMaintenance] Starting maintenance service...');
        this.isRunning = true;

        // Run cleanup every 5 minutes
        this.cleanupInterval = setInterval(async () => {
            await this.performMaintenance();
        }, 5 * 60 * 1000);

        // Run initial cleanup
        this.performMaintenance();
    }

    /**
     * Stop the maintenance service
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        logger.info('[SystemMaintenance] Stopping maintenance service...');
        this.isRunning = false;

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Perform system maintenance tasks
     */
    private async performMaintenance(): Promise<void> {
        try {
            logger.debug('[SystemMaintenance] Performing maintenance tasks...');
            
            // 1. Clean up expired locks
            const expiredLocksCleaned = await concurrencyService.cleanupExpiredLocks();
            if (expiredLocksCleaned > 0) {
                logger.info('[SystemMaintenance] Cleaned up expired locks', { count: expiredLocksCleaned });
            }

            // 2. Clean up old admin activity logs (keep last 30 days)
            await this.cleanupOldActivityLogs();

            // 3. Clean up old concurrent operations
            await this.cleanupOldConcurrentOperations();

            // 4. Update system metrics
            await this.updateSystemMetrics();

            logger.debug('[SystemMaintenance] Maintenance completed successfully');
        } catch (error) {
            logger.error('[SystemMaintenance] Error during maintenance', { message: (error as any)?.message ?? String(error) });
        }
    }

    /**
     * Clean up old admin activity logs
     */
    private async cleanupOldActivityLogs(): Promise<void> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                `DELETE FROM admin_activity 
                 WHERE created_at < NOW() - INTERVAL '30 days'`
            );
            
            if (result.rowCount && result.rowCount > 0) {
                logger.info('[SystemMaintenance] Cleaned up old activity logs', { count: result.rowCount });
            }
        } catch (error) {
            logger.error('[SystemMaintenance] Error cleaning up activity logs', { message: (error as any)?.message ?? String(error) });
        }
    }

    /**
     * Clean up old concurrent operations
     */
    private async cleanupOldConcurrentOperations(): Promise<void> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                `DELETE FROM concurrent_operations 
                 WHERE started_at < NOW() - INTERVAL '7 days' 
                 AND status IN ('completed', 'failed')`
            );
            
            if (result.rowCount && result.rowCount > 0) {
                logger.info('[SystemMaintenance] Cleaned up old concurrent operations', { count: result.rowCount });
            }
        } catch (error) {
            logger.error('[SystemMaintenance] Error cleaning up concurrent operations', { message: (error as any)?.message ?? String(error) });
        }
    }

    /**
     * Update system metrics
     */
    private async updateSystemMetrics(): Promise<void> {
        const pool = getPool();
        
        try {
            // Get current system stats
            const stats = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM admin_operation_locks WHERE expires_at > NOW()) as active_locks,
                    (SELECT COUNT(*) FROM forwarding_request WHERE status = 'requested') as pending_requests,
                    (SELECT COUNT(*) FROM mail_item WHERE status = 'received') as pending_mail,
                    (SELECT COUNT(*) FROM "user" WHERE status = 'active' AND deleted_at IS NULL) as active_users,
                    (SELECT COUNT(*) FROM admin_activity WHERE created_at > NOW() - INTERVAL '1 hour') as recent_activity
            `);
            
            const systemStats = stats.rows[0];
            logger.debug('[SystemMaintenance] System stats', systemStats);
            
            // Log any concerning metrics
            if (systemStats.active_locks > 100) {
                logger.warn('[SystemMaintenance] High number of active locks', { active_locks: systemStats.active_locks });
            }
            
            if (systemStats.pending_requests > 500) {
                logger.warn('[SystemMaintenance] High number of pending requests', { pending_requests: systemStats.pending_requests });
            }
            
        } catch (error) {
            logger.error('[SystemMaintenance] Error updating system metrics', { message: (error as any)?.message ?? String(error) });
        }
    }

    /**
     * Force cleanup of all expired locks (emergency function)
     */
    async emergencyCleanup(): Promise<void> {
        logger.warn('[SystemMaintenance] Performing emergency cleanup...');
        
        try {
            const pool = getPool();
            
            // Force delete all expired locks
            const result = await pool.query(
                'DELETE FROM admin_operation_locks WHERE expires_at < NOW()'
            );
            
            logger.warn('[SystemMaintenance] Emergency cleanup completed', { removed: result.rowCount || 0 });
        } catch (error) {
            logger.error('[SystemMaintenance] Error during emergency cleanup', { message: (error as any)?.message ?? String(error) });
        }
    }

    /**
     * Get system health status
     */
    async getSystemHealth(): Promise<{
        healthy: boolean;
        activeLocks: number;
        pendingRequests: number;
        pendingMail: number;
        recentActivity: number;
        issues: string[];
    }> {
        const pool = getPool();
        const issues: string[] = [];
        
        try {
            const stats = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM admin_operation_locks WHERE expires_at > NOW()) as active_locks,
                    (SELECT COUNT(*) FROM forwarding_request WHERE status = 'requested') as pending_requests,
                    (SELECT COUNT(*) FROM mail_item WHERE status = 'received') as pending_mail,
                    (SELECT COUNT(*) FROM admin_activity WHERE created_at > NOW() - INTERVAL '1 hour') as recent_activity
            `);
            
            const systemStats = stats.rows[0];
            
            // Check for issues
            if (systemStats.active_locks > 100) {
                issues.push(`High number of active locks: ${systemStats.active_locks}`);
            }
            
            if (systemStats.pending_requests > 500) {
                issues.push(`High number of pending requests: ${systemStats.pending_requests}`);
            }
            
            if (systemStats.pending_mail > 1000) {
                issues.push(`High number of pending mail: ${systemStats.pending_mail}`);
            }
            
            return {
                healthy: issues.length === 0,
                activeLocks: parseInt(systemStats.active_locks),
                pendingRequests: parseInt(systemStats.pending_requests),
                pendingMail: parseInt(systemStats.pending_mail),
                recentActivity: parseInt(systemStats.recent_activity),
                issues
            };
        } catch (error) {
            logger.error('[SystemMaintenance] Error getting system health', { message: (error as any)?.message ?? String(error) });
            return {
                healthy: false,
                activeLocks: 0,
                pendingRequests: 0,
                pendingMail: 0,
                recentActivity: 0,
                issues: ['Failed to get system health status']
            };
        }
    }
}

// Export singleton instance
export const systemMaintenance = SystemMaintenanceService.getInstance();
