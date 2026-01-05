// apps/backend/src/server/routes/admin-exports.ts
// Admin export endpoints (CSV downloads for compliance/audit)

import { Router, Request, Response } from 'express';
import { stringify } from 'csv-stringify/sync';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const router = Router();

// Rate limiting for exports - generous for admin usage
const adminExportsLimiter = rateLimit({
    windowMs: 60_000, // 1 minute
    limit: 10, // 10 exports per minute (reasonable for compliance downloads)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as any).user;
        return u?.id ? `admin-exports:${u.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res) => {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({ ok: false, error: "rate_limited" });
    },
});

// Apply admin auth to all routes
router.use(requireAdmin);

/**
 * Format date for CSV (DD/MM/YYYY)
 */
function formatDate(dateString: string | null): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
}

/**
 * Calculate destruction eligibility date (30 days from receipt)
 */
function getDestructionEligibilityDate(item: {
    received_at_ms: number | null;
    received_date: string | null;
    created_at: number | null;
}): string {
    let receivedDate: Date | null = null;

    if (item.received_at_ms) {
        receivedDate = new Date(item.received_at_ms);
    } else if (item.received_date) {
        receivedDate = new Date(item.received_date);
    } else if (item.created_at) {
        receivedDate = new Date(item.created_at);
    }

    if (!receivedDate || isNaN(receivedDate.getTime())) {
        return '';
    }

    const eligibilityDate = new Date(receivedDate);
    eligibilityDate.setDate(eligibilityDate.getDate() + 30);
    return formatDate(eligibilityDate.toISOString());
}

/**
 * GET /api/admin/exports/destruction-log
 * Export destruction log as CSV (admin only)
 * 
 * Query params:
 *   - from: optional date filter (YYYY-MM-DD)
 *   - to: optional date filter (YYYY-MM-DD)
 * 
 * Returns: CSV file download
 */
router.get('/destruction-log', requireAdmin, adminExportsLimiter, async (req: Request, res: Response) => {
    try {
        const pool = getPool();
        const { from, to } = req.query;

        // Build query with optional date filters
        let dateFilter = '';
        const params: any[] = [];
        
        if (from || to) {
            const conditions: string[] = [];
            if (from) {
                params.push(from);
                conditions.push(`m.physical_destruction_date >= $${params.length}::date`);
            }
            if (to) {
                params.push(to);
                conditions.push(`m.physical_destruction_date <= $${params.length}::date`);
            }
            if (conditions.length > 0) {
                dateFilter = `AND ${conditions.join(' AND ')}`;
            }
        }

        const query = `
            SELECT
                m.id AS mail_item_id,
                COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, u.email, 'Unknown') AS customer_name,
                u.id AS user_id,
                COALESCE(m.subject, '') || CASE WHEN m.sender_name IS NOT NULL THEN ' – ' || m.sender_name ELSE '' END AS mail_description,
                m.received_at_ms,
                m.received_date,
                m.created_at,
                m.physical_destruction_date,
                COALESCE(admin_user.first_name || ' ' || admin_user.last_name, admin_user.first_name, admin_user.last_name, admin_user.email, 'Unknown') AS staff_name,
                CASE 
                    WHEN admin_user.first_name IS NOT NULL AND admin_user.last_name IS NOT NULL THEN
                        UPPER(SUBSTRING(admin_user.first_name, 1, 1) || SUBSTRING(admin_user.last_name, 1, 1))
                    WHEN admin_user.first_name IS NOT NULL THEN
                        UPPER(SUBSTRING(admin_user.first_name, 1, 2))
                    WHEN admin_user.email IS NOT NULL THEN
                        UPPER(SUBSTRING(admin_user.email, 1, 2))
                    ELSE '—'
                END AS staff_signature,
                m.physical_destruction_date AS recorded_at
            FROM mail_item m
            JOIN "user" u ON u.id = m.user_id
            LEFT JOIN admin_audit ON admin_audit.target_type = 'mail_item' 
                AND admin_audit.target_id = m.id 
                AND admin_audit.action = 'physical_destruction_confirmed'
            LEFT JOIN "user" admin_user ON admin_user.id = admin_audit.admin_id
            WHERE m.physical_destruction_date IS NOT NULL
                AND (m.deleted IS NULL OR m.deleted = false)
                ${dateFilter}
            ORDER BY m.physical_destruction_date ASC
        `;

        const { rows } = await pool.query(query, params);

        // Transform rows for CSV
        const csvRows = rows.map((row: any) => {
            const customerNameWithId = `${row.customer_name} (ID: ${row.user_id})`;
            
            // Format receipt date - handle milliseconds, date strings, and null
            let receiptDate = '';
            if (row.received_at_ms) {
                try {
                    receiptDate = formatDate(new Date(row.received_at_ms).toISOString());
                } catch {
                    receiptDate = '';
                }
            } else if (row.received_date) {
                receiptDate = formatDate(row.received_date);
            } else if (row.created_at) {
                try {
                    // created_at might be milliseconds (number) or a date string
                    const createdDate = typeof row.created_at === 'number' 
                        ? new Date(row.created_at).toISOString()
                        : row.created_at;
                    receiptDate = formatDate(createdDate);
                } catch {
                    receiptDate = '';
                }
            }
            
            const eligibilityDate = getDestructionEligibilityDate({
                received_at_ms: row.received_at_ms,
                received_date: row.received_date,
                created_at: row.created_at
            });

            // Format recorded_at - handle TIMESTAMPTZ from database
            let recordedAt = '';
            if (row.recorded_at) {
                try {
                    // If it's already a string, use it directly; if it's a Date object, convert to ISO
                    const recordedDate = row.recorded_at instanceof Date 
                        ? row.recorded_at.toISOString()
                        : typeof row.recorded_at === 'string'
                        ? row.recorded_at
                        : new Date(row.recorded_at).toISOString();
                    recordedAt = formatDate(recordedDate);
                } catch {
                    recordedAt = '';
                }
            }

            return {
                'Mail Item ID': String(row.mail_item_id),
                'Customer Name / ID': customerNameWithId,
                'Mail Description': row.mail_description || '—',
                'Receipt Date': receiptDate,
                'Eligibility Date': eligibilityDate,
                'Destruction Method': 'Cross-cut shredder',
                'Staff Name': row.staff_name || 'Unknown',
                'Staff Signature / Initials': row.staff_signature || '—',
                'Notes': 'GDPR + HMRC AML compliance',
                'Recorded At': recordedAt
            };
        });

        // Generate CSV
        const csv = stringify(csvRows, {
            header: true,
            columns: [
                'Mail Item ID',
                'Customer Name / ID',
                'Mail Description',
                'Receipt Date',
                'Eligibility Date',
                'Destruction Method',
                'Staff Name',
                'Staff Signature / Initials',
                'Notes',
                'Recorded At'
            ]
        });

        // Set response headers for CSV download
        const filename = from || to 
            ? `destruction-log-${from || 'all'}-${to || 'all'}.csv`
            : `destruction-log-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        return res.send(csv);
    } catch (error: any) {
        console.error('[GET /api/admin/exports/destruction-log] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'export_failed',
            message: error?.message || 'Failed to generate destruction log export'
        });
    }
});

export default router;

