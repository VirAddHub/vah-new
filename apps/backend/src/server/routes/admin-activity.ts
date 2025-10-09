// apps/backend/src/server/routes/admin-activity.ts
// Admin activity endpoints for dashboard

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/admin/activity
 * Get recent activity for admin dashboard
 */
router.get('/activity', requireAdmin, async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        
        // Get recent activity from multiple sources
        const [
            adminLogsResult,
            userActivityResult,
            mailEventsResult,
            recentUsersResult,
            recentMailResult
        ] = await Promise.all([
            // Recent admin actions
            pool.query(`
                SELECT 
                    al.id,
                    al.created_at,
                    al.action_type,
                    al.target_type,
                    al.target_id,
                    al.details,
                    u.email as admin_email,
                    u.first_name as admin_first_name,
                    u.last_name as admin_last_name
                FROM admin_log al
                LEFT JOIN "user" u ON u.id = al.admin_user_id
                ORDER BY al.created_at DESC
                LIMIT 10
            `),
            
            // Recent user activities
            pool.query(`
                SELECT 
                    al.id,
                    al.created_at,
                    al.action,
                    al.details,
                    u.email as user_email,
                    u.first_name as user_first_name,
                    u.last_name as user_last_name
                FROM activity_log al
                LEFT JOIN "user" u ON u.id = al.user_id
                ORDER BY al.created_at DESC
                LIMIT 10
            `),
            
            // Recent mail events
            pool.query(`
                SELECT 
                    me.id,
                    me.created_at,
                    me.event_type,
                    me.details,
                    mi.subject,
                    u.email as user_email,
                    u.first_name as user_first_name,
                    u.last_name as user_last_name
                FROM mail_event me
                LEFT JOIN mail_item mi ON mi.id = me.mail_item
                LEFT JOIN "user" u ON u.id = mi.user_id
                ORDER BY me.created_at DESC
                LIMIT 10
            `),
            
            // Recent user registrations
            pool.query(`
                SELECT 
                    id,
                    created_at,
                    email,
                    first_name,
                    last_name,
                    'user_registered' as action_type
                FROM "user"
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 5
            `),
            
            // Recent mail items
            pool.query(`
                SELECT 
                    mi.id,
                    mi.created_at,
                    mi.subject,
                    mi.status,
                    u.email as user_email,
                    u.first_name as user_first_name,
                    u.last_name as user_last_name
                FROM mail_item mi
                LEFT JOIN "user" u ON u.id = mi.user_id
                WHERE mi.deleted = false
                ORDER BY mi.created_at DESC
                LIMIT 5
            `)
        ]);

        // Format activities for display
        const activities: any[] = [];

        // Add admin actions
        adminLogsResult.rows.forEach((log: any) => {
            activities.push({
                id: `admin_${log.id}`,
                type: 'admin_action',
                title: formatAdminActionTitle(log.action_type, log.target_type),
                description: formatAdminActionDescription(log),
                time: formatTimeAgo(log.created_at),
                timestamp: log.created_at,
                admin: log.admin_email ? `${log.admin_first_name} ${log.admin_last_name}` : 'System'
            });
        });

        // Add user activities
        userActivityResult.rows.forEach((activity: any) => {
            activities.push({
                id: `user_${activity.id}`,
                type: 'user_activity',
                title: formatUserActivityTitle(activity.action),
                description: formatUserActivityDescription(activity),
                time: formatTimeAgo(activity.created_at),
                timestamp: activity.created_at,
                user: activity.user_email ? `${activity.user_first_name} ${activity.user_last_name}` : 'Unknown User'
            });
        });

        // Add mail events
        mailEventsResult.rows.forEach((event: any) => {
            activities.push({
                id: `mail_${event.id}`,
                type: 'mail_event',
                title: formatMailEventTitle(event.event_type),
                description: formatMailEventDescription(event),
                time: formatTimeAgo(event.created_at),
                timestamp: event.created_at,
                user: event.user_email ? `${event.user_first_name} ${event.user_last_name}` : 'Unknown User'
            });
        });

        // Add recent users
        recentUsersResult.rows.forEach((user: any) => {
            activities.push({
                id: `new_user_${user.id}`,
                type: 'user_registration',
                title: 'New User Registration',
                description: `${user.first_name} ${user.last_name} (${user.email}) joined`,
                time: formatTimeAgo(user.created_at),
                timestamp: user.created_at,
                user: `${user.first_name} ${user.last_name}`
            });
        });

        // Add recent mail items
        recentMailResult.rows.forEach((mail: any) => {
            activities.push({
                id: `new_mail_${mail.id}`,
                type: 'mail_received',
                title: 'New Mail Received',
                description: `"${mail.subject || 'No subject'}" for ${mail.user_first_name} ${mail.user_last_name}`,
                time: formatTimeAgo(mail.created_at),
                timestamp: mail.created_at,
                user: `${mail.user_first_name} ${mail.user_last_name}`
            });
        });

        // Sort by timestamp and limit to 20 most recent
        activities.sort((a, b) => b.timestamp - a.timestamp);
        const recentActivities = activities.slice(0, 20);

        // Get today's counts
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMs = todayStart.getTime();
        
        const [
            todaySignupsResult,
            todayMailResult,
            todayForwardingResult
        ] = await Promise.all([
            // New signups today
            pool.query(`
                SELECT COUNT(*) as count
                FROM "user"
                WHERE created_at >= $1 AND deleted_at IS NULL
            `, [todayStartMs]),
            
            // Mail processed today
            pool.query(`
                SELECT COUNT(*) as count
                FROM mail_item
                WHERE created_at >= $1 AND deleted = false
            `, [todayStartMs]),
            
            // Forwarding requests today
            pool.query(`
                SELECT COUNT(*) as count
                FROM forwarding_request
                WHERE created_at >= $1
            `, [todayStartMs])
        ]);

        const todaySignups = parseInt(todaySignupsResult.rows[0]?.count || '0');
        const todayMail = parseInt(todayMailResult.rows[0]?.count || '0');
        const todayForwarding = parseInt(todayForwardingResult.rows[0]?.count || '0');

        return res.json({
            ok: true,
            data: {
                activities: recentActivities,
                todayStats: {
                    newSignups: todaySignups,
                    mailProcessed: todayMail,
                    forwardingRequests: todayForwarding
                }
            }
        });

    } catch (error: any) {
        console.error('[GET /api/admin/activity] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'database_error',
            message: error.message
        });
    }
});

