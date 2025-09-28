// server/routes/dashboard.js - Real data dashboard endpoints
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Authentication middleware with public path bypass
const PUBLIC_PATTERNS = [
  /^\/healthz$/,
  /^\/api\/healthz$/,
  /^\/api\/ready$/,
  /^\/api\/auth\/ping$/,
  /^\/api\/plans(?:\/.*)?$/,
  /^\/plans$/,
  /^\/scans\/.*/,
];

function isPublic(req) {
  const raw = (req.originalUrl || req.url || '').split('?')[0];
  return PUBLIC_PATTERNS.some((rx) => rx.test(raw));
}

const requireAuth = (req, res, next) => {
    if (isPublic(req)) return next();
    if (!req.session?.user) {
        return res.status(401).json({ error: 'unauthenticated' });
    }
    next();
};

router.use(requireAuth);

// Profile endpoint
router.get('/profile', async (req, res) => {
    try {
        const { id } = req.session.user;
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, is_admin, created_at 
       FROM "user" WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'not_found' });
        }

        res.json({ user: result.rows[0] });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Plans endpoint
router.get('/plans', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, price_usd, features, sort_order
             FROM plans
             WHERE active = true
             ORDER BY sort_order NULLS LAST, price_usd ASC`
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Plans error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Billing endpoint (current subscription)
router.get('/billing', async (req, res) => {
    try {
        const uid = req.session.user.id;

        // Check if user has a subscription
        const result = await pool.query(
            `SELECT plan_id, status, current_period_end
             FROM subscriptions
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [uid]
        );

        if (result.rows.length === 0) {
            return res.json({ subscription: null });
        }

        const subscription = result.rows[0];
        res.json({
            subscription: {
                plan_id: subscription.plan_id,
                status: subscription.status,
                renews_at: subscription.current_period_end
            }
        });
    } catch (error) {
        console.error('Billing error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Invoices endpoint
router.get('/invoices', async (req, res) => {
    try {
        const uid = req.session.user.id;
        const result = await pool.query(
            `SELECT id, number, amount, currency, status, issued_at
             FROM invoices
             WHERE user_id = $1
             ORDER BY issued_at DESC
             LIMIT 100`,
            [uid]
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Invoices error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Tickets endpoint
router.get('/tickets', async (req, res) => {
    try {
        const uid = req.session.user.id;
        const result = await pool.query(
            `SELECT id, subject, status, created_at
             FROM support_tickets
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 100`,
            [uid]
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Tickets error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forwarding requests endpoint
router.get('/forwarding-requests', async (req, res) => {
    try {
        const uid = req.session.user.id;
        const result = await pool.query(
            `SELECT id, status, created_at
       FROM forwarding_requests
       WHERE user_id = $1 
       ORDER BY created_at DESC
       LIMIT 100`,
            [uid]
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Forwarding requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Email preferences endpoint
router.get('/email-prefs', async (req, res) => {
    try {
        const uid = req.session.user.id;
        const result = await pool.query(
            `SELECT marketing, product, billing
             FROM email_prefs
             WHERE user_id = $1`,
            [uid]
        );

        if (result.rows.length === 0) {
            // Return defaults if no preferences exist
            const defaults = { marketing: false, product: true, billing: true };
            res.json({ prefs: defaults });
        } else {
            res.json({ prefs: result.rows[0] });
        }
    } catch (error) {
        console.error('Email prefs error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mail items endpoint
router.get('/mail-items', async (req, res) => {
    try {
        const uid = req.session.user.id;
        const result = await pool.query(
            `SELECT id, subject, sender_name, status, tag, scanned, created_at, received_date
       FROM mail_item 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
            [uid]
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Mail items error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
