// apps/backend/src/modules/forwarding/forwarding.service.ts
import crypto from 'node:crypto';
import { getPool } from '../../server/db';
import { LegalTransitions } from './state';
import { GDPR_FORWARDING_WINDOW_MS } from '../../config/gdpr';

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

            const gdprExpired = receivedAtMs && (now - receivedAtMs) > GDPR_FORWARDING_WINDOW_MS;
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

            // Create charge if not official mail (HMRC or Companies House)
            // PRICING RULE: If tag is HMRC or Companies House: fee = £0, otherwise: fee = £2 (200 pence)
            if (!isOfficial) {
                const serviceDate = new Date().toISOString().split('T')[0]; // Today's date
                // Create charge for forwarding fee (if charge table exists)
                try {
                    await pool.query(
                        `INSERT INTO charge (
                            user_id, amount_pence, currency, type, description, 
                            service_date, status, related_type, related_id, created_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                        ON CONFLICT (type, related_type, related_id) DO NOTHING
                        `,
                        [
                            userId,
                            200, // £2 in pence
                            'GBP',
                            'forwarding_fee',
                            'Forwarding fee (non-HMRC/Companies House)',
                            serviceDate,
                            'pending',
                            'forwarding_request',
                            forwardingRequest.id
                        ]
                    );
                } catch (chargeError: any) {
                    // Table doesn't exist yet or insert failed - log but don't fail forwarding
                    // Error code 42P01 = relation does not exist
                    if (chargeError?.code === '42P01' || chargeError?.message?.includes('does not exist')) {
                        console.warn('[forwarding] charge table does not exist yet, skipping charge creation');
                    } else {
                        console.error('[forwarding] Error creating charge:', chargeError);
                    }
                    // Continue - forwarding request is still created successfully
                }
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

            // Send email notification to user about forwarding request creation
            // Note: This sends a "request received" email (custom), not the "mail forwarded" template
            // The "mail forwarded" template (ID: 40508790, alias: "mail-forwarded") is sent when admin completes the forwarding
            try {
                const userResult = await pool.query(
                    'SELECT email, first_name, last_name FROM "user" WHERE id = $1',
                    [userId]
                );
                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    const forwardingAddress = `${to.name}\n${to.address1}${to.address2 ? '\n' + to.address2 : ''}\n${to.city}, ${to.postal}\n${to.country}`;
                    
                    // Use Postmark client directly to send forwarding request confirmation
                    const { getClient } = await import('../../lib/mailer');
                    const { ENV, emailGuard } = await import('../../env');
                    const client = getClient();
                    if (client && emailGuard(ENV.EMAIL_MAIL)) {
                        const firstName = user.first_name || 'there';
                        
                        await client.sendEmail({
                            From: ENV.EMAIL_FROM_NAME ? `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>` : ENV.EMAIL_FROM,
                            To: user.email,
                            Subject: 'Forwarding Request Received',
                            HtmlBody: `
                                <p>Hi ${firstName},</p>
                                <p>We've received your forwarding request for your mail item.</p>
                                <p><strong>Forwarding Address:</strong></p>
                                <p>${forwardingAddress.replace(/\n/g, '<br>')}</p>
                                <p>We'll process your request and notify you once your mail has been dispatched.</p>
                                <p>Thank you for using VirtualAddressHub!</p>
                            `,
                            MessageStream: ENV.POSTMARK_STREAM,
                            ReplyTo: ENV.EMAIL_REPLY_TO || 'support@virtualaddresshub.co.uk',
                        });
                        console.log(`[Forwarding] ✅ Email notification sent to user ${userId} for request ${forwardingRequest.id}`);
                    }
                }
            } catch (emailError) {
                console.error(`[Forwarding] ❌ Failed to send email notification for request ${forwardingRequest.id}:`, emailError);
                // Don't fail the forwarding request if email fails
            }

            return forwardingRequest;
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    });
}
