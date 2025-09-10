const express = require("express");
const router = express.Router();
const { db } = require("../db.js");
const logger = console;

// Detect price column once (supports old `price` or new `price_pence`)
function detectPriceCol() {
    try {
        const cols = db.prepare(`PRAGMA table_info(plans)`).all().map(c => c.name);
        return cols.includes("price_pence") ? "price_pence" : "price";
    } catch { return "price_pence"; }
}
const PRICE_COL = detectPriceCol();

// Public: GET /api/plans  — only active plans, ordered
router.get("/api/plans", (req, res) => {
    try {
        const rows = db
            .prepare(`
        SELECT id, name, slug, description, ${PRICE_COL} AS price_pence, interval, currency,
               features_json, active, sort
        FROM plans
        WHERE active = 1
        ORDER BY sort ASC, ${PRICE_COL} ASC
      `)
            .all();
        const data = rows.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            price_pence: p.price_pence,
            interval: p.interval,
            currency: p.currency,
            features: p.features_json ? JSON.parse(p.features_json) : [],
            active: !!p.active,
            sort: p.sort,
        }));
        res.json({ data });
    } catch (e) {
        logger.error("Failed to fetch plans", e);
        res.status(500).json({ error: "Could not retrieve plans" });
    }
});

module.exports = router;
