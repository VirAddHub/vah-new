import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { sendSimpleEmail } from '../../services/mailer';
import { logger } from '../../lib/logger';
import { ENV } from '../../env';

const router = Router();

function requireSecret(req: Request, res: Response): string | null {
  const secret = (process.env.DAILY_SUMMARY_SECRET || '').trim();
  if (!secret) return 'DAILY_SUMMARY_SECRET is not set';

  const header = req.headers['x-cron-secret'] as string | undefined;
  const bearer = String(req.headers.authorization || '');
  const token = header || (bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '');

  if (!token || token !== secret) return 'unauthorized';
  return null;
}

/**
 * GET /api/internal/daily-summary
 *
 * Queries new signups from the last 24 hours and sends a summary email
 * to hello@virtualaddresshub.co.uk and mailroom@virtualaddresshub.co.uk.
 * Safe to call daily via cron/scheduler.
 */
router.get('/daily-summary', async (req: Request, res: Response) => {
  const authErr = requireSecret(req, res);
  if (authErr) return res.status(401).json({ ok: false, error: authErr });

  const pool = getPool();
  const now = Date.now();
  const since = now - 24 * 60 * 60 * 1000; // 24 hours ago in ms

  try {
    // All signups in last 24h (any status)
    const result = await pool.query(
      `SELECT
         id,
         first_name,
         last_name,
         email,
         company_name,
         business_type,
         billing,
         status,
         plan_status,
         kyc_status,
         created_at
       FROM "user"
       WHERE created_at >= $1
       AND is_admin = false
       ORDER BY created_at DESC`,
      [since]
    );

    const users = result.rows;
    const total = users.length;
    const active = users.filter((u: any) => u.plan_status === 'active').length;
    const pendingPayment = users.filter((u: any) => u.status === 'pending_payment').length;
    const pendingKyc = users.filter((u: any) => u.kyc_status === 'pending' || u.kyc_status === 'in_progress').length;

    // Build email body
    const dateLabel = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const lines: string[] = [
      `Daily signup summary — ${dateLabel}`,
      '─'.repeat(48),
      '',
      `Total new signups (last 24h):  ${total}`,
      `Active (paid):                 ${active}`,
      `Pending payment:               ${pendingPayment}`,
      `Pending KYC:                   ${pendingKyc}`,
      '',
    ];

    if (total === 0) {
      lines.push('No new signups in the last 24 hours.');
    } else {
      lines.push('New customers:');
      lines.push('─'.repeat(48));

      for (const u of users) {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '(no name)';
        const company = u.company_name ? ` — ${u.company_name}` : '';
        const signupDate = u.created_at
          ? new Date(Number(u.created_at)).toLocaleString('en-GB', { timeZone: 'Europe/London' })
          : 'unknown';

        lines.push('');
        lines.push(`  ${name}${company}`);
        lines.push(`  Email:        ${u.email}`);
        lines.push(`  Plan:         ${u.billing || 'unknown'}`);
        lines.push(`  Status:       ${u.plan_status || u.status}`);
        lines.push(`  KYC:          ${u.kyc_status || 'not started'}`);
        lines.push(`  Signed up:    ${signupDate}`);
      }
    }

    lines.push('');
    lines.push('─'.repeat(48));
    lines.push('VirtualAddressHub — automated daily summary');

    const emailBody = lines.join('\n');

    await sendSimpleEmail({
      to: 'mailroom@virtualaddresshub.co.uk',
      subject: `Daily signups: ${total} new ${total === 1 ? 'customer' : 'customers'} — ${dateLabel}`,
      textBody: emailBody,
      from: ENV.EMAIL_FROM,
      replyTo: ENV.EMAIL_REPLY_TO,
    });

    logger.info(`[daily-summary] Sent summary: ${total} signups (${active} active)`);

    return res.json({
      ok: true,
      total,
      active,
      pending_payment: pendingPayment,
      pending_kyc: pendingKyc,
      sent_to: 'mailroom@virtualaddresshub.co.uk',
    });

  } catch (err: any) {
    logger.error('[daily-summary] Failed:', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

export default router;
