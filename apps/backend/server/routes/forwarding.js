// server/routes/forwarding.js
const express = require('express');
const router = express.Router();

// In-memory store (replace with DB later)
let _id = 1;
const store = new Map(); // id -> record

function nowIso() { return new Date().toISOString(); }

function sanitizeInput(body = {}) {
    const {
        letter_id,
        to_name,
        address1,
        address2 = '',
        city,
        state,
        postal,
        country,
        reason = '',
        method = 'forward_physical', // or 'scan'
    } = body;

    return {
        letter_id,
        to_name, address1, address2, city, state, postal, country,
        reason, method,
    };
}

// List my requests
router.get('/requests', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    const mine = [...store.values()].filter(r => r.user_id === req.user.id);
    return res.json({ ok: true, data: mine });
});

// Create request
router.post('/requests', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });

    const data = sanitizeInput(req.body);
    const required = ['letter_id', 'to_name', 'address1', 'city', 'state', 'postal', 'country'];
    const missing = required.filter(k => !data[k]);
    if (missing.length) return res.status(400).json({ error: 'missing_fields', fields: missing });

    const rec = {
        id: _id++,
        user_id: req.user.id,
        status: 'pending', // pending -> approved/rejected -> fulfilled
        admin_id: null,
        note: '',
        courier: null,
        tracking: null,
        created_at: nowIso(),
        updated_at: nowIso(),
        ...data,
    };
    store.set(rec.id, rec);
    return res.json({ ok: true, data: rec });
});

// Show one of my requests
router.get('/requests/:id', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    const rec = store.get(Number(req.params.id));
    if (!rec || rec.user_id !== req.user.id) return res.status(404).json({ error: 'not_found' });
    return res.json({ ok: true, data: rec });
});

// Expose store for admin router to share
router.__store = store;
router.__id = { current: _id };

module.exports = router;