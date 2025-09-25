// server/routes/dashboard.js - Real data dashboard endpoints
const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Authentication middleware
const requireAuth = (req, res, next) => {
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
            `SELECT id, name, slug, description, price_pence, interval, currency, features_json, active
       FROM plans 
       WHERE active = true 
       ORDER BY price_pence ASC`
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

        // Get user's current plan status
        const result = await pool.query(
            `SELECT plan_status, plan_start_date, gocardless_subscription_id, mandate_id 
       FROM "user" WHERE id = $1`,
            [uid]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            subscription: {
                status: user.plan_status || 'none',
                start_date: user.plan_start_date,
                subscription_id: user.gocardless_subscription_id,
                mandate_id: user.mandate_id
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
            `SELECT id, invoice_number, amount_pence, currency, status, period_start, period_end, created_at
       FROM invoice 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
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
            `SELECT id, subject, status, created_at, updated_at
       FROM support_ticket 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
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
            `SELECT fr.id, fr.destination_name, fr.destination_address, fr.status, fr.created_at, fr.requested_at
       FROM forwarding_request fr
       WHERE fr.user = $1 
       ORDER BY fr.created_at DESC`,
            [uid]
        );

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Forwarding requests error:', error);
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
       WHERE user_id = $1 AND deleted = false
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
