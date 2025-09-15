const express = require("express");
const { db } = require("../server/db");
const router = express.Router();

/**
 * POST /api/admin/mail-items/bulk
 * Body: { ids: number[], set: { tag?, status?, notes?, deleted? } }
 */
router.post("/mail-items/bulk", (req, res) => {
    if (!req.user?.is_admin) return res.status(403).json({ ok: false, error: "forbidden" });

    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    const set = req.body?.set || {};
    if (!ids.length) return res.status(400).json({ ok: false, error: "empty_ids" });

    const fields = [], args = [];
    if (typeof set.tag === "string") { fields.push("tag = ?"); args.push(set.tag); }
    if (typeof set.status === "string") { fields.push("status = ?"); args.push(set.status); }
    if (typeof set.notes === "string") { fields.push("notes = ?"); args.push(set.notes); }
    if (set.deleted === true || set.deleted === false) {
        fields.push("deleted = ?"); args.push(set.deleted ? 1 : 0);
    }
    // audit fields
    fields.push("updated_by = ?"); args.push(Number(req.user.id));
    fields.push("updated_at = ?"); args.push(Date.now());

    if (!fields.length) return res.status(400).json({ ok: false, error: "no_changes" });

    const placeholders = ids.map(() => "?").join(",");
    const sql = `UPDATE mail_item SET ${fields.join(", ")} WHERE id IN (${placeholders})`;
    const info = db.prepare(sql).run(...args, ...ids);

    // Optional: add a bulk marker row per item (we already have per-row trigger snapshots);
    // add a single bulk marker too for convenience:
    const now = Date.now();
    const before = null; // we rely on triggers for per-row snapshots
    const after = JSON.stringify(set).slice(0, 50000);
    const stmt = db.prepare(`
    INSERT INTO mail_audit (item_id, user_id, action, before_json, after_json, created_at)
    VALUES (?, ?, 'bulk_update', ?, ?, ?)
  `);
    const tx = db.transaction(() => {
        for (const id of ids) stmt.run(id, Number(req.user.id), before, after, now);
    });
    tx();

    return res.json({ ok: true, updated: info.changes, ids });
});

module.exports = router;
