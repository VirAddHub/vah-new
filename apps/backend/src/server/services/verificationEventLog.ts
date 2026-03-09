/**
 * Lightweight verification event logging for audit/debugging.
 * See docs/IDENTITY_VERIFICATION_ENGINEERING_SPEC.md (Part 4)
 *
 * Event types: invite_sent, invite_resent, sumsub_started, verified, rejected,
 * token_expired, webhook_received
 */
import { getPool } from '../db';

export type VerificationSubjectType = 'user' | 'business_owner';
export type VerificationEventType =
  | 'invite_sent'
  | 'invite_resent'
  | 'sumsub_started'
  | 'verified'
  | 'rejected'
  | 'pending'
  | 'token_expired'
  | 'webhook_received';

export async function logVerificationEvent(
  subjectType: VerificationSubjectType,
  subjectId: number,
  eventType: VerificationEventType,
  payload?: Record<string, unknown> | null
): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO verification_event (subject_type, subject_id, event_type, payload_json, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [subjectType, subjectId, eventType, payload ? JSON.stringify(payload) : null]
    );
  } catch (err) {
    console.error('[verification_event] log failed (non-fatal):', err);
  }
}
