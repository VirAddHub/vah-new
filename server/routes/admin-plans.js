const express = require("express");
const router = express.Router();
const { db } = require("../db.js");

// simple admin gate: dev bypass or req.user.role === 'admin'
function isAdmin(req) {
    if (req.headers["x-dev-admin"] && process.env.DEV_MODE === "1") return true;
    return req.user && (req.user.role === "admin" || req.user.is_admin);
}

function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function detectPriceCol() {
    try {
        const cols = db.prepare(`PRAGMA table_info(plans)`).all().map(c => c.name);
        return cols.includes("price_pence") ? "price_pence" : "price";
    } catch { return "price_pence"; }
}
const PRICE_COL = detectPriceCol();

// LIST (includes inactive)
router.get("/api/admin/plans", (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
    const rows = db.prepare(`SELECT id,name,slug,description,${PRICE_COL} AS price_pence,interval,features_json AS features,active,sort FROM plans ORDER BY sort, ${PRICE_COL}`).all();
    rows.forEach(r => r.features = r.features ? JSON.parse(r.features) : []);
    res.json({ data: rows });
});

// CREATE
router.post("/api/admin/plans", (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
    const b = req.body || {};
    const name = (b.name || "").trim();
    if (!name) return res.status(400).json({ error: "name required" });
    const slug = (b.slug && b.slug.trim()) || slugify(name);
    const desc = b.description || "";
    const interval = (b.interval || "month").toLowerCase();
    const active = (b.active === true || b.active === 1 || b.active === "1") ? 1 : 0;
    const sort = Number.isFinite(+b.sort) ? +b.sort : 0;
    // accept price or price_pence; prefer price_pence
    const price_pence = Number.isFinite(+b.price_pence) ? +b.price_pence : Number.isFinite(+b.price) ? +b.price : 0;
    const featuresJson = JSON.stringify(Array.isArray(b.features) ? b.features : []);

    const stmt = db.prepare(`
    INSERT INTO plans (name, slug, description, ${PRICE_COL}, interval, features_json, active, sort)
    VALUES (@name,@slug,@desc,@${PRICE_COL},@interval,@features,@active,@sort)
  `);
    stmt.run({ name, slug, desc, [PRICE_COL]: price_pence, interval, features: featuresJson, active, sort });
    const row = db.prepare(`SELECT id,name,slug,description,${PRICE_COL} AS price_pence,interval,features_json AS features,active,sort FROM plans WHERE name=?`).get(name);
    row.features = row.features ? JSON.parse(row.features) : [];
    res.json({ ok: true, data: row });
});

// UPDATE
router.patch("/api/admin/plans/:id", (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
    const id = +req.params.id;
    const current = db.prepare(`SELECT * FROM plans WHERE id=?`).get(id);
    if (!current) return res.status(404).json({ error: "not found" });
    const b = req.body || {};
    const name = (b.name ?? current.name);
    const slug = (b.slug && b.slug.trim()) || current.slug || slugify(name);
    const desc = (b.description ?? current.description);
    const interval = (b.interval ?? current.interval);
    const active = (b.active === true || b.active === 1 || b.active === "1") ? 1 : (b.active === false || b.active === 0 || b.active === "0") ? 0 : current.active;
    const sort = (b.sort ?? current.sort);
    const price_pence = (Number.isFinite(+b.price_pence) ? +b.price_pence : Number.isFinite(+b.price) ? +b.price : current[PRICE_COL]);
    const featuresJson = JSON.stringify(Array.isArray(b.features) ? b.features : (current.features ? JSON.parse(current.features) : []));

    db.prepare(`
    UPDATE plans
    SET name=?, slug=?, description=?, ${PRICE_COL}=?, interval=?, features_json=?, active=?, sort=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(name, slug, desc, price_pence, interval, featuresJson, active, sort, id);

    const row = db.prepare(`SELECT id,name,slug,description,${PRICE_COL} AS price_pence,interval,features_json AS features,active,sort FROM plans WHERE id=?`).get(id);
    row.features = row.features ? JSON.parse(row.features) : [];
    res.json({ ok: true, data: row });
});

// DELETE (soft: active=0)
router.delete("/api/admin/plans/:id", (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
    const id = +req.params.id;
    db.prepare(`UPDATE plans SET active=0, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);
    res.json({ ok: true });
});

module.exports = router;