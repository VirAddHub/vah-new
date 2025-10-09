import { getPool } from '../db';

export interface AdminLock {
    resourceType: string;
    resourceId: number;
    adminId: number;
    operation: string;
    expiresAt: Date;
}

export interface ConcurrencyResult {
    success: boolean;
    newVersion?: number;
    errorMessage?: string;
    lockInfo?: AdminLock;
}

export class ConcurrencyService {
    private static instance: ConcurrencyService;
    private lockTimeouts = new Map<string, NodeJS.Timeout>();

    static getInstance(): ConcurrencyService {
        if (!ConcurrencyService.instance) {
            ConcurrencyService.instance = new ConcurrencyService();
        }
        return ConcurrencyService.instance;
    }

    /**
     * Acquire an admin lock for a resource
     */
    async acquireLock(
        resourceType: string,
        resourceId: number,
        adminId: number,
        operation: string,
        timeoutMinutes: number = 30
    ): Promise<boolean> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'SELECT acquire_admin_lock($1, $2, $3, $4, $5) as acquired',
                [resourceType, resourceId, adminId, operation, timeoutMinutes]
            );
            
            const acquired = result.rows[0].acquired;
            
            if (acquired) {
                // Set up automatic cleanup
                const lockKey = `${resourceType}:${resourceId}`;
                const timeoutMs = timeoutMinutes * 60 * 1000;
                
                // Clear existing timeout if any
                if (this.lockTimeouts.has(lockKey)) {
                    clearTimeout(this.lockTimeouts.get(lockKey)!);
                }
                
                // Set new timeout
                const timeout = setTimeout(() => {
                    this.releaseLock(resourceType, resourceId, adminId);
                    this.lockTimeouts.delete(lockKey);
                }, timeoutMs);
                
                this.lockTimeouts.set(lockKey, timeout);
            }
            
            return acquired;
        } catch (error) {
            console.error('Error acquiring lock:', error);
            return false;
        }
    }

    /**
     * Release an admin lock
     */
    async releaseLock(
        resourceType: string,
        resourceId: number,
        adminId: number
    ): Promise<boolean> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'SELECT release_admin_lock($1, $2, $3) as released',
                [resourceType, resourceId, adminId]
            );
            
            const released = result.rows[0].released;
            
            // Clear timeout
            const lockKey = `${resourceType}:${resourceId}`;
            if (this.lockTimeouts.has(lockKey)) {
                clearTimeout(this.lockTimeouts.get(lockKey)!);
                this.lockTimeouts.delete(lockKey);
            }
            
            return released;
        } catch (error) {
            console.error('Error releasing lock:', error);
            return false;
        }
    }

    /**
     * Check if a resource is locked
     */
    async isResourceLocked(
        resourceType: string,
        resourceId: number
    ): Promise<AdminLock | null> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'SELECT * FROM is_resource_locked($1, $2)',
                [resourceType, resourceId]
            );
            
            const row = result.rows[0];
            
            if (!row.is_locked) {
                return null;
            }
            
            return {
                resourceType,
                resourceId,
                adminId: row.locked_by,
                operation: row.operation,
                expiresAt: row.expires_at
            };
        } catch (error) {
            console.error('Error checking lock status:', error);
            return null;
        }
    }

    /**
     * Update forwarding request with optimistic locking
     */
    async updateForwardingRequestSafe(
        id: number,
        adminId: number,
        status: string,
        version: number,
        metadata: any = {}
    ): Promise<ConcurrencyResult> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'SELECT * FROM update_forwarding_request_safe($1, $2, $3, $4, $5)',
                [id, adminId, status, version, JSON.stringify(metadata)]
            );
            
            const row = result.rows[0];
            
            return {
                success: row.success,
                newVersion: row.new_version,
                errorMessage: row.error_message
            };
        } catch (error) {
            console.error('Error updating forwarding request:', error);
            return {
                success: false,
                errorMessage: 'Database error occurred'
            };
        }
    }

    /**
     * Update mail item with optimistic locking
     */
    async updateMailItemSafe(
        id: number,
        adminId: number,
        status: string,
        version: number,
        metadata: any = {}
    ): Promise<ConcurrencyResult> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'SELECT * FROM update_mail_item_safe($1, $2, $3, $4, $5)',
                [id, adminId, status, version, JSON.stringify(metadata)]
            );
            
            const row = result.rows[0];
            
            return {
                success: row.success,
                newVersion: row.new_version,
                errorMessage: row.error_message
            };
        } catch (error) {
            console.error('Error updating mail item:', error);
            return {
                success: false,
                errorMessage: 'Database error occurred'
            };
        }
    }

    /**
     * Validate status transition
     */
    async validateStatusTransition(
        resourceType: string,
        fromStatus: string,
        toStatus: string
    ): Promise<boolean> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'SELECT validate_status_transition($1, $2, $3) as valid',
                [resourceType, fromStatus, toStatus]
            );
            
            return result.rows[0].valid;
        } catch (error) {
            console.error('Error validating status transition:', error);
            return false;
        }
    }

    /**
     * Get current version of a resource
     */
    async getResourceVersion(
        resourceType: string,
        resourceId: number
    ): Promise<number | null> {
        const pool = getPool();
        
        try {
            let tableName: string;
            switch (resourceType) {
                case 'forwarding_request':
                    tableName = 'forwarding_request';
                    break;
                case 'mail_item':
                    tableName = 'mail_item';
                    break;
                case 'user':
                    tableName = 'user';
                    break;
                default:
                    return null;
            }
            
            const result = await pool.query(
                `SELECT version FROM ${tableName} WHERE id = $1`,
                [resourceId]
            );
            
            return result.rows[0]?.version || null;
        } catch (error) {
            console.error('Error getting resource version:', error);
            return null;
        }
    }

    /**
     * Log admin activity
     */
    async logAdminActivity(
        adminId: number,
        resourceType: string,
        resourceId: number,
        action: string,
        oldStatus?: string,
        newStatus?: string,
        metadata: any = {},
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        const pool = getPool();
        
        try {
            await pool.query(
                `INSERT INTO admin_activity 
                 (admin_id, resource_type, resource_id, action, old_status, new_status, metadata, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [adminId, resourceType, resourceId, action, oldStatus, newStatus, JSON.stringify(metadata), ipAddress, userAgent]
            );
        } catch (error) {
            console.error('Error logging admin activity:', error);
        }
    }

    /**
     * Clean up expired locks
     */
    async cleanupExpiredLocks(): Promise<number> {
        const pool = getPool();
        
        try {
            const result = await pool.query('SELECT cleanup_expired_locks() as deleted_count');
            return result.rows[0].deleted_count;
        } catch (error) {
            console.error('Error cleaning up expired locks:', error);
            return 0;
        }
    }

    /**
     * Get admin activity for a resource
     */
    async getResourceActivity(
        resourceType: string,
        resourceId: number,
        limit: number = 50
    ): Promise<any[]> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                `SELECT aa.*, u.email as admin_email, u.first_name, u.last_name
                 FROM admin_activity aa
                 JOIN "user" u ON aa.admin_id = u.id
                 WHERE aa.resource_type = $1 AND aa.resource_id = $2
                 ORDER BY aa.created_at DESC
                 LIMIT $3`,
                [resourceType, resourceId, limit]
            );
            
            return result.rows;
        } catch (error) {
            console.error('Error getting resource activity:', error);
            return [];
        }
    }

    /**
     * Get all active locks for an admin
     */
    async getAdminLocks(adminId: number): Promise<AdminLock[]> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                `SELECT resource_type, resource_id, admin_id, operation, expires_at
                 FROM admin_operation_locks
                 WHERE admin_id = $1 AND expires_at > NOW()
                 ORDER BY locked_at DESC`,
                [adminId]
            );
            
            return result.rows.map(row => ({
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                adminId: row.admin_id,
                operation: row.operation,
                expiresAt: row.expires_at
            }));
        } catch (error) {
            console.error('Error getting admin locks:', error);
            return [];
        }
    }

    /**
     * Force release all locks for an admin (emergency cleanup)
     */
    async forceReleaseAdminLocks(adminId: number): Promise<number> {
        const pool = getPool();
        
        try {
            const result = await pool.query(
                'DELETE FROM admin_operation_locks WHERE admin_id = $1',
                [adminId]
            );
            
            return result.rowCount || 0;
        } catch (error) {
            console.error('Error force releasing admin locks:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const concurrencyService = ConcurrencyService.getInstance();
