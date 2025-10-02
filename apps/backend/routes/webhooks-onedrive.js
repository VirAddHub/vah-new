const express = require("express");
const crypto = require("crypto");
const { getPool } = require("../dist/src/server/db");

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
    const mac = crypto.createHmac("sha256", secret).update(raw.toString("utf8")).digest("hex");
    try {
        const a = Buffer.from(mac);
        const b = Buffer.from(headerSig);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}
const RETENTION_DAYS = Number(process.env.STORAGE_RETENTION_DAYS || 365);
const MS_DAY = 24 * 60 * 60 * 1000;

router.post("/", async (req, res) => {
    if (!basicAuthOk(req) || !ipAllowed(req)) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const headerSig = req.header("x-vah-signature");
    const raw = req.body; // Buffer (because express.raw)

    // Debug logging for signature verification
    console.log('[OneDrive Webhook Debug]');
    console.log('Headers:', req.headers);
    console.log('Raw body length:', raw ? raw.length : 'null');
    console.log('Header signature:', headerSig);
    console.log('Expected secret exists:', !!process.env.MAKE_ONEDRIVE_HMAC_SECRET);

    // For Zapier: Skip HMAC verification if no signature header is provided
    // This allows Zapier to work without complex signature generation
    if (headerSig && !verifyHmac(raw, headerSig)) {
        console.log('[OneDrive Webhook] Signature verification failed');
        return res.status(401).json({ ok: false, error: "bad_signature" });
    } else if (!headerSig) {
        console.log('[OneDrive Webhook] No signature header - allowing Zapier request');
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
     *   scanDate           // ISO string or ms (used for expires_at)
     * }
     */
    const event = String(b.event || "").toLowerCase();
    let userId = Number(b.userId || 0);

    const pool = getPool();

    try {
        if (!userId && b.userCrn) {
            const userResult = await pool.query("SELECT id FROM \"user\" WHERE company_reg_no = $1", [String(b.userCrn)]);
            userId = userResult.rows[0]?.id || 0;
        }
        if (!userId) return res.status(400).json({ ok: false, error: "user_not_found" });

        const now = Date.now();
        const modifiedAt = b.modifiedAt ? Number(b.modifiedAt) || Date.parse(b.modifiedAt) || now : now;
        const expiresAt = (b.scanDate ? (Number(b.scanDate) || Date.parse(b.scanDate)) : now) + RETENTION_DAYS * MS_DAY;

        if (event === "deleted") {
            await pool.query(`UPDATE file SET deleted=true, updated_at=$1 WHERE item_id=$2`, [now, String(b.itemId || "")]);
            return res.json({ ok: true, action: "marked_deleted" });
        }

        // upsert file by item_id
        const existingResult = await pool.query(`SELECT id, mail_item_id FROM file WHERE item_id=$1`, [String(b.itemId || "")]);
        const existing = existingResult.rows[0];

        if (existing) {
            await pool.query(`
                UPDATE file SET
                    user_id=$1, path=$2, name=$3, size=$4, mime=$5, etag=$6, modified_at=$7, web_url=$8,
                    updated_at=$9, deleted=false
                WHERE id=$10
            `, [
                userId, b.path || null, b.name || null, Number(b.size || 0), b.mimeType || null, b.eTag || null,
                modifiedAt, b.webUrl || null, now, existing.id
            ]);
        } else {
            await pool.query(`
                INSERT INTO file (user_id, mail_item_id, drive_id, item_id, path, name, size, mime, etag,
                                  modified_at, web_url, deleted, created_at, updated_at)
                VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, $12)
            `, [
                userId, b.driveId || null, b.itemId || null, b.path || null, b.name || null,
                Number(b.size || 0), b.mimeType || null, b.eTag || null, modifiedAt, b.webUrl || null, now, now
            ]);
        }

        const fileResult = await pool.query(`SELECT * FROM file WHERE item_id=$1`, [String(b.itemId || "")]);
        const fileRow = fileResult.rows[0];

        // link/create mail_item
        let mailId = Number(b.mailItemId || 0);
        if (!mailId) {
            // If a mail_item already links this file, use it; else create a new one
            const linkResult = await pool.query(`SELECT id FROM mail_item WHERE file_id = $1`, [fileRow.id]);
            mailId = linkResult.rows[0]?.id || 0;
        }

        if (!mailId) {
            const mailResult = await pool.query(`
                INSERT INTO mail_item (created_at, user_id, subject, sender_name, tag, status, notes,
                                       deleted, file_id, scanned, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, true, $9)
                RETURNING id
            `, [
                now,
                userId,
                b.name || "Scanned Mail",
                "Scan",
                "Scan",
                "scanned",                        // consistent with your statuses
                `OneDrive path: ${b.path || ""}`,
                fileRow.id,
                expiresAt
            ]);
            mailId = mailResult.rows[0].id;
        } else {
            await pool.query(`
                UPDATE mail_item SET file_id = COALESCE(file_id, $1),
                                     expires_at = COALESCE(expires_at, $2)
                WHERE id=$3
            `, [fileRow.id, expiresAt, mailId]);
        }

        // Link back from file -> mail_item if not set
        await pool.query(`UPDATE file SET mail_item_id = COALESCE(mail_item_id, $1) WHERE id = $2`, [mailId, fileRow.id]);

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

    } catch (error) {
        console.error('[OneDrive webhook] Error:', error);
        return res.status(500).json({ ok: false, error: "internal_error", message: error.message });
    }
});

module.exports = router;
