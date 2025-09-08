const express = require("express");
const crypto = require("crypto");
const { db } = require("../lib/db");

const router = express.Router();

function basicAuthOk(req) {
    const user = process.env.MAKE_ONEDRIVE_WEBHOOK_USER || "";
    const pass = process.env.MAKE_ONEDRIVE_WEBHOOK_PASS || "";
    if (!user || !pass) return process.env.NODE_ENV !== "production";
    const hdr = req.headers.authorization || "";
    if (!hdr.startsWith("Basic ")) return false;
    const [u, p] = Buffer.from(hdr.slice(6), "base64").toString("utf8").split(":");
    return u === user && p === pass;
}

function ipAllowed(req) {
    const allow = (process.env.MAKE_ONEDRIVE_ALLOWED_IPS || "")
        .split(",").map(s => s.trim()).filter(Boolean);
    if (!allow.length) return true;
    const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
    return allow.includes(ip);
}

function verifyHmac(raw, headerSig) {
    const secret = process.env.MAKE_ONEDRIVE_HMAC_SECRET || "";
    if (!secret) return process.env.NODE_ENV !== "production";
    if (!raw || !headerSig) return false;
    const mac = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    try {
        const a = Buffer.from(mac);
        const b = Buffer.from(headerSig);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}
const RETENTION_DAYS = Number(process.env.STORAGE_RETENTION_DAYS || 14);
const MS_DAY = 24 * 60 * 60 * 1000;

router.post("/", (req, res) => {
    if (!basicAuthOk(req) || !ipAllowed(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const headerSig = req.header("x-vah-signature");
    const raw = req.body; // Buffer (because express.raw)
    if (!verifyHmac(raw, headerSig)) {
        return res.status(401).json({ ok: false, error: "bad_signature" });
    }

    let b;
    try {
        b = JSON.parse(raw.toString("utf8") || "{}");
    } catch {
        return res.status(400).json({ ok: false, error: "invalid_json" });
    }

    /**
     * Expected body from Make (you already parse filename in Make):
     * {
     *   event: "created" | "updated" | "deleted",
     *   driveId, itemId, path, name, size, mimeType, eTag, modifiedAt, webUrl,
     *   userId,            // preferred (VAH user id)
     *   userCrn,           // optional (lookup by company_reg_no if userId missing)
     *   mailItemId,        // optional to link directly
     *   scanDate           // ISO string or ms (used for storage_expires_at)
     * }
     */
    const event = String(b.event || "").toLowerCase();
    let userId = Number(b.userId || 0);
    if (!userId && b.userCrn) {
        const u = db.prepare("SELECT id FROM user WHERE company_reg_no = ?").get(String(b.userCrn));
        userId = u?.id || 0;
    }
    if (!userId) return res.status(400).json({ ok: false, error: "user_not_found" });

    const now = Date.now();
    const modifiedAt = b.modifiedAt ? Number(b.modifiedAt) || Date.parse(b.modifiedAt) || now : now;
    const expiresAt = (b.scanDate ? (Number(b.scanDate) || Date.parse(b.scanDate)) : now) + RETENTION_DAYS * MS_DAY;

    if (event === "deleted") {
        db.prepare(`UPDATE file SET deleted=1, updated_at=? WHERE item_id=?`).run(now, String(b.itemId || ""));
        return res.json({ ok: true, action: "marked_deleted" });
    }

    // upsert file by item_id
    const existing = db.prepare(`SELECT id, mail_item_id FROM file WHERE item_id=?`).get(String(b.itemId || ""));
    if (existing) {
        db.prepare(`
      UPDATE file SET
        user_id=?, path=?, name=?, size=?, mime=?, etag=?, modified_at=?, web_url=?,
        updated_at=?, deleted=0
      WHERE id=?
    `).run(
            userId, b.path || null, b.name || null, Number(b.size || 0), b.mimeType || null, b.eTag || null,
            modifiedAt, b.webUrl || null, now, existing.id
        );
    } else {
        db.prepare(`
      INSERT INTO file (user_id, mail_item_id, drive_id, item_id, path, name, size, mime, etag,
                        modified_at, web_url, deleted, created_at, updated_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
            userId, b.driveId || null, b.itemId || null, b.path || null, b.name || null,
            Number(b.size || 0), b.mimeType || null, b.eTag || null, modifiedAt, b.webUrl || null, now, now
        );
    }
    const fileRow = db.prepare(`SELECT * FROM file WHERE item_id=?`).get(String(b.itemId || ""));

    // link/create mail_item
    let mailId = Number(b.mailItemId || 0);
    if (!mailId) {
        // If a mail_item already links this file, use it; else create a new one
        const link = db.prepare(`SELECT id FROM mail_item WHERE file_id = ?`).get(fileRow.id);
        mailId = link?.id || 0;
    }
    if (!mailId) {
        const info = db.prepare(`
      INSERT INTO mail_item (created_at, user_id, subject, sender_name, tag, status, notes,
                             deleted, file_id, forwarding_status, storage_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'No', ?)
    `).run(
            now,
            userId,
            b.name || "Scanned Mail",
            "Scan",
            "Scan",
            "scanned",                        // consistent with your statuses
            `OneDrive path: ${b.path || ""}`,
            fileRow.id,
            expiresAt
        );
        mailId = info.lastInsertRowid;
    } else {
        db.prepare(`
      UPDATE mail_item SET file_id = COALESCE(file_id, ?),
                           storage_expires_at = COALESCE(storage_expires_at, ?)
      WHERE id=?
    `).run(fileRow.id, expiresAt, mailId);
    }

    // Link back from file -> mail_item if not set
    db.prepare(`UPDATE file SET mail_item_id = COALESCE(mail_item_id, ?) WHERE id = ?`)
        .run(mailId, fileRow.id);

    // In-app notification: "You've got mail"
    try {
        const { notify } = require("../lib/notify");
        notify({
            userId,
            type: "mail",
            title: "You've got new scanned mail",
            body: b.name || "New file",
            meta: { mail_item_id: mailId, file_id: fileRow.id }
        });
    } catch (_) { }

    return res.json({ ok: true, mail_item_id: mailId, file_id: fileRow.id });
});

module.exports = router;
