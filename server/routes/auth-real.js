// server/routes/auth-real.js - Production-ready authentication
const express = require('express');
const { hashPasswordSync, comparePasswordSync } = require('../lib/password');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../db');
const { sessionCookieOptions } = require('../../lib/cookies');

const router = express.Router();

// Validation middleware
const validateSignup = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('first_name').optional().isLength({ max: 100 }),
    body('last_name').optional().isLength({ max: 100 }),
];

const validateLogin = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
];

// Helper function to create JWT token
function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            is_admin: user.is_admin,
            role: user.role || 'user'
        },
        process.env.JWT_SECRET || 'dev-secret-change-in-production',
        {
            issuer: 'virtualaddresshub',
            audience: 'vah-users',
            expiresIn: '7d'
        }
    );
}

// Helper function to set session cookie
function setSession(res, user) {
    const token = createToken(user);
    res.cookie('vah_session', token, sessionCookieOptions);
    return token;
}

// POST /api/auth/signup
router.post('/signup', validateSignup, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { email, password, first_name = '', last_name = '' } = req.body;

        // Basic validation
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Validation failed', details: [{ path: 'email', msg: 'Invalid email' }] });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Validation failed', details: [{ path: 'password', msg: 'Password must be at least 8 characters' }] });
        }

        // Hash password
        const passwordHash = hashPasswordSync(password);

        // Create user
        const now = Date.now();
        const name = `${first_name} ${last_name}`.trim();

        const result = await db.run(`
      INSERT INTO "user" (
        created_at, updated_at, name, email, password,
        first_name, last_name, is_admin, role, status,
        kyc_status, plan_status, plan_start_date, onboarding_step
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            now, now, name, email.toLowerCase(), passwordHash,
            first_name, last_name, 0, 'user', 'active',
            'pending', 'active', now, 'signup'
        ]);

        // Get the created user
        const user = await db.get('SELECT * FROM "user" WHERE id = ?', [result.insertId || result.lastInsertRowid]);

        // Set session
        const token = setSession(res, user);

        // Return user data (without password)
        const { password: _, ...userData } = user;
        res.status(201).json({
            ok: true,
            token,
            data: userData
        });

    } catch (error) {
        // PostgreSQL duplicate email error
        if (error?.code === '23505') {
            return res.status(409).json({ error: 'Email already in use' });
        }

        console.error('[signup] error', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ error: 'Signup failed', details: error.message });
    }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await db.get('SELECT * FROM "user" WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = comparePasswordSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        const token = setSession(res, user);

        // Return user data (without password)
        const { password: _, ...userData } = user;
        res.json({
            ok: true,
            token,
            data: userData
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('vah_session', { path: '/' });
    res.json({ ok: true });
});

// GET /api/auth/whoami
router.get('/whoami', (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { password: _, ...userData } = req.user;
    res.json({ ok: true, data: userData });
});

module.exports = router;
