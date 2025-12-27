const express = require('express');
const crypto = require('crypto');
const { notify } = require('../lib/notify');

const router = express.Router();

// Use centralized database connection
const { db } = require('../server/db');

function verifySig(secret, rawBody, signature) {
  // Sumsub sends x-payload-digest: hex(hmacsha256(secret, raw_body))
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    // timing-safe compare
    const a = Buffer.from(hmac);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/sumsub
 * Heads-up: body is raw Buffer; parse JSON after signature verification
 */
router.post('/', async (req, res) => {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET || '';
  const sig = req.header('x-payload-digest') || req.header('X-Payload-Digest');
  const raw = req.body; // Buffer

  if (!verifySig(secret, raw, sig)) {
    return res.status(401).json({ ok: false, error: 'invalid_signature' });
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  // Expected minimal fields (Sumsub "applicantReviewed" and friends)
  // payload example fields:
  // - applicantId
  // - reviewStatus: "completed"
  // - reviewResult: { reviewAnswer: "GREEN" | "RED" | "YELLOW", rejectLabels: [...], moderationComment: "..." }
  // - externalUserId (your internal user id or email if you set it)
  const applicantId = payload.applicantId || payload.applicant?.id;
  const reviewStatus = payload.reviewStatus || payload.eventType || '';
  const reviewAnswer = payload.reviewResult?.reviewAnswer || payload.reviewResult?.answer || '';
  const rejectReason = payload.reviewResult?.moderationComment || payload.reviewResult?.rejectReason || null;
  const externalUserId = payload.externalUserId || payload.metadata?.externalUserId || null;

  // Resolve the user row: prefer externalUserId if you set it to user.id; fallback by applicantId
  let userRow = null;
  if (externalUserId) {
    userRow = await db.get('SELECT id, kyc_status, email, first_name, last_name FROM "user" WHERE id = $1', [Number(externalUserId)]);
  }
  if (!userRow && applicantId) {
    userRow = await db.get('SELECT id, kyc_status, email, first_name, last_name FROM "user" WHERE sumsub_applicant_id = $1', [applicantId]);
  }
  if (!userRow) {
    // store orphan webhook for audit, then 200 (Sumsub expects 2xx)
    console.warn('[sumsub] user not found for webhook', { applicantId, externalUserId });
    return res.json({ ok: true, ignored: true });
  }

  const previousKycStatus = userRow.kyc_status;
  const now = Date.now();
  const statusText = reviewAnswer || reviewStatus || 'unknown';
  const reviewIsGreen = reviewAnswer === 'GREEN' || reviewStatus === 'completed';

  await db.transaction(async (txDb) => {
    // Update Sumsub-specific fields
    await txDb.run(`
      UPDATE "user"
      SET sumsub_applicant_id = COALESCE(sumsub_applicant_id, $1),
          sumsub_review_status = $2,
          sumsub_last_updated = $3,
          sumsub_rejection_reason = $4,
          sumsub_webhook_payload = $5
      WHERE id = $6
    `, [applicantId || null, statusText, now, rejectReason, JSON.stringify(payload).slice(0, 50000), userRow.id]);

    // Update KYC status based on Sumsub response - use "approved" as canonical status
    let kycStatus = 'pending';
    if (reviewIsGreen) {
      kycStatus = 'approved';
    } else if (reviewAnswer === 'RED' || reviewStatus === 'rejected') {
      kycStatus = 'rejected';
    }

    // Update user's KYC status and set kyc_approved_at if transitioning to approved
    const updates = [`kyc_status = $1`, `updated_at = $2`];
    const values = [kycStatus, now];
    let paramIndex = 3;

    if (kycStatus === 'approved' && previousKycStatus !== 'approved') {
      // Set kyc_approved_at timestamp on first approval (use ISO string for consistency with admin route)
      updates.push(`kyc_approved_at = $${paramIndex++}`);
      values.push(new Date().toISOString());
    }

    values.push(userRow.id);
    await txDb.run(`
      UPDATE "user"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    console.log(`[SumsubWebhook] Updated user ${userRow.id} KYC status to: ${kycStatus}`);
  });

  // Send KYC approved email if transitioning to approved for the first time
  const becameApproved = reviewIsGreen && previousKycStatus !== 'approved';
  if (becameApproved) {
    // Fire-and-forget email send
    import('../src/lib/mailer').then(({ sendKycApproved }) => {
      sendKycApproved({
        email: userRow.email,
        firstName: userRow.first_name || "there",
      }).catch((err) => {
        console.error('[SumsubWebhook] Failed to send KYC approved email:', err);
      });
    }).catch((err) => {
      console.error('[SumsubWebhook] Failed to import mailer:', err);
    });
  }

  // Send KYC rejected email if transitioning to rejected
  const becameRejected = (kycStatus === 'rejected' || reviewAnswer === 'RED') && previousKycStatus !== 'rejected';
  if (becameRejected) {
    // Fire-and-forget email send
    import('../src/lib/mailer').then(({ sendKycRejected }) => {
      sendKycRejected({
        email: userRow.email,
        firstName: userRow.first_name || "there",
        reason: rejectReason || "Verification was not approved. Please check your documents and try again.",
      }).catch((err) => {
        console.error('[SumsubWebhook] Failed to send KYC rejected email:', err);
      });
    }).catch((err) => {
      console.error('[SumsubWebhook] Failed to import mailer for KYC rejected:', err);
    });
  }

  // Send notification to user
  notify({
    userId: userRow.id,
    type: "kyc",
    title: `KYC status: ${statusText}`,
    body: rejectReason ? `Reason: ${rejectReason}` : "",
    meta: { applicantId, reviewStatus, reviewAnswer }
  });

  return res.json({ ok: true });
});

module.exports = router;
