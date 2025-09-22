const express = require("express");
const path = require("path");
const fs = require("fs");
const { db, expiryExpr } = require("../server/db");

const router = express.Router();

/** GET /api/downloads/export/:token  (no auth; token is the auth) */
router.get("/export/:token", async (req, res) => {
    const token = String(req.params.token || "");
    if (!token) return res.status(400).send("Missing token");

    try {
        const row = await db.get(`SELECT *, ${expiryExpr(true)} FROM export_job WHERE token=?`, [token]);
        if (!row || row.status !== "done") return res.status(404).send("Not found");
        const expiresAt = row.expires_at_ms || row.expires_at;
        if (!expiresAt || Date.now() > Number(expiresAt)) return res.status(410).send("Expired");
        if (!row.file_path || !fs.existsSync(row.file_path)) return res.status(404).send("File not found");

        const filename = path.basename(row.file_path);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        fs.createReadStream(row.file_path).pipe(res);
    } catch (e) {
        if (e?.code === '42P01') {
            return res.status(503).send("export_job table not available");
        }
        console.error('[downloads-export] error:', e?.message || e);
        return res.status(500).send("Internal error");
    }
});

module.exports = router;
