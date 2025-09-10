const express = require("express");
const path = require("path");
const fs = require("fs");
const { db } = require("../server/db.js");

const router = express.Router();

/** GET /api/downloads/export/:token  (no auth; token is the auth) */
router.get("/export/:token", (req, res) => {
    const token = String(req.params.token || "");
    if (!token) return res.status(400).send("Missing token");

    const row = db.prepare(`SELECT * FROM export_job WHERE token=?`).get(token);
    if (!row || row.status !== "done") return res.status(404).send("Not found");
    if (!row.expires_at || Date.now() > Number(row.expires_at)) return res.status(410).send("Expired");
    if (!row.file_path || !fs.existsSync(row.file_path)) return res.status(404).send("File not found");

    const filename = path.basename(row.file_path);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    fs.createReadStream(row.file_path).pipe(res);
});

module.exports = router;