// Helper functions to format activity data
function formatAdminActionTitle(actionType: string, targetType?: string): string {
    const actionMap: { [key: string]: string } = {
        'user_update': 'User Updated',
        'user_create': 'User Created',
        'user_delete': 'User Deleted',
        'mail_update': 'Mail Item Updated',
        'mail_delete': 'Mail Item Deleted',
        'plan_update': 'Plan Updated',
        'kyc_verify': 'KYC Verification',
        'forwarding_update': 'Forwarding Request Updated',
        'system_config': 'System Configuration Changed'
    };
    
    return actionMap[actionType] || `${actionType} on ${targetType || 'unknown'}`;
}

function formatAdminActionDescription(log: any): string {
    if (log.details) {
        try {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            if (details.changes) {
                return `Changes: ${Object.keys(details.changes).join(', ')}`;
            }
            if (details.reason) {
                return details.reason;
            }
        } catch (e) {
            return log.details;
        }
    }
    
    if (log.target_type && log.target_id) {
        return `${log.target_type} #${log.target_id}`;
    }
    
    return 'Admin action performed';
}

function formatUserActivityTitle(action: string): string {
    const actionMap: { [key: string]: string } = {
        'login': 'User Login',
        'logout': 'User Logout',
        'mail_view': 'Mail Viewed',
        'mail_download': 'Mail Downloaded',
        'forwarding_request': 'Forwarding Requested',
        'profile_update': 'Profile Updated',
        'password_change': 'Account Security Updated'
    };
    
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatUserActivityDescription(activity: any): string {
    if (activity.details) {
        try {
            const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
            if (details.mail_item_id) {
                return `Mail item #${details.mail_item_id}`;
            }
            if (details.ip_address) {
                return `From IP: ${details.ip_address}`;
            }
        } catch (e) {
            return activity.details;
        }
    }
    
    return 'User activity';
}

function formatMailEventTitle(eventType: string): string {
    const eventMap: { [key: string]: string } = {
        'mail.received': 'Mail Received',
        'mail.scanned': 'Mail Scanned',
        'mail.forwarded': 'Mail Forwarded',
        'mail.deleted': 'Mail Deleted',
        'forwarding.requested': 'Forwarding Requested',
        'forwarding.processed': 'Forwarding Processed',
        'forwarding.dispatched': 'Mail Dispatched',
        'forwarding.delivered': 'Mail Delivered'
    };
    
    return eventMap[eventType] || eventType.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatMailEventDescription(event: any): string {
    if (event.subject) {
        return `"${event.subject}"`;
    }
    
    if (event.details) {
        try {
            const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
            if (details.tracking_number) {
                return `Tracking: ${details.tracking_number}`;
            }
            if (details.courier) {
                return `Courier: ${details.courier}`;
            }
        } catch (e) {
            return event.details;
        }
    }
    
    return 'Mail event occurred';
}

function formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
}

export default router;
