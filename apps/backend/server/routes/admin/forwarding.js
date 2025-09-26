// server/routes/admin/forwarding.js
const express = require('express');
const router = express.Router();

// Reuse the same in-memory store created in customer router
// When you move to a DB, replace both routers together.
const customerRouter = require('../../routes/forwarding');
const store = (() => {
    // Hacky way to access the same store: patch customer router to expose it.
    // If you prefer, move the store to a separate module.
    return customerRouter.__store || (customerRouter.__store = new Map());
})();

// Populate store reference if not already (keeps both in sync)
if (!customerRouter.__id) customerRouter.__id = { current: 1 };
let idRef = customerRouter.__id;

function nowIso() { return new Date().toISOString(); }

// List all requests (optionally filter by status)
router.get('/requests', (req, res) => {
    const { status } = req.query;
    let list = [...store.values()];
    if (status) list = list.filter(r => r.status === String(status));
    return res.json({ ok: true, data: list });
});

// Update status / admin note / assign admin / courier info
router.patch('/requests/:id', (req, res) => {
    const rec = store.get(Number(req.params.id));
    if (!rec) return res.status(404).json({ error: 'not_found' });

    const allowed = ['status', 'note', 'admin_id', 'courier', 'tracking'];
    for (const k of allowed) {
        if (k in req.body) rec[k] = req.body[k];
    }
    rec.updated_at = nowIso();
    store.set(rec.id, rec);
    return res.json({ ok: true, data: rec });
});

// Mark fulfilled (helper endpoint)
router.post('/requests/:id/fulfill', (req, res) => {
    const rec = store.get(Number(req.params.id));
    if (!rec) return res.status(404).json({ error: 'not_found' });
    rec.status = 'fulfilled';
    if (req.body?.courier) rec.courier = req.body.courier;
    if (req.body?.tracking) rec.tracking = req.body.tracking;
    rec.updated_at = nowIso();
    store.set(rec.id, rec);
    return res.json({ ok: true, data: rec });
});

module.exports = router;
