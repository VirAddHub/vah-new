// apps/backend/src/server/routes/admin-activity.ts
// Admin activity endpoints for dashboard

import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';

const router = Router();

// Helper to format timestamps
function formatTimestamp(timestamp: number | string): string {
    if (typeof timestamp === 'string') {
        // If it's an ISO string, parse it
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    }
    // Assume it's a Unix timestamp in milliseconds
    return new Date(timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

// Helper to format admin action titles
function formatAdminAction(action: string): string {
    const actionMap: { [key: string]: string } = {
        'user_created': 'New User Created',
        'user_updated': 'User Profile Updated',
        'user_deleted': 'User Deleted',
        'plan_update': 'Plan Details Updated',
        'kyc_verified': 'KYC Status Verified',
        'kyc_rejected': 'KYC Status Rejected',
        'mail_processed': 'Mail Processed',
        'forwarding_requested': 'Forwarding Requested',
        'forwarding_dispatched': 'Mail Dispatched',
        'forwarding_delivered': 'Mail Delivered'
    };
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper to format user activity titles
function formatUserActivityTitle(action: string): string {
    const actionMap: { [key: string]: string } = {
        'login': 'User Login',
        'signup': 'New User Registration',
        'mail_viewed': 'Mail Viewed',
        'mail_downloaded': 'Mail Downloaded',
        'forwarding_requested': 'Forwarding Requested',
        'profile_updated': 'Profile Updated',
        'password_changed': 'Password Changed' // pragma: allowlist secret
    };
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper to format mail event titles
function formatMailEventTitle(eventType: string): string {
    const eventMap: { [key: string]: string } = {
        'mail.received': 'Mail Received',
        'mail.scanned': 'Mail Scanned',
        'mail.forwarded': 'Mail Forwarded',
        'mail.downloaded': 'Mail Downloaded',
        'mail.deleted': 'Mail Deleted'
    };
    return eventMap[eventType] || eventType.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * GET /api/admin/activity
 * Get recent activity for admin dashboard
 */
// Helper to get icon name from event type
function iconName(eventType: string): string {
    const type = eventType.toLowerCase();
    if (type.includes('mail') || type.includes('scanned') || type.includes('received')) return 'Mail';
    if (type.includes('forward')) return 'Package';
    if (type.includes('payment') || type.includes('invoice')) return 'CreditCard';
    if (type.includes('kyc')) return 'ShieldCheck';
    if (type.includes('user') || type.includes('signup') || type.includes('registration')) return 'User';
    return 'Activity';
}

// Helper to generate href for activity item
function activityHref(activity: any): string {
    const type = activity.type || '';
    const eventType = activity.event_type || activity.action || '';

    if (activity.mail_item_id) {
        return `/admin/mail/${activity.mail_item_id}`;
    }
    if (activity.forwarding_request_id) {
        return `/admin/forwarding/${activity.forwarding_request_id}`;
    }
    if (activity.user_id && (eventType.includes('user') || eventType.includes('kyc'))) {
        return `/admin/users/${activity.user_id}${eventType.includes('kyc') ? '#kyc' : ''}`;
    }
    if (activity.invoice_id) {
        return `/admin/billing/invoices/${activity.invoice_id}`;
    }
    return '/admin/activity';
}

router.get('/activity', requireAdmin, async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    try {
        const pool = getPool();

        // Initialize empty results
        let adminLogsResult = { rows: [] };
        let userActivityResult = { rows: [] };
        let mailEventsResult = { rows: [] };
        let recentUsersResult = { rows: [] };
        let recentMailResult = { rows: [] };

        // Try to get data from tables, but handle missing tables gracefully
        try {
            // Check if tables exist first
            const tableCheck = await pool.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('admin_log', 'activity_log', 'mail_event')
            `);

            const existingTables = tableCheck.rows.map(row => row.table_name);

            // Get recent activity from existing tables only
            if (existingTables.includes('admin_log')) {
                try {
                    adminLogsResult = await pool.query(`
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
                    `);
                } catch (error) {
                    console.warn('[AdminActivity] Error querying admin_log:', (error as Error).message);
                }
            }

            if (existingTables.includes('activity_log')) {
                try {
                    userActivityResult = await pool.query(`
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
                    `);
                } catch (error) {
                    console.warn('[AdminActivity] Error querying activity_log:', (error as Error).message);
                }
            }

            if (existingTables.includes('mail_event')) {
                try {
                    mailEventsResult = await pool.query(`
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
                    `);
                } catch (error) {
                    console.warn('[AdminActivity] Error querying mail_event:', (error as Error).message);
                }
            }

        } catch (tableError) {
            console.warn('[AdminActivity] Error checking table existence:', (tableError as Error).message);
        }

        // Always get recent users and mail (these tables should exist)
        try {
            recentUsersResult = await pool.query(`
                SELECT id, email, first_name, last_name, created_at
                FROM "user"
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT 10
            `);
        } catch (error) {
            console.warn('[AdminActivity] Error querying users:', (error as Error).message);
        }

        try {
            recentMailResult = await pool.query(`
                SELECT id, subject, sender_name, created_at, user_id
                FROM mail_item
                WHERE deleted = false
                ORDER BY created_at DESC
                LIMIT 10
            `);
        } catch (error) {
            console.warn('[AdminActivity] Error querying mail_items:', (error as Error).message);
        }

        // Format activities for display with enhanced structure
        const activities: any[] = [];

        // Add admin actions
        adminLogsResult.rows.forEach((log: any) => {
            const eventType = log.action_type || 'admin_action';
            activities.push({
                id: `admin_${log.id}`,
                at: log.created_at,
                type: eventType,
                event_type: eventType,
                user_id: log.admin_user_id,
                title: formatAdminAction(log.action_type),
                description: `${log.admin_first_name || log.admin_email} ${log.action_type.replace(/_/g, ' ')}`,
                time: formatTimestamp(log.created_at),
                timestamp: log.created_at,
                details: log.details,
                icon: iconName(eventType),
                href: activityHref({ type: 'admin', user_id: log.target_id, event_type: eventType }),
            });
        });

        // Add user activities
        userActivityResult.rows.forEach((log: any) => {
            const eventType = log.action || 'user_action';
            activities.push({
                id: `user_${log.id}`,
                at: log.created_at,
                type: eventType,
                event_type: eventType,
                user_id: log.user_id,
                mail_item_id: log.mail_item_id,
                title: formatUserActivityTitle(log.action),
                description: `${log.user_first_name || log.user_email} ${log.action.replace(/_/g, ' ')}`,
                time: formatTimestamp(log.created_at),
                timestamp: log.created_at,
                details: log.details,
                icon: iconName(eventType),
                href: activityHref({ type: 'user', user_id: log.user_id, mail_item_id: log.mail_item_id, event_type: eventType }),
            });
        });

        // Add mail events
        mailEventsResult.rows.forEach((event: any) => {
            const eventType = event.event_type || 'mail_event';
            activities.push({
                id: `mail_${event.id}`,
                at: event.created_at,
                type: eventType,
                event_type: eventType,
                user_id: event.user_id,
                mail_item_id: event.mail_item_id,
                title: formatMailEventTitle(event.event_type),
                description: `${event.user_first_name || event.user_email} - ${event.subject || 'Mail Event'}`,
                time: formatTimestamp(event.created_at),
                timestamp: event.created_at,
                details: event.details,
                icon: iconName(eventType),
                href: activityHref({ type: 'mail', mail_item_id: event.mail_item_id, event_type: eventType }),
            });
        });

        // Add recent user signups
        recentUsersResult.rows.forEach((user: any) => {
            activities.push({
                id: `signup_${user.id}`,
                at: user.created_at,
                type: 'user_created',
                event_type: 'user_created',
                user_id: user.id,
                title: 'New User Registration',
                description: `${user.first_name || user.email} signed up`,
                time: formatTimestamp(user.created_at),
                timestamp: user.created_at,
                details: { email: user.email },
                icon: iconName('user_created'),
                href: activityHref({ type: 'signup', user_id: user.id, event_type: 'user_created' }),
            });
        });

        // Add recent mail items
        recentMailResult.rows.forEach((mail: any) => {
            activities.push({
                id: `mail_item_${mail.id}`,
                at: mail.created_at,
                type: 'mail_received',
                event_type: 'mail_received',
                user_id: mail.user_id,
                mail_item_id: mail.id,
                title: 'Mail Received',
                description: `${mail.subject || 'Mail Item'} received`,
                time: formatTimestamp(mail.created_at),
                timestamp: mail.created_at,
                details: { subject: mail.subject, sender: mail.sender_name },
                icon: iconName('mail_received'),
                href: activityHref({ type: 'mail_item', mail_item_id: mail.id, event_type: 'mail_received' }),
            });
        });

        // Sort by timestamp (most recent first)
        activities.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Calculate today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const todaySignups = recentUsersResult.rows.filter((user: any) =>
            user.created_at >= todayTimestamp
        ).length;

        const todayMail = recentMailResult.rows.filter((mail: any) =>
            mail.created_at >= todayTimestamp
        ).length;

        const todayForwarding = activities.filter((activity: any) =>
            activity.type === 'mail' &&
            activity.title.includes('Forward') &&
            activity.timestamp >= todayTimestamp
        ).length;

        // Return in new format with items array
        const items = activities.slice(offset, offset + limit).map((a: any) => ({
            id: a.id,
            at: a.at || a.timestamp,
            type: a.type || a.event_type,
            event_type: a.event_type || a.type,
            user_id: a.user_id,
            mail_item_id: a.mail_item_id,
            forwarding_request_id: a.forwarding_request_id,
            invoice_id: a.invoice_id,
            details: a.details,
            href: a.href,
            icon: a.icon,
            title: a.title,
            description: a.description,
            time: a.time,
        }));

        return res.json({
            ok: true,
            items,
            next_offset: offset + items.length,
            total: activities.length,
            todayStats: {
                newSignups: todaySignups,
                mailProcessed: todayMail,
                forwardingRequests: todayForwarding
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

export default router;