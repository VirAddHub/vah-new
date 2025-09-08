const express = require("express");
const { db } = require("../lib/db");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));

const router = express.Router();

/** POST /api/files/:id/signed-url */
router.post("/:id/signed-url", async (req, res) => {
  const userId = Number(req.user?.id || 0);
  if (!userId) return res.status(401).json({ ok:false, error:"unauthenticated" });

  const id = Number(req.params.id||0);
  if (!id) return res.status(400).json({ ok:false, error:"bad_id" });
  const f = db.prepare(`SELECT * FROM file WHERE id=?`).get(id);
  if (!f || f.user_id !== userId) return res.status(404).json({ ok:false, error:"not_found" });

  // cache hit?
  const soon = Date.now() + 60*1000; // 60s safety window
  if (f.share_url && f.share_expires_at && f.share_expires_at > soon) {
    return res.json({ ok:true, url: f.share_url, expires_at: f.share_expires_at, cached: true });
  }

  const hookUrl = process.env.MAKE_SIGN_DOWNLOAD_URL || "";
  if (!hookUrl) return res.status(500).json({ ok:false, error:"sign_service_unavailable" });

  try {
    const resp = await fetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        secret: process.env.MAKE_SIGN_DOWNLOAD_SECRET || "",
        driveId: f.drive_id,
        itemId: f.item_id,
        path: f.path,
        name: f.name,
        mime: f.mime,
      })
    });
    const j = await resp.json();
    if (!resp.ok || !j?.url) {
      return res.status(502).json({ ok:false, error:"sign_failed", detail: j });
    }
    const expires = Number(j.expires_at || 0) || (Date.now() + 15*60*1000);
    db.prepare(`UPDATE file SET share_url=?, share_expires_at=?, updated_at=? WHERE id=?`)
      .run(String(j.url), expires, Date.now(), f.id);
    return res.json({ ok:true, url: j.url, expires_at: expires, cached: false });
  } catch (e) {
    return res.status(502).json({ ok:false, error:"sign_error", detail: String(e) });
  }
});

module.exports = router;
