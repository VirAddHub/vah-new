const express = require("express");
const { sumsubFetch } = require("../lib/sumsub");

const router = express.Router();

// Use centralized database connection
const { db } = require('../server/db');

/**
 * POST /api/kyc/start
 * 
 * Start KYC verification process using Sumsub WebSDK.
 * 
 * SETUP REQUIRED:
 * This endpoint requires Sumsub credentials to be configured as environment variables:
 * - SUMSUB_APP_TOKEN: Your Sumsub application token (required)
 * - SUMSUB_SECRET_KEY: Your Sumsub secret key (required, or use SUMSUB_APP_SECRET for backward compatibility)
 * - SUMSUB_LEVEL_NAME: KYC level name (optional, defaults to "basic-kyc")
 * - SUMSUB_BASE_URL: Sumsub API base URL (optional, defaults to "https://api.sumsub.com")
 * 
 * Without these credentials, the endpoint returns 501 "Sumsub not configured".
 * 
 * To configure:
 * 1. Create a Sumsub account at https://sumsub.com
 * 2. Get your App Token and Secret Key from Sumsub dashboard
 * 3. Add them as environment variables in Render (or .env for local)
 * 4. Redeploy the backend service
 * 
 * Body: none (uses session user from JWT middleware)
 * Returns: { ok: true, token: "sumsub_web_sdk_token", applicantId: "..." }
 * Errors: 501 if not configured, 404 if user not found, 500 on server error
 */
router.post("/start", async (req, res) => {
  try {
    // Auth middleware sets req.user
    const userId = Number(req.user.id);

    const user = db.prepare("SELECT id, email, first_name, last_name, sumsub_applicant_id FROM user WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

    // Check if Sumsub credentials are configured
    // Support both old (SUMSUB_APP_SECRET) and new (SUMSUB_SECRET_KEY) env var names
    const appToken = process.env.SUMSUB_APP_TOKEN;
    const appSecret = process.env.SUMSUB_APP_SECRET || process.env.SUMSUB_SECRET_KEY;
    const levelName = process.env.SUMSUB_LEVEL || process.env.SUMSUB_LEVEL_NAME || "basic-kyc";
    const baseUrl = process.env.SUMSUB_BASE_URL || process.env.SUMSUB_API || "https://api.sumsub.com";

    if (!appToken || !appSecret) {
      console.error('[kyc/start] Sumsub not configured', {
        hasAppToken: !!appToken,
        hasAppSecret: !!appSecret,
        hasLevelName: !!levelName,
        hasBaseUrl: !!baseUrl,
      });
      return res.status(501).json({
        ok: false,
        status: 501,
        error: 'Sumsub not configured',
        code: 'SUMSUB_NOT_CONFIGURED',
        message: 'Sumsub credentials are missing. Please configure SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY (or SUMSUB_APP_SECRET) environment variables.',
        debug: {
          hasAppToken: !!appToken,
          hasAppSecret: !!appSecret,
          hasLevelName: !!levelName,
          hasBaseUrl: !!baseUrl,
        }
      });
    }

    // Ensure applicant exists
    let applicantId = user.sumsub_applicant_id;
    if (!applicantId) {
      const payload = {
        externalUserId: String(user.id), // so webhooks can resolve quickly
        email: user.email,
        info: {
          firstName: user.first_name || "",
          lastName: user.last_name || "",
          country: "", // optional
        },
        // OPTIONAL: add "sourceKey" or "metadata" if you use them
      };
      const created = await sumsubFetch("POST", "/resources/applicants", payload);
      applicantId = created?.id;
      if (!applicantId) throw new Error("No applicant id from Sumsub");

      db.prepare("UPDATE user SET sumsub_applicant_id = ? WHERE id = ?").run(applicantId, user.id);

      // Send KYC submitted email (non-blocking) - only for new applicants
      try {
        const { sendKycSubmitted } = require('../src/lib/mailer');
        const { buildAppUrl } = require('../src/lib/mailer');
        sendKycSubmitted({
          email: user.email,
          firstName: user.first_name,
          name: user.first_name || user.last_name,
          cta_url: buildAppUrl('/profile'),
        }).catch((err) => {
          console.error('[kyc/start] kyc_submitted_email_failed_nonfatal', err);
        });
      } catch (emailError) {
        // Don't fail KYC start if email fails
        console.error('[kyc/start] kyc_submitted_email_error', emailError);
      }
    }

    // Access token for Web SDK / Mobile SDK
    // Use the new SDK endpoint format with POST body
    const tokenBody = {
      userId: String(user.id),
      levelName: levelName,
      ttlInSecs: 600,
      applicantIdentifiers: {
        email: user.email,
      },
    };

    const tokenResp = await sumsubFetch(
      "POST",
      "/resources/accessTokens/sdk",
      tokenBody
    );

    if (!tokenResp?.token) {
      throw new Error("No token in Sumsub response");
    }

    return res.json({ ok: true, token: tokenResp.token, applicantId });
  } catch (e) {
    console.error("[kyc/start]", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

module.exports = router;
