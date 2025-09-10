const express = require('express');
const crypto = require('crypto');
const { notify } = require('../lib/notify');

const router = express.Router();

// Use centralized database connection
const { db } = require('../server/db.js');

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
router.post('/', (req, res) => {
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
    userRow = db.prepare('SELECT id FROM user WHERE id = ?').get(Number(externalUserId));
  }
  if (!userRow && applicantId) {
    userRow = db.prepare('SELECT id FROM user WHERE sumsub_applicant_id = ?').get(applicantId);
  }
  if (!userRow) {
    // store orphan webhook for audit, then 200 (Sumsub expects 2xx)
    console.warn('[sumsub] user not found for webhook', { applicantId, externalUserId });
    return res.json({ ok: true, ignored: true });
  }

  const now = Date.now();
  const statusText = reviewAnswer || reviewStatus || 'unknown';

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE user
      SET sumsub_applicant_id = COALESCE(sumsub_applicant_id, ?),
          sumsub_review_status = ?,
          sumsub_last_updated = ?,
          sumsub_rejection_reason = ?,
          sumsub_webhook_payload = ?
      WHERE id = ?
    `).run(applicantId || null, statusText, now, rejectReason, JSON.stringify(payload).slice(0, 50000), userRow.id);

    // Note: mail_event requires a valid mail_item, so we skip audit logging for KYC events
  });
  tx();

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
