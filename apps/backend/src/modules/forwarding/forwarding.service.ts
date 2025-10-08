// apps/backend/src/modules/forwarding/forwarding.service.ts
import crypto from 'node:crypto';
import { getPool } from '../../server/db';
import { LegalTransitions } from './state';

const OFFICIAL_TAGS = new Set(['HMRC', 'COMPANIES HOUSE', 'COMPANIES_HOUSE']);

function isOfficialMail(tag: string | null | undefined): boolean {
    return tag ? OFFICIAL_TAGS.has(tag.toUpperCase()) : false;
}

export interface CreateForwardingInput {
    userId: number;
    mailItemId: number;
    to: {
        name: string; address1: string; address2?: string; city: string;
        state?: string; postal: string; country: string;
    };
    reason?: string;
    method?: string;
    idemKey?: string;
}

export async function createForwardingRequest(input: CreateForwardingInput) {
    const { userId, mailItemId, to, reason, method, idemKey = `srv-${crypto.randomUUID()}` } = input;
    const pool = getPool();

    return await pool.query('BEGIN').then(async () => {
        try {
            const mail = await pool.query(`
        SELECT id, status, tag, subject, received_at_ms, received_date 
        FROM mail_item 
        WHERE id = $1 AND user_id = $2 AND deleted = false
      `, [mailItemId, userId]);

            if (mail.rows.length === 0) {
                throw new Error('Mail not found or not owned by user');
            }

            const mailData = mail.rows[0];
            if (!LegalTransitions['Pending'].includes('Requested') && mailData.status !== 'Pending') {
                throw new Error('Mail not eligible for forwarding');
            }

            // Check GDPR 30-day rule
            const now = Date.now();
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

            let receivedAtMs = mailData.received_at_ms;
            if (!receivedAtMs && mailData.received_date) {
                // Fallback to received_date if received_at_ms is not available
                receivedAtMs = new Date(mailData.received_date).getTime();
            }

            const gdprExpired = receivedAtMs && (now - receivedAtMs) > thirtyDaysInMs;
            if (gdprExpired) {
                throw new Error('Mail item is older than 30 days and cannot be forwarded due to GDPR compliance');
            }

            const isOfficial = isOfficialMail(mailData.tag);

            // Check for existing active forwarding request
            const existing = await pool.query(`
        SELECT id FROM forwarding_request 
        WHERE user_id = $1 AND mail_item_id = $2 AND status IN ('Requested','Processing')
      `, [userId, mailItemId]);

            if (existing.rows.length > 0) {
                await pool.query('COMMIT');
                return existing.rows[0];
            }

            // Create forwarding request
            const fr = await pool.query(`
        INSERT INTO forwarding_request (
          user_id, mail_item_id, status, to_name, address1, address2, 
          city, state, postal, country, reason, method, idem_key, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, status
      `, [
                userId, mailItemId, 'Requested', to.name, to.address1, to.address2,
                to.city, to.state, to.postal, to.country, reason, method, idemKey,
                Date.now(), Date.now()
            ]);

            const forwardingRequest = fr.rows[0];

            // Create charge if not official mail
            if (!isOfficial) {
                await pool.query(`
          INSERT INTO forwarding_charge (forwarding_request_id, amount_pence, status, created_at)
          VALUES ($1, $2, $3, $4)
        `, [forwardingRequest.id, 200, 'pending', Date.now()]);
            }

            // Create outbox event
            await pool.query(`
        INSERT INTO forwarding_outbox (
          forwarding_request_id, event, payload_json, status, created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
                forwardingRequest.id,
                'forwarding.request.created',
                JSON.stringify({
                    id: forwardingRequest.id,
                    user_id: userId,
                    mail_item_id: mailItemId,
                    tag: mailData.tag,
                    subject: mailData.subject,
                    is_official: isOfficial,
                    amount_pence: isOfficial ? 0 : 200,
                    created_at: new Date().toISOString(),
                }),
                'pending',
                Date.now()
            ]);

            await pool.query('COMMIT');

            console.log(`[Forwarding] Created request ${forwardingRequest.id} for user ${userId}`);
            return forwardingRequest;
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    });
}
