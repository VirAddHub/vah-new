/**
 * POST /api/webhooks/sumsub
 *
 * Receives Sumsub verification status webhook events.
 * Body arrives as raw Buffer (express.raw middleware applied by parent router).
 * Signature is verified via HMAC-SHA256 (x-payload-digest header).
 *
 * Handles both:
 *  - Primary user KYC status transitions
 *  - Business owner KYC status transitions (externalUserId prefixed with "owner_")
 */

import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { logVerificationEvent } from '../services/verificationEventLog';
import { sendKycApproved, sendKycRejected } from '../../lib/mailer';

const router = Router();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SumsubReviewResult {
  reviewAnswer?: string;
  answer?: string;
  moderationComment?: string;
  rejectReason?: string;
  rejectLabels?: string[];
}

interface SumsubPayload {
  applicantId?: string;
  applicant?: { id?: string };
  reviewStatus?: string;
  eventType?: string;
  type?: string;
  reviewResult?: SumsubReviewResult;
  externalUserId?: string;
  metadata?: { externalUserId?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verifySig(secret: string, rawBody: Buffer, signature: string | null | undefined): boolean {
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody as unknown as Uint8Array).digest('hex');
  try {
    const a = Buffer.from(hmac, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
  } catch {
    return false;
  }
}

function safeWebhookPayload(
  payload: SumsubPayload,
  applicantId: string | null,
  reviewStatus: string,
  reviewAnswer: string,
  externalUserId: string | null,
): Record<string, unknown> {
  return {
    applicantId: applicantId ?? payload?.applicantId,
    reviewStatus: reviewStatus || payload?.reviewStatus,
    reviewAnswer: reviewAnswer || payload?.reviewResult?.reviewAnswer,
    externalUserId: externalUserId != null ? String(externalUserId) : undefined,
    eventType: payload?.type || payload?.eventType,
  };
}

/**
 * Insert a notification row into the Postgres notification table.
 * This replaces the legacy SQLite notify() from lib/notify.js.
 */
async function insertNotification(opts: {
  userId: number;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const pool = getPool();
    const now = Date.now();
    await pool.query(
      `INSERT INTO notification (user_id, type, title, body, meta, created_at, read_at)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)`,
      [
        opts.userId,
        String(opts.type),
        String(opts.title),
        String(opts.body ?? ''),
        opts.meta ? JSON.stringify(opts.meta).slice(0, 50000) : null,
        now,
      ],
    );
  } catch (err) {
    // Non-fatal — notification failure should never block the webhook response
    console.error('[SumsubWebhook] insertNotification failed (non-fatal):', err);
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response) => {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET || '';
  const sig =
    (req.headers['x-payload-digest'] as string | undefined) ??
    (req.headers['X-Payload-Digest'] as string | undefined) ??
    null;

  // req.body is a raw Buffer at this point (set by express.raw in server.ts)
  const raw: Buffer = req.body;

  if (!verifySig(secret, raw, sig)) {
    console.warn('[SumsubWebhook] Signature verification failed');
    return res.status(401).json({ ok: false, error: 'invalid_signature' });
  }

  let payload: SumsubPayload;
  try {
    payload = JSON.parse(raw.toString('utf8')) as SumsubPayload;
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  const applicantId = payload.applicantId ?? payload.applicant?.id ?? null;
  const reviewStatus = payload.reviewStatus ?? payload.eventType ?? '';
  const reviewAnswer = payload.reviewResult?.reviewAnswer ?? payload.reviewResult?.answer ?? '';
  const rejectReason = payload.reviewResult?.moderationComment ?? payload.reviewResult?.rejectReason ?? null;
  const externalUserId = payload.externalUserId ?? payload.metadata?.externalUserId ?? null;

  const reviewIsGreen = reviewAnswer === 'GREEN' || reviewStatus === 'completed';

  // Determine target: primary user OR business owner
  const isBusinessOwner = externalUserId != null && String(externalUserId).startsWith('owner_');

  const pool = getPool();

  // ---------------------------------------------------------------------------
  // Business owner path
  // ---------------------------------------------------------------------------
  if (isBusinessOwner) {
    const ownerId = Number(String(externalUserId).replace('owner_', ''));

    let ownerResult = await pool.query(
      'SELECT id, user_id, full_name, email, status FROM business_owner WHERE id = $1',
      [ownerId],
    );

    // Fallback: look up by applicant ID
    if (ownerResult.rows.length === 0 && applicantId) {
      ownerResult = await pool.query(
        'SELECT id, user_id, full_name, email, status FROM business_owner WHERE sumsub_applicant_id = $1',
        [applicantId],
      );
    }

    if (ownerResult.rows.length === 0) {
      console.warn('[SumsubWebhook] owner not found for webhook', { applicantId, externalUserId });
      return res.json({ ok: true, ignored: true });
    }

    const ownerRow = ownerResult.rows[0];
    const previousStatus = ownerRow.status as string;
    const safePayload = safeWebhookPayload(payload, applicantId, reviewStatus, reviewAnswer, externalUserId);

    let newStatus = 'pending';
    if (reviewIsGreen) {
      newStatus = 'verified';
    } else if (reviewAnswer === 'RED' || reviewStatus === 'rejected') {
      newStatus = 'rejected';
    }

    await logVerificationEvent('business_owner', ownerRow.id, 'webhook_received', safePayload);

    await pool.query(
      `UPDATE business_owner
       SET sumsub_applicant_id = COALESCE(sumsub_applicant_id, $1),
           status = $2,
           kyc_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [applicantId ?? null, newStatus, ownerRow.id],
    );

    console.log(`[SumsubWebhook] Updated business owner ${ownerRow.id} status to: ${newStatus}`);

    const finalEventType =
      newStatus === 'verified' ? 'verified' : newStatus === 'rejected' ? 'rejected' : 'pending';
    await logVerificationEvent('business_owner', ownerRow.id, finalEventType, safePayload);

    const firstName = (ownerRow.full_name as string).split(' ')[0] || (ownerRow.full_name as string);

    if (newStatus === 'verified' && previousStatus !== 'verified') {
      try {
        await sendKycApproved({ email: ownerRow.email, firstName });
      } catch (err) {
        console.error('[SumsubWebhook] Failed to send owner KYC approved email:', err);
      }
    } else if (newStatus === 'rejected' && previousStatus !== 'rejected') {
      try {
        await sendKycRejected({
          email: ownerRow.email,
          firstName,
          reason: rejectReason ?? 'Verification was not approved. Please check your documents and try again.',
        });
      } catch (err) {
        console.error('[SumsubWebhook] Failed to send owner KYC rejected email:', err);
      }
    }

    return res.json({ ok: true });
  }

  // ---------------------------------------------------------------------------
  // Primary user path
  // ---------------------------------------------------------------------------
  let userResult = await pool.query(
    'SELECT id, kyc_status, email, first_name, last_name FROM "user" WHERE id = $1',
    [externalUserId != null ? Number(externalUserId) : null],
  );

  if (userResult.rows.length === 0 && applicantId) {
    userResult = await pool.query(
      'SELECT id, kyc_status, email, first_name, last_name FROM "user" WHERE sumsub_applicant_id = $1',
      [applicantId],
    );
  }

  if (userResult.rows.length === 0) {
    console.warn('[SumsubWebhook] user not found for webhook', { applicantId, externalUserId });
    return res.json({ ok: true, ignored: true });
  }

  const userRow = userResult.rows[0];
  const previousKycStatus = userRow.kyc_status as string;
  const now = Date.now();
  const statusText = reviewAnswer || reviewStatus || 'unknown';
  const safePayload = safeWebhookPayload(payload, applicantId, reviewStatus, reviewAnswer, externalUserId);

  await logVerificationEvent('user', userRow.id, 'webhook_received', safePayload);

  // Determine new KYC status
  let kycStatus = 'pending';
  if (reviewIsGreen) {
    kycStatus = 'approved';
  } else if (reviewAnswer === 'RED' || reviewStatus === 'rejected') {
    kycStatus = 'rejected';
  }

  // Update Sumsub audit columns
  await pool.query(
    `UPDATE "user"
     SET sumsub_applicant_id    = COALESCE(sumsub_applicant_id, $1),
         sumsub_review_status   = $2,
         sumsub_last_updated    = $3,
         sumsub_rejection_reason = $4,
         sumsub_webhook_payload = $5
     WHERE id = $6`,
    [
      applicantId ?? null,
      statusText,
      now,
      rejectReason,
      JSON.stringify(payload).slice(0, 50000),
      userRow.id,
    ],
  );

  // Build KYC status update (conditionally sets kyc_approved_at on first approval)
  const updates: string[] = ['kyc_status = $1', 'updated_at = $2'];
  const values: unknown[] = [kycStatus, now];
  let paramIndex = 3;

  if (kycStatus === 'approved' && previousKycStatus !== 'approved') {
    updates.push(`kyc_approved_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
  }

  values.push(userRow.id);
  await pool.query(
    `UPDATE "user" SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values,
  );

  console.log(`[SumsubWebhook] Updated user ${userRow.id} KYC status to: ${kycStatus}`);

  const userEventType =
    reviewIsGreen ? 'verified' : kycStatus === 'rejected' ? 'rejected' : 'pending';
  await logVerificationEvent('user', userRow.id, userEventType, safePayload);

  // Email side-effects (non-blocking, fire-and-forget with error logging)
  const becameApproved = reviewIsGreen && previousKycStatus !== 'approved';
  if (becameApproved) {
    sendKycApproved({
      email: userRow.email,
      firstName: userRow.first_name ?? 'there',
    }).catch((err: unknown) => {
      console.error('[SumsubWebhook] Failed to send KYC approved email:', err);
    });
  }

  const becameRejected = kycStatus === 'rejected' && previousKycStatus !== 'rejected';
  if (becameRejected) {
    sendKycRejected({
      email: userRow.email,
      firstName: userRow.first_name ?? 'there',
      reason: rejectReason ?? 'Verification was not approved. Please check your documents and try again.',
    }).catch((err: unknown) => {
      console.error('[SumsubWebhook] Failed to send KYC rejected email:', err);
    });
  }

  // In-app notification (Postgres-native, replaces legacy SQLite notify())
  await insertNotification({
    userId: userRow.id,
    type: 'kyc',
    title: `KYC status: ${statusText}`,
    body: rejectReason ?? '',
    meta: { applicantId, reviewStatus, reviewAnswer },
  });

  return res.json({ ok: true });
});

export default router;
