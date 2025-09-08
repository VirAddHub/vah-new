const express = require("express");
const bcrypt = require("bcryptjs");
const { newToken } = require("../lib/token");
const { sendEmail } = require("../lib/mailer");

const router = express.Router();

// Get database instance from server.js context
let db;
router.use((req, res, next) => {
  if (!db) {
    const Database = require("better-sqlite3");
    db = new Database(process.env.DB_PATH || "./vah.db");
  }
  next();
});

/**
 * POST /api/profile/reset-password-request
 * Always replies success (don't leak existence)
 */
router.post("/reset-password-request", async (req, res) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = db.prepare("SELECT id, email, name FROM user WHERE email = ?").get(email);
    const publicResp = { success: true, message: "If an account exists, a reset link has been sent." };
    if (!user) return res.json(publicResp);

    const token = newToken(32);
    const expiresMs = Date.now() + 30 * 60 * 1000; // 30 mins

    db.prepare(`
      UPDATE user
      SET password_reset_token = ?, password_reset_expires = ?, password_reset_used_at = NULL
      WHERE id = ?
    `).run(token, expiresMs, user.id);

    const appOrigin = process.env.APP_ORIGIN || "http://localhost:3000";
    // choose your preferred page route; the next page below expects /reset-password/confirm
    const link = `${appOrigin}/reset-password/confirm?token=${token}`;
    const name = user.name || "there";

    const html = `
      <p>Hi ${name},</p>
      <p>We received a request to reset your VirtualAddressHub password.</p>
      <p><a href="${link}">Reset your password</a> (valid for 30 minutes).</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your VirtualAddressHub password",
        html,
        text: `Reset link: ${link}`,
      });
    } catch (err) {
      console.error("[reset-password-request] email send failed", err);
      // Still return public success to avoid enumeration
    }

    return res.json(publicResp);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /api/profile/reset-password
 * Body: { token, password }
 */
router.post("/reset-password", (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and new password required" });
    }

    const row = db.prepare(`
      SELECT id, password_reset_expires, password_reset_used_at
      FROM user
      WHERE password_reset_token = ?
    `).get(token);

    if (!row) {
      return res.status(400).json({ success: false, code: "invalid_token", message: "Invalid or expired token" });
    }
    if (row.password_reset_used_at) {
      return res.status(400).json({ success: false, code: "used", message: "This link has already been used" });
    }
    if (!row.password_reset_expires || Date.now() > Number(row.password_reset_expires)) {
      return res.status(400).json({ success: false, code: "expired", message: "Token expired" });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const now = Date.now();

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE user
        SET password = ?, password_reset_token = NULL, password_reset_used_at = ?, password_reset_expires = NULL
        WHERE id = ?
      `).run(hashed, now, row.id);
    });
    tx();

    return res.json({ success: true, message: "Password updated. You can now log in." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
