// apps/backend/src/modules/forwarding/forwarding.service.ts
import crypto from 'node:crypto';
import { getPool } from '../../server/db';
import { LegalTransitions } from './state';
import { GDPR_FORWARDING_WINDOW_MS } from '../../config/gdpr';
import { MAIL_STATUS } from './mailStatus';

// Free forwarding tags (lowercase slugs)
const FREE_FORWARD_TAGS = new Set(['hmrc', 'companies_house']);

function isOfficialMail(tag: string | null | undefined): boolean {
    if (!tag) return false;
    // Normalize to lowercase for comparison
    const normalized = tag.toLowerCase().replace(/\s+/g, '_');
    return FREE_FORWARD_TAGS.has(normalized);
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

export type CreateForwardingResult = {
    forwarding_request: any;
    request_id: number;
    created: boolean;
    message: string;
    charge_amount: number; // pence
};

export async function createForwardingRequest(input: CreateForwardingInput): Promise<CreateForwardingResult> {
    const { userId, mailItemId, to, reason, method, idemKey = `srv-${crypto.randomUUID()}` } = input;
    const pool = getPool();

    return await pool.query('BEGIN').then(async () => {
        try {
            const mail = await pool.query(`
        SELECT id, status, tag, subject, received_at_ms, received_date, physical_destruction_date 
        FROM mail_item 
        WHERE id = $1 AND user_id = $2 AND deleted = false
      `, [mailItemId, userId]);

            if (mail.rows.length === 0) {
                throw new Error('Mail not found or not owned by user');
            }

            const mailData = mail.rows[0];
            
            // Check if physical mail has been destroyed
            if (mailData.physical_destruction_date) {
                throw new Error('This mail item has been physically destroyed and cannot be forwarded. The digital scan is still available for download.');
            }
            
            // Allow forwarding for 'received' status mail items (not just 'Pending')
            if (mailData.status !== 'received' && mailData.status !== 'Pending') {
                throw new Error('Mail not eligible for forwarding');
            }

            // Check GDPR 30-day rule
            const now = Date.now();

            let receivedAtMs = mailData.received_at_ms;
            if (!receivedAtMs && mailData.received_date) {
                // Fallback to received_date if received_at_ms is not available
                receivedAtMs = new Date(mailData.received_date).getTime();
            }

            const gdprExpired = receivedAtMs && (now - receivedAtMs) >= GDPR_FORWARDING_WINDOW_MS;
            if (gdprExpired) {
                throw new Error('Mail item is older than 30 days and cannot be forwarded due to GDPR compliance');
            }

            const isOfficial = isOfficialMail(mailData.tag);

            // Check for existing active forwarding request (idempotent check)
            // Treat these as "active" requests where we should not allow duplicates
            // IMPORTANT: match your real status casing. Your DB has 'Requested' and 'dispatched' (case variations)
            const existing = await pool.query(`
                SELECT id, status FROM forwarding_request 
                WHERE user_id = $1 
                  AND mail_item_id = $2 
                  AND status IN ('Requested', 'Processing', 'dispatched', 'Dispatched')
                ORDER BY id DESC
                LIMIT 1
            `, [userId, mailItemId]);

            if (existing.rows.length > 0) {
                await pool.query('COMMIT');
                const existingRequest = existing.rows[0];
                console.log('[forwarding] duplicate_request', {
                    userId,
                    mailItemId,
                    requestId: existingRequest.id,
                    status: existingRequest.status
                });
                return {
                    forwarding_request: existingRequest,
                    request_id: existingRequest.id,
                    created: false,
                    message: `Forwarding already requested (Request #${existingRequest.id})`,
                    charge_amount: 0,
                };
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

            // Decide billable + create charge
            // PRICING RULE: If tag is HMRC or Companies House: fee = £0, otherwise: fee = £2 (200 pence)
            const chargeAmount = isOfficial ? 0 : 200;

            if (chargeAmount > 0) {
                try {
                    // Insert charge - idempotent using unique index on (type, related_type, related_id)
                    // INVARIANT: Only one charge per forwarding_request (enforced by unique index)
                    const chargeResult = await pool.query(
                        `INSERT INTO charge (
                            user_id, amount_pence, currency, type, description,
                            service_date, status, related_type, related_id, created_at
                        )
                        VALUES ($1, $2, 'GBP', 'forwarding_fee', $3, CURRENT_DATE, 'pending', 'forwarding_request', $4, NOW())
                        ON CONFLICT (type, related_type, related_id)
                        WHERE related_type IS NOT NULL AND related_id IS NOT NULL
                        DO NOTHING
                        RETURNING id`,
                        [userId, chargeAmount, 'Forwarding fee (non-HMRC/Companies House)', forwardingRequest.id]
                    );

                    if (chargeResult.rows.length > 0) {
                        console.log(`[forwarding] charge_created`, {
                            requestId: forwardingRequest.id,
                            chargeId: chargeResult.rows[0].id,
                            chargeAmount,
                            userId
                        });
                    } else {
                        console.log(`[forwarding] charge_exists`, {
                            requestId: forwardingRequest.id,
                            chargeAmount,
                            userId
                        });
                    }
                } catch (chargeError: any) {
                    // Only swallow "table missing". Everything else should throw.
                    const msg = String(chargeError?.message || '');
                    if (msg.includes('relation "charge" does not exist') || chargeError?.code === '42P01') {
                        console.warn('[forwarding] charge table missing, skipping charge creation');
                    } else {
                        // Re-throw other errors - they're real problems
                        throw chargeError;
                    }
                }
            } else {
                console.log(`[forwarding] ℹ️ Official mail (tag="${mailData.tag}"), no charge created (free forwarding)`);
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

            console.log('[forwarding] request_created', {
                userId,
                mailItemId,
                requestId: forwardingRequest.id,
                chargeAmount,
                tag: mailData.tag
            });

            // NOTE: Email notification is NOT sent here when request is created
            // Email is only sent when admin marks the request as "Dispatched" or "Delivered"
            // This prevents duplicate emails (request created + dispatched)
            console.log(`[Forwarding] ✅ Forwarding request ${forwardingRequest.id} created for user ${userId}. Email will be sent when dispatched.`);

            return {
                forwarding_request: forwardingRequest,
                request_id: forwardingRequest.id,
                created: true,
                message: 'Forwarding request created successfully',
                charge_amount: chargeAmount,
            };
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    });
}
