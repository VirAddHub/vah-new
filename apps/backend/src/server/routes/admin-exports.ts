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
function formatDate(dateString: string | null | Date): string {
    if (!dateString) return '';
    try {
        const date = dateString instanceof Date ? dateString : new Date(dateString);
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
 * GET /api/admin/exports/destruction-log
 * Export destruction log as CSV (admin only)
 * 
 * Query params:
 *   - from: optional date filter (YYYY-MM-DD)
 *   - to: optional date filter (YYYY-MM-DD)
 * 
 * Returns: CSV file download (UTF-8 encoded)
 * 
 * COMPLIANCE: Uses destruction_log table with all required fields.
 * Character encoding is explicitly UTF-8 to prevent Windows-1252 fallback issues.
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
                conditions.push(`dl.recorded_at >= $${params.length}::date`);
            }
            if (to) {
                params.push(to);
                conditions.push(`dl.recorded_at <= $${params.length}::date + INTERVAL '1 day'`);
            }
            if (conditions.length > 0) {
                dateFilter = `AND ${conditions.join(' AND ')}`;
            }
        }

        // Query from destruction_log table (compliance-safe source of truth)
        const query = `
            SELECT
                dl.mail_item_id,
                dl.user_id,
                dl.user_display_name,
                dl.receipt_date,
                dl.eligibility_date,
                dl.recorded_at,
                dl.actor_type,
                dl.action_source,
                dl.staff_name,
                dl.staff_initials,
                dl.notes,
                dl.destruction_method,
                dl.destruction_status,
                m.subject,
                m.sender_name
            FROM destruction_log dl
            JOIN mail_item m ON m.id = dl.mail_item_id
            WHERE dl.destruction_status = 'completed'
                AND (m.deleted IS NULL OR m.deleted = false)
                ${dateFilter}
            ORDER BY dl.recorded_at ASC
        `;

        const { rows } = await pool.query(query, params);

        // Transform rows for CSV with proper encoding handling
        const csvRows = rows.map((row: any) => {
            // Format dates (DD/MM/YYYY)
            const receiptDate = row.receipt_date ? formatDate(row.receipt_date) : '';
            const eligibilityDate = row.eligibility_date ? formatDate(row.eligibility_date) : '';
            const recordedAt = row.recorded_at ? formatDate(row.recorded_at instanceof Date ? row.recorded_at.toISOString() : row.recorded_at) : '';

            // Build mail description
            const mailDescription = row.subject
                ? `${row.subject}${row.sender_name ? ` – ${row.sender_name}` : ''}`
                : (row.sender_name || 'N/A');

            // Clean up any broken characters (fix encoding issues)
            const cleanText = (text: string | null): string => {
                if (!text) return 'N/A';
                return text
                    .replace(/‚Äì/g, '–')  // Fix broken en-dash
                    .replace(/‚Äî/g, '—')  // Fix broken em-dash
                    .replace(/â€™/g, "'")  // Fix broken apostrophe
                    .replace(/â€œ/g, '"')  // Fix broken opening quote
                    .replace(/â€/g, '"')   // Fix broken closing quote
                    .replace(/â€"/g, '—')  // Fix broken em-dash variant
                    .replace(/â€"/g, '–'); // Fix broken en-dash variant
            };

            return {
                'Mail Item ID': String(row.mail_item_id),
                'User ID': String(row.user_id),
                'Customer Name': cleanText(row.user_display_name),
                'Mail Description': cleanText(mailDescription),
                'Receipt Date': receiptDate,
                'Eligibility Date': eligibilityDate,
                'Destruction Method': cleanText(row.destruction_method || 'Cross-cut shredder'),
                'Actor Type': cleanText(row.actor_type || 'admin'),
                'Action Source': cleanText(row.action_source || 'admin_ui'),
                'Staff Name': cleanText(row.staff_name),
                'Staff Signature / Initials': cleanText(row.staff_initials),
                'Notes': cleanText(row.notes),
                'Recorded At': recordedAt
            };
        });

        // Generate CSV with explicit UTF-8 encoding
        const csv = stringify(csvRows, {
            header: true,
            columns: [
                'Mail Item ID',
                'User ID',
                'Customer Name',
                'Mail Description',
                'Receipt Date',
                'Eligibility Date',
                'Destruction Method',
                'Actor Type',
                'Action Source',
                'Staff Name',
                'Staff Signature / Initials',
                'Notes',
                'Recorded At'
            ],
            bom: true, // Add UTF-8 BOM for Excel compatibility
            encoding: 'utf8'
        });

        // Set response headers for CSV download with explicit UTF-8
        const filename = from || to
            ? `destruction-log-${from || 'all'}-${to || 'all'}.csv`
            : `destruction-log-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        // Send with explicit UTF-8 encoding
        return res.send(Buffer.from(csv, 'utf8'));
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

