import { Router, Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { getPool } from '../db';
import { auditQuery, AuditQueryError, AuditSource } from '../audit/query';
import { safeAuditValue } from '../audit/details';

const router = Router();

function list(source: AuditSource) {
  return async (req: Request, res: Response) => {
    // authenticateJWT is mounted before this router; retain the admin-only gate.
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: 'forbidden' });
    res.set('Cache-Control', 'no-store');
    try {
      const { sql, params, limit, offset } = auditQuery(source, req.query);
      const result = await getPool().query(sql, params);
      const row = result.rows[0];
      const items = row.items.map((event: any) => {
        const authentication = /auth|login|logout|sign.?in|password|security|session|mfa|2fa/i.test(
          event.action,
        );
        // Explicit projection prevents raw payloads and joined search fields escaping.
        return {
          id: String(event.id),
          source,
          action: event.action,
          created_at: event.occurred_at,
          actor: {
            id: event.actor_id == null ? null : String(event.actor_id),
            name: event.import_source
              ? `System · ${event.import_source}`
              : [event.actor_first_name, event.actor_last_name].filter(Boolean).join(' ') || null,
            is_system: Boolean(event.import_source),
            email: event.actor_email,
            is_admin: event.actor_is_admin,
          },
          target: {
            type: event.target_type,
            id: event.target_id == null ? null : String(event.target_id),
            customer_id: event.customer_id == null ? null : String(event.customer_id),
            name:
              [event.customer_first_name, event.customer_last_name].filter(Boolean).join(' ') ||
              null,
            company: event.company_name,
            email: event.customer_email,
            plan_name: event.plan_name,
            href: event.current_mail_id != null ? `/admin/mail/${event.current_mail_id}` : null,
          },
          details: safeAuditValue(event.details, authentication),
          before: safeAuditValue(event.before_json, authentication),
          after: safeAuditValue(event.after_json, authentication),
        };
      });
      return res.json({
        ok: true,
        items,
        total: row.total,
        limit,
        offset,
        actions: row.actions.map((a: any) => a.action),
        actors: row.actors,
      });
    } catch (error: any) {
      if (error instanceof AuditQueryError)
        return res.status(400).json({ ok: false, error: error.message });
      if (error?.code === '42P01')
        return res.status(503).json({ ok: false, error: 'audit_source_unavailable' });
      logger.error('[admin-audit] query failed', { code: error?.code });
      return res.status(500).json({ ok: false, error: 'audit_load_failed' });
    }
  };
}
router.get('/', list('admin'));
// This has always contained mail changes, not authentication events.
router.get('/mail-audit', list('mail'));
router.get('/mail-arrivals', list('arrivals'));
export default router;
