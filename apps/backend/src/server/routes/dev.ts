import { Router } from "express";
import { ENV } from "../../env";
import { getPool } from "../db";
import { v4 as uuid } from "uuid";

// Security: Disable dev routes in production
if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Dev routes disabled in production');
}
import {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendPasswordChangedConfirmation,
    sendPlanCancelled,
    sendInvoiceSent,
    sendPaymentFailed,
    sendKycSubmitted,
    sendKycApproved,
    sendKycRejected,
    sendSupportRequestReceived,
    sendSupportRequestClosed,
    sendMailScanned,
    sendMailForwarded,
    sendMailReceivedAfterCancellation,
} from "../../lib/mailer";

const router = Router();

function ensureAllowed(req: any, res: any, next: any) {
    // Security: Disable in production
    if (ENV.NODE_ENV === "production") {
        return res.status(404).json({ ok: false, error: "not found" });
    }

    // Security: Require secret to be configured
    if (!ENV.DEV_SEED_SECRET) {
        return res.status(404).json({ ok: false, error: "not found" });
    }

    // Security: Require correct header
    const secret = req.headers["x-dev-seed-secret"];
    if (!secret || secret !== ENV.DEV_SEED_SECRET) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    next();
}

/**
 * POST /api/dev/seed-user
 * body: { email?: string, firstName?: string }
 * returns: { userId, email, firstName }
 */
router.post("/api/dev/seed-user", ensureAllowed, async (req, res) => {
    const email = (req.body?.email || `seed+${Date.now()}@virtualaddresshub.co.uk`).toLowerCase();
    const firstName = req.body?.firstName || "Seed";
    const id = uuid();

    try {
        // Insert user into database
        const pool = getPool();
        await pool.query(
            `INSERT INTO users (id, email, first_name, created_at, status) 
       VALUES ($1, $2, $3, $4, $5)`,
            [id, email, firstName, new Date().toISOString(), "active"]
        );

        return res.json({ ok: true, userId: id, email, firstName });
    } catch (error: any) {
        console.error("Failed to seed user:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/dev/trigger
 * body: { type: string, userId: string, payload?: object }
 * types:
 *  - welcome
 *  - password-reset (payload: { token?: string, expiryMinutes?: number })
 *  - password-changed
 *  - plan-cancelled (payload: { endDate?: string })
 *  - invoice-sent (payload: { invoiceNumber?: string, amount?: string })
 *  - payment-failed
 *  - kyc-submitted
 *  - kyc-approved (payload: { address1, address2, postcode })
 *  - kyc-rejected (payload: { reason?: string })
 *  - support-request-received (payload: { ticketId: string })
 *  - support-request-closed (payload: { ticketId: string })
 *  - mail-scanned (payload: { subject?: string })
 *  - mail-forwarded (payload: { trackingNumber?: string, carrier?: string })
 *  - mail-after-cancellation (payload: { subject?: string })
 */
router.post("/api/dev/trigger", ensureAllowed, async (req, res) => {
    const { type, userId, payload = {} } = req.body || {};
    if (!type || !userId) return res.status(400).json({ ok: false, error: "type & userId required" });

    try {
        // Get user from database
        const pool = getPool();
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const u = result.rows[0];
        if (!u) return res.status(404).json({ ok: false, error: "user not found" });

        // normalize common fields
        const email = u.email;
        const name = u.first_name || "Friend";

        switch (type) {
            case "welcome":
                await sendWelcomeEmail({
                    email,
                    name,
                    cta_url: `${ENV.APP_BASE_URL}/dashboard`
                });
                break;

            case "password-reset":
                await sendPasswordResetEmail({
                    email,
                    name,
                    cta_url: `${ENV.APP_BASE_URL}/reset?token=${payload.token || "dev-token-123"}`,
                });
                break;

            case "password-changed":
                await sendPasswordChangedConfirmation({ email, name });
                break;

            case "plan-cancelled":
                await sendPlanCancelled({
                    email,
                    name,
                    end_date: payload.endDate,
                    cta_url: `${ENV.APP_BASE_URL}/billing`
                });
                break;

            case "invoice-sent":
                await sendInvoiceSent({
                    email,
                    name,
                    invoice_number: payload.invoiceNumber || "INV-DEV-1001",
                    amount: payload.amount || "£29.99",
                    cta_url: `${ENV.APP_BASE_URL}/billing`
                });
                break;

            case "payment-failed":
                await sendPaymentFailed({
                    email,
                    name,
                    cta_url: `${ENV.APP_BASE_URL}/billing#payment`
                });
                break;

            case "kyc-submitted":
                // DISABLED: Too noisy, users can check dashboard
                console.log(`[DEV] KYC Submitted email disabled for ${email}`);
                break;

            case "kyc-approved":
                await sendKycApproved({
                    email,
                    name,
                    cta_url: `${ENV.APP_BASE_URL}/profile`,
                    virtualAddressLine1: payload.address1 || "123 Business Street",
                    virtualAddressLine2: payload.address2 || "Suite 100",
                    postcode: payload.postcode || "SW1A 1AA",
                });
                break;

            case "kyc-rejected":
                // DISABLED: Users can check dashboard for details
                console.log(`[DEV] KYC Rejected email disabled for ${email}`);
                break;

            case "support-request-received":
                await sendSupportRequestReceived({
                    email,
                    name,
                    ticket_id: String(payload.ticketId || "T-100"),
                    cta_url: `${ENV.APP_BASE_URL}/support`
                });
                break;

            case "support-request-closed":
                await sendSupportRequestClosed({
                    email,
                    name,
                    ticket_id: String(payload.ticketId || "T-100"),
                    cta_url: `${ENV.APP_BASE_URL}/support`
                });
                break;

            case "mail-scanned":
                await sendMailScanned({
                    email,
                    name,
                    subject: payload.subject || "Scanned: HMRC Letter",
                    cta_url: `${ENV.APP_BASE_URL}/mail`
                });
                break;

            case "mail-forwarded":
                await sendMailForwarded({
                    email,
                    name,
                    forwarding_address: payload.forwarding_address || "123 Test Street, London, SW1A 1AA, United Kingdom",
                    forwarded_date: payload.forwarded_date || new Date().toLocaleDateString('en-GB')
                });
                break;

            case "mail-after-cancellation":
                await sendMailReceivedAfterCancellation({
                    email,
                    name,
                    subject: payload.subject || "Mail received",
                    cta_url: `${ENV.APP_BASE_URL}/mail`
                });
                break;

            default:
                return res.status(400).json({ ok: false, error: "unknown type" });
        }

        return res.json({ ok: true, type, email });
    } catch (e: any) {
        console.error(`Failed to trigger ${type}:`, e);
        return res.status(500).json({ ok: false, error: e?.message || "send failed" });
    }
});

/**
 * POST /api/dev/cleanup
 * body: { email?: string, userId?: string }
 */
router.post("/api/dev/cleanup", ensureAllowed, async (req, res) => {
    const { email, userId } = req.body || {};
    if (!email && !userId) return res.status(400).json({ ok: false, error: "email or userId required" });

    try {
        const pool = getPool();
        let u: any = null;
        if (userId) {
            const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
            u = result.rows[0];
        }
        if (!u && email) {
            const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
            u = result.rows[0];
        }
        if (!u) return res.status(404).json({ ok: false, error: "user not found" });

        await pool.query("DELETE FROM users WHERE id = $1", [u.id]);
        return res.json({ ok: true, deleted: u.id });
    } catch (error: any) {
        console.error("Failed to cleanup user:", error);
        return res.status(500).json({ ok: false, error: error.message });
    }
});

export default router;
