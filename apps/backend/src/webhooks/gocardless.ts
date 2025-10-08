import type { Request, Response } from 'express';
import { getPool } from '../server/db';
import { gcVerifyWebhookSignature } from '../lib/gocardless';

export async function handleGcWebhook(req: Request, res: Response) {
  const raw = (req as any).rawBody || JSON.stringify(req.body); // ensure rawBody set by bodyParser raw
  const sig = req.headers['webhook-signature'] as string | null;

  if (!gcVerifyWebhookSignature(typeof raw === 'string' ? raw : JSON.stringify(raw), sig)) {
    return res.status(400).json({ ok: false, error: 'bad_signature' });
  }

  const event = req.body; // shape depends on GC
  const type = `${event.resource_type}.${event.action}`;

  const now = Date.now();
  const pool = getPool();

  switch (type) {
    case 'payments.confirmed':
      // upsert payment -> invoice
      await pool.query(`
        INSERT INTO invoices (user_id, created_at, amount_pence, status, invoice_url)
        VALUES ($1, $2, $3, 'paid', $4)
      `, [event.links.customer_metadata?.user_id ?? 0, now, Math.round(Number(event.details.amount) || 0), event.details.invoice_url || null]);
      break;

    case 'payments.failed':
      await pool.query(`UPDATE subscription SET status='past_due', updated_at=$1 WHERE user_id=$2`, [now, event.links.customer_metadata?.user_id ?? 0]);
      break;

    case 'subscriptions.updated':
      await pool.query(`UPDATE subscription SET cadence=COALESCE($1, cadence), status=COALESCE($2, status), next_charge_at=COALESCE($3, next_charge_at), updated_at=$4 WHERE user_id=$5`,
        [event.details?.cadence ?? null, event.details?.status ?? null, event.details?.next_charge_at ?? null, now, event.links.customer_metadata?.user_id ?? 0]);
      break;

    case 'mandates.active':
      await pool.query(`UPDATE subscription SET mandate_id=$1, status='active', updated_at=$2 WHERE user_id=$3`,
        [event.links.mandate, now, event.links.customer_metadata?.user_id ?? 0]);
      break;

    case 'mandates.revoked':
      await pool.query(`UPDATE subscription SET mandate_id=NULL, status='past_due', updated_at=$1 WHERE user_id=$2`,
        [now, event.links.customer_metadata?.user_id ?? 0]);
      break;

    default:
      // ignore others for now
      break;
  }

  res.json({ ok: true });
}
