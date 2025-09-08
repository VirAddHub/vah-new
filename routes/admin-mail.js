const express = require("express");
const { db } = require("../lib/db");
const router = express.Router();

/** PATCH /api/admin/mail-items/:id { tag?, status?, notes?, deleted? } */
router.patch("/mail-items/:id", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "bad_id" });

    const { tag, status, notes, deleted } = req.body || {};
    const fields = [], args = [];
    if (typeof tag === "string") { fields.push("tag = ?"); args.push(tag); }
    if (typeof status === "string") { fields.push("status = ?"); args.push(status); }
    if (typeof notes === "string") { fields.push("notes = ?"); args.push(notes); }
    if (deleted === true || deleted === false) { fields.push("deleted = ?"); args.push(deleted ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ ok: false, error: "no_changes" });

    const info = db.prepare(`UPDATE mail_item SET ${fields.join(", ")} WHERE id = ?`).run(...args, id);
    return res.json({ ok: true, updated: info.changes });
});

module.exports = router;
