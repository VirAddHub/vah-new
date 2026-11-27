// apps/backend/src/server/routes/admin-exports.ts
// Admin export endpoints (CSV downloads for compliance/audit)

import { clientKey } from '../lib/clientKey';
import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { stringify } from 'csv-stringify/sync';
import { getPool } from '../db';
import { requireAdmin } from '../../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for exports - generous for admin usage
const adminExportsLimiter = rateLimit({
    windowMs: 60_000, // 1 minute
    limit: 10, // 10 exports per minute (reasonable for compliance downloads)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const u = (req as any).user;
        return u?.id ? `admin-exports:${u.id}` : clientKey(req);
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
        logger.error('[GET /api/admin/exports/destruction-log] error:', error);
        return res.status(500).json({
            ok: false,
            error: 'export_failed',
            message: error?.message || 'Failed to generate destruction log export'
        });
    }
});

/** A spreadsheet cell: text that starts like a formula is prefixed so Excel shows it rather than runs it. */
function cell(v: unknown): string {
    const t = v == null ? '' : String(v);
    return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
}

const CHECK_STATUS: Record<string, string> = { in_progress: 'Under review', further_investigation: 'Investigating', satisfactory: 'Satisfactory', unsatisfactory: 'Unsatisfactory' };
const ENTRY_SOURCE: Record<string, string> = { phone: 'Phone call', email: 'Email', meeting: 'Meeting or video call', document: 'Documents', other: 'Other' };

/**
 * GET /api/admin/exports/company-checks-register
 * One row per company check: the customer, the company, the decision and who made it, where the
 * company details came from, mismatches with Companies House and how they were dealt with,
 * monitoring, and the latest saved report. CSV (opens in Excel), built fresh from the database.
 */
router.get('/company-checks-register', async (_req: Request, res: Response) => {
    try {
        const pool = getPool();
        const ok = (await pool.query(`SELECT to_regclass('public.company_check') IS NOT NULL AS ok`)).rows[0]?.ok;
        if (!ok) return res.status(503).json({ ok: false, error: 'not_ready' });
        const hasEntered = (await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'company_declaration' AND column_name = 'entered_by_admin'`)).rows.length > 0;
        const r = await pool.query(`
            SELECT c.id, c.user_id, u.email, u.first_name, u.last_name, u.deleted_at,
                   c.company_number, COALESCE(c.snapshot->'profile'->>'company_name', c.company_name) AS company_name,
                   c.snapshot->'profile'->>'company_status' AS company_status,
                   c.status, c.risk_rating, c.decided_at, c.decision_reason, da.email AS decided_by_email,
                   c.monitoring, c.fetched_at, c.created_at,
                   d.submitted_at AS details_at, d.returned_at AS details_returned_at,
                   ${hasEntered ? `d.entered_source, ea.email AS entered_by_email` : `NULL AS entered_source, NULL AS entered_by_email`},
                   (SELECT count(*) FROM company_check_entry e WHERE e.check_id = c.id AND e.kind = 'discrepancy') AS mismatches,
                   (SELECT count(*) FROM company_check_entry e WHERE e.check_id = c.id AND e.kind = 'discrepancy' AND e.resolved_at IS NULL) AS mismatches_open,
                   (SELECT string_agg(e.report_reference, '; ') FROM company_check_entry e WHERE e.check_id = c.id AND e.reported_to_ch) AS reported_refs,
                   (SELECT count(*) FROM company_check_evidence v WHERE v.check_id = c.id) AS evidence_files,
                   (SELECT max(created_at) FROM company_check_report rp WHERE rp.check_id = c.id) AS last_report_at
              FROM company_check c
              JOIN "user" u ON u.id = c.user_id
              LEFT JOIN "user" da ON da.id = c.decided_by
              LEFT JOIN LATERAL (SELECT * FROM company_declaration x WHERE x.user_id = c.user_id AND x.company_number = c.company_number ORDER BY x.submitted_at DESC, x.id DESC LIMIT 1) d ON true
              ${hasEntered ? `LEFT JOIN "user" ea ON ea.id = d.entered_by_admin` : ''}
             ORDER BY c.company_number, c.id`);
        const rows = r.rows.map((x: any) => ({
            'Check ID': x.id,
            'Customer ID': x.user_id,
            'Customer': cell([x.first_name, x.last_name].filter(Boolean).join(' ')),
            'Customer email': cell(x.email),
            'Account closed': x.deleted_at ? formatDate(x.deleted_at) : '',
            'Company number': cell(x.company_number),
            'Company name': cell(x.company_name),
            'Companies House status': cell(x.company_status),
            'Check status': CHECK_STATUS[x.status] ?? cell(x.status),
            'Risk rating': cell(x.risk_rating),
            'Decided on': formatDate(x.decided_at),
            'Decided by': cell(x.decided_by_email),
            'Decision reason': cell(x.decision_reason),
            'Company details from': !x.details_at ? 'Not received' : x.entered_by_email ? `Entered by ${x.entered_by_email} (${ENTRY_SOURCE[x.entered_source] ?? x.entered_source})` : 'Customer',
            'Company details dated': formatDate(x.details_at),
            'Sent back to customer': formatDate(x.details_returned_at),
            'Mismatches found': Number(x.mismatches),
            'Mismatches still open': Number(x.mismatches_open),
            'Reported to Companies House (refs)': cell(x.reported_refs),
            'Evidence files': Number(x.evidence_files),
            'Monitoring': x.monitoring ? 'On' : 'Off',
            'Last Companies House check': formatDate(x.fetched_at),
            'Latest report saved': formatDate(x.last_report_at),
            'Check opened': formatDate(x.created_at),
        }));
        const csv = stringify(rows, { header: true, columns: rows.length ? Object.keys(rows[0]) : ['Check ID'], bom: true });
        const filename = `company-checks-register-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        await pool.query(`INSERT INTO admin_audit (admin_id, action, target_type, target_id, details, created_at) VALUES ($1, 'company_checks_register_exported', 'export', 0, $2, NOW())`,
            [Number((_req as any).user?.id) || 0, JSON.stringify({ rows: rows.length })]).catch(() => {});
        return res.send(Buffer.from(csv, 'utf8'));
    } catch (error: any) {
        logger.error('[GET /api/admin/exports/company-checks-register] error', { message: error?.message });
        return res.status(500).json({ ok: false, error: 'export_failed', message: 'Could not build the register. Please try again.' });
    }
});

export default router;

