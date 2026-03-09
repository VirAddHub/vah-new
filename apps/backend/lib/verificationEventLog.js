/**
 * Verification event logging for legacy JS (e.g. Sumsub webhook).
 * Non-blocking; logs to verification_event table. Safe to call from webhooks.
 * @see src/server/services/verificationEventLog.ts (TS canonical)
 */
const { getPool } = require('../server/db');

/**
 * @param {'user'|'business_owner'} subjectType
 * @param {number} subjectId
 * @param {string} eventType - e.g. webhook_received, verified, rejected, pending
 * @param {Record<string, unknown> | null} [payload]
 */
async function logVerificationEvent(subjectType, subjectId, eventType, payload = null) {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO verification_event (subject_type, subject_id, event_type, payload_json, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [subjectType, subjectId, eventType, payload ? JSON.stringify(payload) : null]
    );
  } catch (err) {
    console.error('[verification_event] log failed (non-fatal):', err.message);
  }
}

module.exports = { logVerificationEvent };
