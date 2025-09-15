const express = require("express");
const { sumsubFetch } = require("../lib/sumsub");

const router = express.Router();

// Use centralized database connection
const { db } = require('../server/db');

/**
 * POST /api/kyc/start
 * Body: none (uses session user), or { userId } for admin testing
 * Returns: { ok: true, token, applicantId }
 */
router.post("/start", async (req, res) => {
  try {
    // Auth middleware sets req.user
    const userId = Number(req.user.id);

    const user = db.prepare("SELECT id, email, first_name, last_name, sumsub_applicant_id FROM user WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

    const levelName = process.env.SUMSUB_LEVEL || "basic-kyc";

    // Check if Sumsub credentials are configured
    if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_APP_SECRET) {
      return res.json({
        ok: true,
        token: "dev_token_" + Date.now(),
        applicantId: "dev_applicant_" + user.id,
        message: "Development mode - Sumsub credentials not configured"
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
    }

    // Access token for Web SDK / Mobile SDK
    const tokenResp = await sumsubFetch(
      "POST",
      `/resources/accessTokens?userId=${encodeURIComponent(String(user.id))}&levelName=${encodeURIComponent(levelName)}`,
      {}
    );

    return res.json({ ok: true, token: tokenResp?.token, applicantId });
  } catch (e) {
    console.error("[kyc/start]", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

module.exports = router;
