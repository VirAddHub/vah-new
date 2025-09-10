// VirtualAddressHub Backend — Next.js-ready Express API

require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
});

// Set DEV_MODE for testing if not already set
if (!process.env.DEV_MODE) {
    process.env.DEV_MODE = '1';
    console.log('Set DEV_MODE=1 for development testing');
}

// --- core & middleware
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const rateLimit = require("express-rate-limit");
const winston = require('winston');
const compression = require('compression');
const morgan = require('morgan');
const { db } = require('./db.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const devBypass = require('../middleware/devBypass');
const joi = require('joi');
const { body, query, param, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Database functions are handled directly through the db instance

// --- routes that need raw body (webhooks)
const sumsubWebhook = require("../routes/webhooks-sumsub"); // keep if you split it out

// --- jwt helper (existing)
const jwt = require('jsonwebtoken');

// --- cookie options helper
const { sessionCookieOptions, isSecureEnv } = require("../lib/cookies");

// --- init
const app = express();
app.set('trust proxy', 1); // required for secure cookies behind Render

// Security first
app.use(helmet());

// Cookies, then CORS (with CSRF header allowed)
app.use(cookieParser());

const ALLOWED_ORIGINS = ['http://localhost:3000', 'https://www.virtualaddresshub.co.uk'];
app.use(cors({
    origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

// Webhooks BEFORE csurf (raw body)
app.use('/api/webhooks', express.raw({ type: '*/*' })); // keep your webhook handlers under /api/webhooks

// Dev bypass middleware (must be before CSRF)
app.use(devBypass);

// CSRF in cookie mode for cross-site (with dev bypass support)
const csrfMiddleware = csrf({
    cookie: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
});

// Conditional CSRF - skip for dev bypass
app.use((req, res, next) => {
    if (req.__devBypass) {
        console.log('Skipping CSRF for dev bypass request');
        return next(); // skip CSRF in dev bypass
    }
    return csrfMiddleware(req, res, next);
});

// CSRF token endpoint
app.get('/api/csrf', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Request ID for traceability
app.use((req, res, next) => {
    req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    next();
});

// CSP (Content Security Policy) - tune domains as needed
app.use((_, res, next) => {
    res.setHeader("Content-Security-Policy",
        "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; " +
        "img-src 'self' data: blob: https:; " +
        "script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self' https://api-sandbox.gocardless.com https://api.sumsub.com;"
    );
    next();
});


// light rate limit for auth-ish routes (safe to leave global)
const authLimiter = rateLimit({ windowMs: 60_000, max: 60 });
app.use(authLimiter);

// setup rate limiter (stricter for admin setup)
const setupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many setup attempts'
});

// Sumsub webhook (raw body handled globally)
app.use("/api/webhooks/sumsub", sumsubWebhook);

// GoCardless webhook (raw body handled globally)
const gcWebhook = require("../routes/webhooks-gc");
app.use("/api/webhooks/gc", gcWebhook);

// normal JSON body parser for everything else
app.use(express.json());

// Health check route
app.use('/api', require('./routes/health'));

// Mail items routes (scan URLs)
const mailItemsRoutes = require("./routes/mail-items");
const mailSearchRoutes = require("./routes/mail-search");
app.use("/api", mailItemsRoutes);
app.use("/api", mailSearchRoutes);

// ===== WEBHOOKS (before auth) =====
// (moved to after database initialization)

// safe auth attach (don't crash if cookie missing/invalid)
const JWT_COOKIE = process.env.JWT_COOKIE || "vah_session";
const JWT_SECRET = process.env.JWT_SECRET || 'dev-change-this';
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE || (NODE_ENV === 'production' ? 'strict' : 'lax')).toLowerCase();
const COOKIE_SECURE = (process.env.COOKIE_SECURE || (NODE_ENV === 'production' ? 'true' : 'false')) === 'true';

// Enhanced auth middleware: supports cookies, Bearer JWT, and dev override
app.use((req, _res, next) => {
    let token = null;

    // 1) cookie (normal path)
    token = (req.cookies && req.cookies[JWT_COOKIE]) || null;

    // 2) Authorization: Bearer <jwt> (great for curl/tests)
    const auth = req.headers.authorization || "";
    if (!token && auth.startsWith("Bearer ")) token = auth.slice(7).trim();

    if (token) {
        try {
            const payload = jwt.verify(token, JWT_SECRET, { issuer: 'virtualaddresshub', audience: 'vah-users' });
            req.user = { id: payload.id, is_admin: !!payload.is_admin, imp: !!payload.imp };
        } catch (_) {
            // ignore invalid/expired token
        }
    }

    // 3) Dev-only safety valve: X-Dev-User-Id sets req.user for quick smoke tests
    if (!req.user && process.env.NODE_ENV !== "production") {
        const devId = Number(req.header("x-dev-user-id") || 0);
        if (devId) {
            req.user = { id: devId, email: `dev+${devId}@local`, is_admin: true };
            console.log('Dev override activated for user:', devId);
        }
    }

    next();
});

// ===== ENV =====
const PORT = Number(process.env.PORT || 4000);
// NODE_ENV already declared above

const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Password123!';

const APP_URL = process.env.APP_ORIGIN || 'http://localhost:3000';

const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET;
if (process.env.NODE_ENV === 'production' && !ADMIN_SETUP_SECRET) {
    throw new Error('ADMIN_SETUP_SECRET is required in production');
}

const SETUP_ENABLED = process.env.SETUP_ENABLED === 'true';
const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || '';
const DB_PATH = process.env.DATABASE_URL || process.env.DB_PATH || (NODE_ENV === 'test' ? ':memory:' : 'data/app.db');


const CERTIFICATE_BASE_URL =
    process.env.CERTIFICATE_BASE_URL || 'https://certificates.virtualaddresshub.co.uk';

const ROYALMAIL_TRACK_URL =
    process.env.ROYALMAIL_TRACK_URL || 'https://www.royalmail.com/track-your-item#/tracking-results';

if (NODE_ENV === 'production' && (!process.env.JWT_SECRET || JWT_SECRET === 'dev-change-this')) {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
}

// ===== LOGGER =====
const logger = winston.createLogger({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'vah-backend' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});
if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

// ===== SECURITY / MIDDLEWARE =====
app.use(
    helmet({
        contentSecurityPolicy:
            NODE_ENV === 'production'
                ? {
                    useDefaults: true,
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", 'data:', 'https:'],
                    },
                }
                : false, // Easier dev
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ===== Rate limiting =====
const createRateLimit = (windowMs, max, message) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', { ip: req.ip, url: req.url });
            res.status(429).json({ error: message });
        },
    });

const noopLimiter = (req, res, next) => next();

const globalLimiter = NODE_ENV === 'test' ? noopLimiter : createRateLimit(15 * 60 * 1000, 1000, 'Too many requests');
// authLimiter already declared above

// Apply global rate limiter
app.use(globalLimiter);
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));


// ===== Database & Additional Setup =====

// ===== DB =====
try {
    // Initialize database based on DB_CLIENT environment variable
    if (process.env.DB_CLIENT === 'pg') {
        // PostgreSQL - schema will be ensured by the adapter
        logger.info('Using PostgreSQL database');
    } else {
        // SQLite - using centralized db connection from server/db.ts
        logger.info('Using SQLite database');
    }
    logger.info('DB connected');
} catch (e) {
    logger.error('DB connect failed', e);
    process.exit(1);
}

// Schema is now managed by scripts/db-schema.sql and npm run db:init
// Initialize schema based on database type
if (process.env.DB_CLIENT === 'pg') {
    // PostgreSQL schema is handled by the adapter
    logger.info('PostgreSQL schema will be ensured by adapter');
} else {
    // Check if schema exists, don't create it
    try {
        const mustHave = ["user", "mail_item", "admin_log", "mail_event", "activity_log"];
        const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const names = new Set(rows.map(r => r.name));
        const missing = mustHave.filter(t => !names.has(t));
        if (missing.length) {
            console.error("❌ DB schema missing tables:", missing);
            console.error("Run: npm run db:init");
            process.exit(1);
        }
        logger.info('SQLite schema check passed');
    } catch (e) {
        console.error("❌ DB check failed:", e);
        process.exit(1);
    }
}

// All schema management is now handled by scripts/db-schema.sql and npm run db:init

// All table creation is now handled by scripts/db-schema.sql

// All remaining schema is handled by scripts/db-schema.sql

// ===== WEBHOOKS (after database initialization) =====
const postmarkWebhook = require("../routes/webhooks-postmark");
app.use("/api/webhooks/postmark", postmarkWebhook);

// ===== VALIDATION (JOI) =====
const schemas = {
    signup: joi.object({
        email: joi.string().email().required().max(255),
        password: joi.string().min(8).max(128).required(),
        first_name: joi.string().max(100).allow('', null),
        last_name: joi.string().max(100).allow('', null),
    }),
    login: joi.object({
        email: joi.string().email().required(),
        password: joi.string().required(),
    }),
    updateProfile: joi.object({
        first_name: joi.string().max(100).allow('', null),
        last_name: joi.string().max(100).allow('', null),
        email: joi.string().email().max(255),
        company_name: joi.string().max(255).allow('', null),
        companies_house_number: joi.string().max(20).allow('', null),
        forwarding_address: joi.string().max(1000).allow('', null),
    }),
    passwordReset: joi.object({
        email: joi.string().email().required(),
    }),
    updatePassword: joi.object({
        current_password: joi.string().required(),
        new_password: joi.string().min(8).max(128).required(),
    }),
    resetPassword: joi.object({
        token: joi.string().required(),
        new_password: joi.string().min(8).max(128).required(),
    }),
    createMailItem: joi.object({
        user_id: joi.number().integer().positive().required(),
        subject: joi.string().max(500).required(),
        sender_name: joi.string().max(255).allow('', null),
        received_date: joi.string().allow('', null),
        notes: joi.string().max(2000).allow('', null),
        tag: joi.string().max(100).allow('', null),
    }),
    forwardingRequest: joi.object({
        mail_item_id: joi.number().integer().positive().required(),
        destination_name: joi.string().max(255).allow('', null),
        destination_address: joi.string().max(1000).allow('', null),
        is_billable: joi.boolean().optional(),
    }),
    createSupportTicket: joi.object({
        subject: joi.string().max(200).required(),
        message: joi.string().max(4000).allow('', null),
        email: joi.string().email().optional(),
    }),
    closeSupportTicket: joi.object({
        note: joi.string().max(1000).allow('', null),
    }),
};

const validate = schema => (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: 'Validation failed', details: error.details[0].message });
    }
    req.body = value;
    next();
};

// ===== ETag + DTO helpers =====
function toBool(n) {
    return n === 1 || n === true;
}
function mapMailBooleans(row) {
    if (!row) return row;
    return {
        ...row,
        forwarded_physically: toBool(row.forwarded_physically),
        scanned: toBool(row.scanned),
        deleted: toBool(row.deleted),
        is_billable_forward: toBool(row.is_billable_forward),
        deleted_by_admin: toBool(row.deleted_by_admin),
    };
}
function nestUser(row) {
    if (!row) return row;
    const { user_id, user_name, user_email, ...rest } = row;
    if (user_id == null && user_name == null && user_email == null) return row;
    return { ...rest, user: { id: user_id, name: user_name, email: user_email } };
}
function etagFor(obj) {
    const json = JSON.stringify(obj);
    return `W / "${Buffer.byteLength(json)}-${crypto.createHash('sha1').update(json).digest('base64')}"`;
}

// ===== POSTMARK CONFIG + HELPERS =====
const POSTMARK_FROM = process.env.POSTMARK_FROM || 'hello@virtualaddresshub.co.uk';
const POSTMARK_FROM_NAME = process.env.POSTMARK_FROM_NAME || 'VirtualAddressHub';
const POSTMARK_REPLY_TO = process.env.POSTMARK_REPLY_TO || '';
const POSTMARK_STREAM = process.env.POSTMARK_STREAM || process.env.POSTMARK_MESSAGE_STREAM || 'outbound';

async function sendTemplateEmail(templateAlias, to, model = {}, extra = {}) {
    if (!POSTMARK_TOKEN || typeof fetch !== 'function') {
        logger.info('Email skipped (Postmark disabled or fetch unavailable).', { templateAlias, to });
        return;
    }
    try {
        const fromHeader = POSTMARK_FROM_NAME ? `${POSTMARK_FROM_NAME} <${POSTMARK_FROM}>` : POSTMARK_FROM;
        const payload = {
            From: fromHeader,
            To: to,
            MessageStream: POSTMARK_STREAM,
            TemplateAlias: templateAlias,
            TemplateModel: model,
            ...extra,
        };
        if (POSTMARK_REPLY_TO) payload.ReplyTo = POSTMARK_REPLY_TO;

        const res = await fetch('https://api.postmarkapp.com/email/withTemplate', {
            method: 'POST',
            headers: {
                'X-Postmark-Server-Token': POSTMARK_TOKEN,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            logger.error('Postmark send failed', { status: res.status, body: text, templateAlias, to });
        } else {
            logger.info('Postmark email sent', { templateAlias, to });
        }
    } catch (err) {
        logger.error('Postmark send error', { error: err?.message || String(err), templateAlias, to });
    }
}

// ===== OTHER HELPERS =====
const userRowToDto = u => {
    if (!u) return null;
    const { password, ...rest } = u;
    return rest;
};

// 🔧 TEST/ADMIN UTILS
function issueToken(user, extra = {}) {
    const payload = { id: user.id, is_admin: !!user.is_admin, ...extra };
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: extra.imp ? '10m' : '7d',
        issuer: 'virtualaddresshub',
        audience: 'vah-users',
    });
}
function setSession(res, user) {
    const token = issueToken(user);
    res.cookie(JWT_COOKIE, token, sessionCookieOptions());
    return token; // return token so clients (Next BFF) can store/pass it as Bearer
}

function auth(req, res, next) {
    // Check for dev bypass first
    if (req.__devBypass && req.user) {
        console.log('Auth middleware: Using dev bypass user:', req.user.email);
        return next();
    }

    const bearer = (req.headers.authorization || '').split(' ');
    const token = (bearer[0] === 'Bearer' && bearer[1]) || (req.cookies && req.cookies[JWT_COOKIE]);
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        const payload = jwt.verify(token, JWT_SECRET, { issuer: 'virtualaddresshub', audience: 'vah-users' });
        req.user = { id: payload.id, is_admin: !!payload.is_admin, imp: !!payload.imp };
        next();
    } catch (e) {
        logger.warn('Invalid token', { ip: req.ip, msg: e.message });
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
}
function adminOnly(req, res, next) {
    // Check for dev bypass first
    if (req.__devBypass && req.user?.role === 'admin') {
        console.log('AdminOnly middleware: Using dev bypass admin:', req.user.email);
        return next();
    }

    if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
}
function logAdminAction(admin_user_id, action_type, target_type, target_id, details, req = null) {
    try {
        db.prepare(
            `INSERT INTO admin_log (created_at, admin_user_id, action_type, target_type, target_id, details, ip_address)
         VALUES (?,?,?,?,?,?,?)`
        ).run(Date.now(), admin_user_id, action_type, target_type, target_id, JSON.stringify(details || {}), req?.ip || null);
    } catch (e) {
        logger.error('logAdminAction failed', e);
    }
}
function logMailEvent(mail_item, actor_user, event_type, details = null) {
    try {
        db.prepare(
            `INSERT INTO mail_event (created_at, mail_item, actor_user, event_type, details)
         VALUES (?,?,?,?,?)`
        ).run(Date.now(), mail_item, actor_user || null, event_type, details ? JSON.stringify(details) : null);
    } catch (e) {
        logger.error('logMailEvent failed', e);
    }
}
function logActivity(user_id, action, details = null, mail_item_id = null, req = null) {
    try {
        db.prepare(
            `INSERT INTO activity_log (created_at, user_id, action, details, mail_item_id, ip_address, user_agent)
         VALUES (?,?,?,?,?,?,?)`
        ).run(Date.now(), user_id || null, action, details ? JSON.stringify(details) : null, mail_item_id || null, req?.ip || null, req?.get('User-Agent') || null);
    } catch (e) {
        logger.error('logActivity failed', e);
    }
}
function checkAccountLockout(email) {
    const row = db.prepare('SELECT login_attempts, locked_until FROM user WHERE email=?').get(email);
    if (row?.locked_until && Date.now() < row.locked_until) return { locked: true, until: row.locked_until };
    return { locked: false };
}
function incrementLoginAttempts(email) {
    const u = db.prepare('SELECT id, login_attempts FROM user WHERE email=?').get(email);
    if (!u) return;
    const attempts = (u.login_attempts || 0) + 1;
    const LOCKOUT_DURATION = 15 * 60 * 1000;
    const MAX_ATTEMPTS = 5;
    const locked_until = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_DURATION : null;
    db.prepare('UPDATE user SET login_attempts=?, locked_until=? WHERE email=?').run(attempts, locked_until, email);
}
function clearLoginAttempts(email) {
    db.prepare('UPDATE user SET login_attempts=0, locked_until=NULL, last_login_at=? WHERE email=?').run(Date.now(), email);
}

// ===== PASSWORD RESET =====
app.post('/api/profile/reset-password-request', authLimiter, validate(schemas.passwordReset), async (req, res) => {
    const { email } = req.body;
    try {
        const user = db.prepare('SELECT id, email, name FROM user WHERE email = ?').get(email);
        const publicResp = { success: true, message: 'If an account exists, a reset link has been sent.' };
        if (!user) return res.json(publicResp);

        const { newToken, sha256Hex } = require("../lib/token");
        const token = newToken(32);
        const hash = sha256Hex(token);
        const expires = Date.now() + 30 * 60 * 1000;

        db.prepare(`
    UPDATE user
    SET password_reset_token_hash = ?, password_reset_token = NULL, password_reset_expires = ?, password_reset_used_at = NULL
    WHERE id = ?
    `).run(hash, expires, user.id);

        const link = `${APP_URL}/reset-password/confirm?token=${token}`;
        const name = user.name || 'there';

        const html = `
    <p>Hi ${name},</p>
    <p>We received a request to reset your VirtualAddressHub password.</p>
    <p><a href="${link}">Reset your password</a> (valid for 30 minutes).</p>
    <p>If you didn't request this, you can ignore this email.</p>
    `;

        try {
            const { sendEmail } = require('../lib/mailer');
            await sendEmail({
                to: user.email,
                subject: 'Reset your VirtualAddressHub password',
                html,
                text: `Reset link: ${link}`,
            });
        } catch (err) {
            logger.error('[reset-password-request] email send failed', err);
            // Still return public success to avoid enumeration
        }

        logActivity(user.id, 'password_reset_requested', { email }, null, req);
        const resp = { success: true, message: 'If an account exists, a reset link has been sent.' };
        if (NODE_ENV !== 'production') resp.debug_token = token;
        res.json(resp);
    } catch (e) {
        logger.error('reset request failed', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/profile/reset-password', authLimiter, validate(schemas.resetPassword), async (req, res) => {
    const { token, new_password } = req.body;
    try {
        const { sha256Hex } = require("../lib/token");
        const h = sha256Hex(token);
        const now = Date.now();

        // First try hashed column
        let row = db.prepare(`
    SELECT id, password_reset_expires, password_reset_used_at
    FROM user
    WHERE password_reset_token_hash = ?
            AND password_reset_expires IS NOT NULL AND password_reset_expires > ?
    AND password_reset_used_at IS NULL
    LIMIT 1
    `).get(h, now);

        // Legacy fallback (if any old plaintext tokens exist)
        if (!row) {
            row = db.prepare(`
                SELECT id, password_reset_expires, password_reset_used_at
                FROM user
                WHERE password_reset_token = ?
                AND password_reset_expires IS NOT NULL AND password_reset_expires > ?
                AND password_reset_used_at IS NULL
                LIMIT 1
            `).get(token, now);
        }

        if (!row) {
            return res.status(400).json({ success: false, code: 'invalid_token', message: 'Invalid or expired token' });
        }
        if (row.password_reset_used_at) {
            return res.status(400).json({ success: false, code: 'used', message: 'This link has already been used' });
        }
        if (!row.password_reset_expires || Date.now() > Number(row.password_reset_expires)) {
            return res.status(400).json({ success: false, code: 'expired', message: 'Token expired' });
        }

        // Simple password policy check
        if (new_password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        if (!/[A-Z]/.test(new_password)) {
            return res.status(400).json({ success: false, message: 'Password must contain at least one uppercase letter' });
        }
        if (!/[a-z]/.test(new_password)) {
            return res.status(400).json({ success: false, message: 'Password must contain at least one lowercase letter' });
        }
        if (!/[0-9]/.test(new_password)) {
            return res.status(400).json({ success: false, message: 'Password must contain at least one number' });
        }

        const hashed = bcrypt.hashSync(new_password, 10);

        const tx = db.transaction(() => {
            db.prepare(`
                UPDATE user
                SET password = ?, password_reset_token_hash = NULL, password_reset_token = NULL, password_reset_used_at = ?, password_reset_expires = NULL, login_attempts = 0, locked_until = NULL
                WHERE id = ?
            `).run(hashed, now, row.id);
        });
        tx();

        logActivity(row.id, 'password_reset_completed', null, null, req);
        res.json({ success: true, message: 'Password updated. You can now log in.' });
    } catch (e) {
        logger.error('reset failed', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- KYC: start/continue (requires req.user or dev userId)
const { sumsubFetch } = require("../lib/sumsub");

// --- GoCardless: Direct Debit setup
const { gcFetch } = require("../lib/gocardless");

app.post("/api/kyc/start", async (req, res) => {
    try {
        // use session user; allow dev override via body.userId if unauthenticated
        const userId = Number(req.user?.id || req.body?.userId);
        if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

        const user = db
            .prepare("SELECT id, email, first_name, last_name, sumsub_applicant_id FROM user WHERE id = ?")
            .get(userId);
        if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

        const levelName = process.env.SUMSUB_LEVEL || "basic-kyc";

        // ensure applicant
        let applicantId = user.sumsub_applicant_id;
        if (!applicantId) {
            // if creds missing, short-circuit in dev
            if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_APP_SECRET) {
                return res.json({ ok: true, token: "dev_stub_token", applicantId: "app_dev" });
            }

            const created = await sumsubFetch("POST", "/resources/applicants", {
                externalUserId: String(user.id),
                email: user.email,
                info: { firstName: user.first_name || "", lastName: user.last_name || "" },
            });
            applicantId = created?.id;
            if (!applicantId) throw new Error("sumsub: missing applicant id");
            db.prepare("UPDATE user SET sumsub_applicant_id = ? WHERE id = ?").run(applicantId, user.id);
        }

        // fetch SDK token
        if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_APP_SECRET) {
            // dev fallback still returns a token-like value
            return res.json({ ok: true, token: "dev_stub_token", applicantId });
        }

        const tokenResp = await sumsubFetch(
            "POST",
            `/resources/accessTokens?userId=${encodeURIComponent(String(user.id))}&levelName=${encodeURIComponent(levelName)}`,
            {}
        );

        return res.json({ ok: true, token: tokenResp?.token, applicantId });
    } catch (e) {
        console.error("[/api/kyc/start]", e);
        return res.status(500).json({ ok: false, error: "server_error" });
    }
});

// --- GoCardless: Redirect Flow Start
app.post("/api/gc/redirect-flow/start", async (req, res) => {
    try {
        const userId = Number(req.user?.id || req.body?.userId);
        if (!userId) return res.status(401).json({ ok: false, error: "unauthenticated" });

        const user = db.prepare(
            "SELECT id, email, first_name, last_name, gocardless_session_token FROM user WHERE id = ?"
        ).get(userId);
        if (!user) return res.status(404).json({ ok: false, error: "user_not_found" });

        const sessionToken = user.gocardless_session_token || crypto.randomBytes(24).toString("hex");
        const successUrl = `${process.env.APP_ORIGIN || "http://localhost:3000"}/billing/gc/callback`;

        // Create Redirect Flow
        const body = {
            redirect_flows: {
                session_token: sessionToken,
                success_redirect_url: successUrl,
                description: "VirtualAddressHub Direct Debit",
                prefilled_customer: {
                    email: user.email,
                    given_name: user.first_name || "",
                    family_name: user.last_name || "",
                },
            },
        };
        const created = await gcFetch("POST", "/redirect_flows", body);

        db.prepare(`
    UPDATE user SET gocardless_session_token=?, gocardless_redirect_flow_id=?
    WHERE id=?
    `).run(sessionToken, created?.redirect_flows?.id || null, user.id);

        return res.json({
            ok: true,
            redirect_url: created?.redirect_flows?.redirect_url,
            redirect_flow_id: created?.redirect_flows?.id,
        });
    } catch (e) {
        console.error("[gc/start]", e);
        return res.status(500).json({ ok: false, error: "server_error" });
    }
});

// --- GoCardless: Redirect Flow Callback
app.get("/api/gc/redirect-flow/callback", async (req, res) => {
    try {
        const userId = Number(req.user?.id || 0);
        if (!userId) return res.status(401).send("Unauthenticated");

        const redirectFlowId = String(req.query.redirect_flow_id || "");
        if (!redirectFlowId) return res.status(400).send("Missing redirect_flow_id");

        const row = db.prepare(
            "SELECT gocardless_session_token FROM user WHERE id=?"
        ).get(userId);
        if (!row?.gocardless_session_token) return res.status(400).send("Missing session token");

        // Complete the redirect flow
        const completed = await gcFetch(
            "POST",
            `/redirect_flows/${encodeURIComponent(redirectFlowId)}/actions/complete`,
            { data: { session_token: row.gocardless_session_token } }
        );

        const links = completed?.redirect_flows?.links || {};
        const mandateId = links.mandate || null;
        const customerId = links.customer || null;

        db.prepare(`
    UPDATE user
    SET gocardless_mandate_id=?, gocardless_customer_id=?, gocardless_redirect_flow_id=NULL
    WHERE id=?
    `).run(mandateId, customerId, userId);

        const dest = `${process.env.APP_ORIGIN || "http://localhost:3000"}/billing?dd=ok`;
        return res.redirect(302, dest);
    } catch (e) {
        console.error("[gc/callback]", e);
        const dest = `${process.env.APP_ORIGIN || "http://localhost:3000"}/billing?dd=error`;
        return res.redirect(302, dest);
    }
});

app.post('/api/profile/update-password', auth, validate(schemas.updatePassword), async (req, res) => {
    const { current_password, new_password } = req.body;
    try {
        const user = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        if (!user || !bcrypt.compareSync(current_password, user.password))
            return res.status(400).json({ error: 'Current password is incorrect' });
        const hash = bcrypt.hashSync(new_password, 12);
        db.prepare('UPDATE user SET password=? WHERE id=?').run(hash, req.user.id);
        logActivity(req.user.id, 'password_changed', null, null, req);

        await sendTemplateEmail('password-changed-confirmation', user.email, {
            first_name: user.first_name || '',
            security_tips_url: `${APP_URL}/security`,
        });

        res.json({ ok: true, message: 'Password updated successfully' });
    } catch (e) {
        logger.error('update pwd failed', e);
        res.status(500).json({ error: 'Password update failed' });
    }
});

// ===== ADMIN SETUP (ONE-TIME) =====
// Only mount the setup route if explicitly enabled
if (SETUP_ENABLED) {
    app.post('/api/create-admin-user', setupLimiter, (req, res) => {
        try {
            // Check header-based authentication (more secure than body)
            const provided = req.get('x-setup-secret');
            if (!ADMIN_SETUP_SECRET || provided !== ADMIN_SETUP_SECRET) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { email, password, first_name, last_name } = req.body || {};
            if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

            const exists = db.prepare('SELECT id FROM user WHERE is_admin=1').get();
            if (exists) return res.status(409).json({ error: 'Admin user already exists' });

            const hash = bcrypt.hashSync(password, 12);
            const now = Date.now();
            const name = `${first_name || ''} ${last_name || ''}`.trim();
            const info = db
                .prepare(
                    `INSERT INTO user (created_at,name,email,password,first_name,last_name,is_admin,kyc_status,plan_status,plan_start_date,onboarding_step)
           VALUES (?,?,?,?,?,?,1,'verified','active',?,'completed')`
                )
                .run(now, name, email, hash, first_name || '', last_name || '', now);
            res.json({ ok: true, data: { user_id: info.lastInsertRowid }, message: 'Admin user created successfully.' });
        } catch (e) {
            if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
            logger.error('admin create failed', e);
            res.status(500).json({ error: 'Admin user creation failed' });
        }
    });
}

// ===== AUTH — SIGNUP =====
app.post('/api/auth/signup', authLimiter, validate(schemas.signup), async (req, res) => {
    const { email, password, first_name = '', last_name = '' } = req.body;
    try {
        const exists = db.prepare('SELECT id FROM user WHERE email=?').get(email);
        if (exists) return res.status(409).json({ error: 'Email already registered' });

        const hash = bcrypt.hashSync(password, 12);
        const now = Date.now();
        const name = `${first_name} ${last_name}`.trim();

        const info = db
            .prepare(
                `
          INSERT INTO user (
            created_at, name, email, password,
            first_name, last_name,
            kyc_status, plan_status, plan_start_date, onboarding_step
          ) VALUES (?,?,?,?,?,?, 'pending', 'active', ?, 'signup')
        `
            )
            .run(now, name, email, hash, first_name, last_name, now);

        const user = db.prepare('SELECT * FROM user WHERE id=?').get(info.lastInsertRowid);

        const token = setSession(res, user); // cookie + token
        await sendTemplateEmail('welcome-email', user.email, {
            first_name: user.first_name || '',
            dashboard_url: APP_URL,
        });

        logActivity(user.id, 'signup', { email: user.email }, null, req);
        return res.status(201).json({ ok: true, token, data: userRowToDto(user) });
    } catch (e) {
        logger.error('signup failed', e);
        return res.status(500).json({ error: 'Signup failed' });
    }
});

// ===== AUTH — LOGIN / LOGOUT =====
app.post('/api/auth/login', authLimiter, validate(schemas.login), (req, res) => {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM user WHERE email=?').get(email);
    const lock = checkAccountLockout(email);
    if (lock.locked) return res.status(423).json({ error: 'Account locked. Try again later.' });

    const ok = user && bcrypt.compareSync(password, user.password);
    if (!ok) {
        incrementLoginAttempts(email);
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    clearLoginAttempts(email);
    const token = setSession(res, user);
    logActivity(user.id, 'login', null, null, req);

    // Include dev_jwt in development for curl testing
    const body = { ok: true, token, data: userRowToDto(user) };
    if (process.env.NODE_ENV !== "production") body.dev_jwt = token;
    return res.json(body);
});

app.post('/api/auth/logout', auth, (req, res) => {
    res.clearCookie(JWT_COOKIE, {
        httpOnly: true,
        sameSite: COOKIE_SAMESITE === 'none' ? 'none' : COOKIE_SAMESITE,
        secure: COOKIE_SECURE,
    });

    logActivity(req.user.id, 'logout', null, null, req);
    res.status(204).end();
});

// === TEST ADMIN BOOTSTRAP ===
if (NODE_ENV === 'test') {
    const email = TEST_ADMIN_EMAIL;
    const rawPassword = TEST_ADMIN_PASSWORD;
    const now = Date.now();

    const colRows = db.prepare(`PRAGMA table_info(user)`).all();
    const cols = new Set(colRows.map(r => r.name));
    const has = c => cols.has(c);

    const passHash = bcrypt.hashSync(rawPassword, 12);
    const adminSetSql = has('role') ? 'role = ?' : 'is_admin = ?';
    const adminSetVal = has('role') ? 'admin' : 1;

    const existing = db.prepare(`SELECT id FROM user WHERE email = ?`).get(email);

    if (!existing) {
        const fields = ['created_at', 'email'];
        const ph = ['?', '?'];
        const values = [now, email];

        if (has('password')) {
            fields.push('password'); ph.push('?'); values.push(passHash);
        }
        if (has('password_hash')) {
            fields.push('password_hash'); ph.push('?'); values.push(passHash);
        }
        if (has('role')) { fields.push('role'); ph.push('?'); values.push('admin'); }
        if (has('is_admin')) { fields.push('is_admin'); ph.push('?'); values.push(1); }
        if (has('name')) { fields.push('name'); ph.push('?'); values.push('Admin User'); }
        if (has('first_name')) { fields.push('first_name'); ph.push('?'); values.push('Admin'); }
        if (has('last_name')) { fields.push('last_name'); ph.push('?'); values.push('User'); }
        if (has('kyc_status')) { fields.push('kyc_status'); ph.push('?'); values.push('verified'); }
        if (has('plan_status')) { fields.push('plan_status'); ph.push('?'); values.push('active'); }
        if (has('plan_start_date')) { fields.push('plan_start_date'); ph.push('?'); values.push(now); }
        if (has('onboarding_step')) { fields.push('onboarding_step'); ph.push('?'); values.push('completed'); }
        if (has('email_verified')) { fields.push('email_verified'); ph.push('?'); values.push(1); }
        if (has('email_verified_at')) { fields.push('email_verified_at'); ph.push('?'); values.push(now); }
        if (has('status')) { fields.push('status'); ph.push('?'); values.push('active'); }
        if (has('login_attempts')) { fields.push('login_attempts'); ph.push('?'); values.push(0); }
        if (has('locked_until')) { fields.push('locked_until'); ph.push('?'); values.push(null); }

        const sql = `INSERT INTO user (${fields.join(',')}) VALUES (${ph.join(',')})`;
        db.prepare(sql).run(values);
        logger.info('Bootstrapped test admin user', { email });
    } else {
        const sets = [];
        const values = [];

        if (has('password')) { sets.push('password = ?'); values.push(passHash); }
        if (has('password_hash')) { sets.push('password_hash = ?'); values.push(passHash); }
        sets.push(adminSetSql); values.push(adminSetVal);
        if (has('kyc_status')) { sets.push('kyc_status = ?'); values.push('verified'); }
        if (has('plan_status')) { sets.push('plan_status = ?'); values.push('active'); }
        if (has('plan_start_date')) { sets.push('plan_start_date = ?'); values.push(now); }
        if (has('onboarding_step')) { sets.push('onboarding_step = ?'); values.push('completed'); }
        if (has('email_verified')) { sets.push('email_verified = ?'); values.push(1); }
        if (has('email_verified_at')) { sets.push('email_verified_at = ?'); values.push(now); }
        if (has('status')) { sets.push('status = ?'); values.push('active'); }
        if (has('login_attempts')) { sets.push('login_attempts = ?'); values.push(0); }
        if (has('locked_until')) { sets.push('locked_until = ?'); values.push(null); }

        const sql = `UPDATE user SET ${sets.join(', ')} WHERE email = ?`;
        db.prepare(sql).run(...values, email);
        logger.info('Ensured test admin user exists', { email });
    }
}

// ===== DEBUG =====
app.get("/api/debug/whoami", (req, res) => {
    res.json({ ok: true, user: req.user || null, secure: isSecureEnv() });
});

app.get("/api/debug/db-info", (_req, res) => {
    try {
        const list = db.prepare("PRAGMA database_list").all();
        const counts = db.prepare("SELECT COUNT(*) AS c FROM mail_item").get();
        res.json({ ok: true, db: list, mailCount: counts.c });
    } catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});

// ===== PROFILE =====
app.get('/api/profile', auth, (req, res) => {
    try {
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        if (!u) return res.status(404).json({ error: 'User not found' });
        res.json(userRowToDto(u));
    } catch (e) {
        logger.error('profile fetch failed', e);
        res.status(500).json({ error: 'Profile fetch failed' });
    }
});
app.post('/api/profile', auth, validate(schemas.updateProfile), (req, res) => {
    const patch = req.body || {};
    try {
        if (patch.email) {
            const dupe = db.prepare('SELECT id FROM user WHERE email=? AND id != ?').get(patch.email, req.user.id);
            if (dupe) return res.status(409).json({ error: 'Email already in use' });
        }
        const sets = Object.keys(patch).map(k => `${k}=@${k}`).join(',');
        if (!sets) return res.status(400).json({ error: 'No fields to update' });
        db.prepare(`UPDATE user SET ${sets} WHERE id=@id`).run({ ...patch, id: req.user.id });
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        logActivity(req.user.id, 'profile_updated', patch, null, req);
        res.json(userRowToDto(u));
    } catch (e) {
        logger.error('profile update failed', e);
        res.status(500).json({ error: 'Profile update failed' });
    }
});
app.put('/api/profile/address', auth, (req, res) => {
    const { forwarding_address } = req.body || {};
    if (!forwarding_address) return res.status(400).json({ error: 'forwarding_address required' });
    try {
        db.prepare('UPDATE user SET forwarding_address=? WHERE id=?').run(forwarding_address, req.user.id);
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        logActivity(req.user.id, 'address_updated', { forwarding_address }, null, req);
        res.json(userRowToDto(u));
    } catch (e) {
        logger.error('address update failed', e);
        res.status(500).json({ error: 'Address update failed' });
    }
});
app.get('/api/profile/certificate-url', auth, (req, res) => {
    try {
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        if (!u) return res.status(404).json({ error: 'User not found' });
        if (u.kyc_status !== 'verified') return res.status(403).json({ error: 'KYC verification required' });
        res.json({ url: `${CERTIFICATE_BASE_URL}/${u.id}/proof-of-address.pdf` });
    } catch (e) {
        logger.error('cert url failed', e);
        res.status(500).json({ error: 'Certificate URL generation failed' });
    }
});

// ===== Mail Search Routes (mounted early to avoid conflicts) =====
const mailSearch = require("../routes/mail-search");
app.use("/api/mail-items", mailSearch);

// ===== MAIL (USER) =====
app.get(
    '/api/mail-items',
    auth,
    [
        query('status').optional().isIn(['received', 'scanned', 'forward_requested', 'forwarded', 'deleted']),
        query('tag').optional().isLength({ max: 100 }),
        query('search').optional().isLength({ max: 200 }),
        query('page').optional().isInt({ min: 1 }),
        query('per_page').optional().isInt({ min: 1, max: 100 }),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid query', details: errors.array() });
        try {
            const { status, tag, search, page = 1, per_page = 20 } = req.query;
            let sql = 'SELECT * FROM mail_item WHERE user_id=? AND deleted=0';
            const params = [req.user.id];
            if (status) { sql += ' AND status=?'; params.push(status); }
            if (tag) { sql += ' AND tag=?'; params.push(tag); }
            if (search) {
                sql += ' AND (subject LIKE ? OR sender_name LIKE ? OR notes LIKE ?)';
                const t = `%${search}%`;
                params.push(t, t, t);
            }
            const total = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) c')).get(...params).c;
            const limit = parseInt(per_page);
            const offset = (parseInt(page) - 1) * limit;
            const items = db.prepare(sql + ' ORDER BY created_at DESC LIMIT ? OFFSET ?').all(...params, limit, offset);
            res.json({
                data: items,
                meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) },
            });
        } catch (e) {
            logger.error('mail list failed', e);
            res.status(500).json({ error: 'Mail items fetch failed' });
        }
    }
);
app.get('/api/mail-items/:id', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    res.json({ data: item });
});
// Moved to server/routes/mail-items.js
app.get('/api/mail-items/:id/history', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const exists = db.prepare('SELECT id FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!exists) return res.status(404).json({ error: 'Mail item not found' });
    const events = db.prepare('SELECT * FROM mail_event WHERE mail_item=? ORDER BY created_at ASC').all(id);
    res.json({ data: events });
});
app.post('/api/mail-items/:id/tag', auth, [param('id').isInt(), body('tag').optional().isLength({ max: 100 })], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    const id = +req.params.id;
    const { tag } = req.body || {};
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    db.prepare('UPDATE mail_item SET tag=? WHERE id=?').run(tag || null, id);
    logMailEvent(id, req.user.id, 'tag_updated', { old_tag: item.tag, new_tag: tag });
    const updated = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    res.json({ data: updated });
});
app.delete('/api/mail-items/:id', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    db.prepare(`UPDATE mail_item SET deleted=1, status='deleted' WHERE id=?`).run(id);
    logMailEvent(id, req.user.id, 'deleted');
    logActivity(req.user.id, 'mail_deleted', { mail_item_id: id }, id, req);
    res.json({ ok: true, message: 'Mail item archived.' });
});
app.post('/api/mail-items/:id/restore', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=? AND deleted=1').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Deleted mail item not found' });
    db.prepare(`UPDATE mail_item SET deleted=0, status='received' WHERE id=?`).run(id);
    logMailEvent(id, req.user.id, 'restored');
    const restored = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    res.json({ data: restored });
});

// ===== Mail Search Routes (mounted early to avoid conflicts) =====
// (moved to before existing mail-items routes)

// ===== Admin Mail Routes =====
const adminMail = require("../routes/admin-mail");
const adminMailBulk = require("../routes/admin-mail-bulk");
const adminAudit = require("../routes/admin-audit");
app.use("/api/admin", adminMail);
app.use("/api/admin", adminMailBulk);
app.use("/api/admin", adminAudit);

// ===== Email Preferences Routes =====
const emailPrefs = require("../routes/email-prefs");
app.use("/api/profile", emailPrefs);

// ===== GDPR Export Routes =====
const gdprExport = require("../routes/gdpr-export");
const downloads = require("../routes/downloads");
const { scheduleCleanup } = require("../lib/gdpr-export");
app.use("/api/profile", gdprExport);   // requires auth
app.use("/api/downloads", downloads);  // token-auth
scheduleCleanup();

// ===== Notifications Routes =====
const notifications = require("../routes/notifications");
app.use("/api/notifications", notifications);

// ===== Metrics Routes =====
const { httpMetricsMiddleware } = require("../lib/metrics");
const metricsRoute = require("../routes/metrics");
app.use(httpMetricsMiddleware());         // request counters + latency hist
app.use("/api/metrics", metricsRoute);    // Prometheus scrape endpoint

// ===== OneDrive Webhook Routes =====
const onedriveWebhook = require("../routes/webhooks-onedrive");
app.use("/api/webhooks/onedrive", onedriveWebhook);

// ===== Files Routes =====
const filesRoute = require("../routes/files");
app.use("/api/files", filesRoute);

// ===== Mail Forward Routes =====
const mailForwardRoute = require("../routes/mail-forward");
app.use("/api/mail", mailForwardRoute);

// ===== Dev Repair Routes =====
if (process.env.NODE_ENV !== "production") {
    // FTS removed to prevent database corruption

    // Mount repair routes
    const adminRepair = require("../routes/admin-repair");
    app.use("/api/admin/repair", adminRepair);
}

// ===== Forward Audit Routes =====
const adminForwardAudit = require("../routes/admin-forward-audit");
app.use("/api/admin/forward-audit", adminForwardAudit);

// Legacy (used by your frontend bulk forward)
app.get('/api/mail', auth, (req, res) => {
    const { status, tag } = req.query || {};
    let sql = 'SELECT * FROM mail_item WHERE user_id=? AND deleted=0';
    const p = [req.user.id];
    if (status) { sql += ' AND status=?'; p.push(status); }
    if (tag) { sql += ' AND tag=?'; p.push(tag); }
    sql += ' ORDER BY created_at DESC';
    res.json(db.prepare(sql).all(...p));
});
app.post('/api/mail/bulk-forward-request', auth, (req, res) => {
    const { items = [], destination_name, destination_address } = req.body || {};
    const forwarded = [];
    const errors = [];
    const now = Date.now();
    const limit = now - 30 * 24 * 3600 * 1000;
    for (const id of items) {
        const row = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
        if (!row) { errors.push({ mail_id: id, reason: 'not_owner' }); continue; }
        if (row.deleted) { errors.push({ mail_id: id, reason: 'deleted' }); continue; }
        if (row.created_at < limit) { errors.push({ mail_id: id, reason: 'too_old' }); continue; }
        db.prepare("UPDATE mail_item SET status='forward_requested', requested_at=? WHERE id=?").run(now, id);
        db.prepare(
            `INSERT INTO forwarding_request (created_at,"user",mail_item,requested_at,status,is_billable,destination_name,destination_address,source)
         VALUES (?,?,?,?,'queued',0,?,?,'dashboard')`
        ).run(now, req.user.id, id, now, destination_name || null, destination_address || null);
        logMailEvent(id, req.user.id, 'forward_requested', { destination_name, destination_address });
        forwarded.push(id);
    }
    res.json({ forwarded, errors, message: `${forwarded.length} items queued, ${errors.length} failed` });
});

// ===== FORWARDING =====
app.get(
    '/api/forwarding-requests',
    auth,
    [
        query('status').optional().isIn(['pending', 'queued', 'processing', 'completed', 'cancelled', 'failed']),
        query('page').optional().isInt({ min: 1 }),
        query('per_page').optional().isInt({ min: 1, max: 100 }),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid query', details: errors.array() });
        const { status, page = 1, per_page = 20 } = req.query;
        let sql = `SELECT fr.*, mi.subject, mi.sender_name FROM forwarding_request fr
                 LEFT JOIN mail_item mi ON mi.id=fr.mail_item WHERE fr."user"=?`;
        const p = [req.user.id];
        if (status) { sql += ' AND fr.status=?'; p.push(status); }
        const total = db.prepare(sql.replace('SELECT fr.*, mi.subject, mi.sender_name', 'SELECT COUNT(*) c')).get(...p).c;
        const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
        const rows = db.prepare(sql + ' ORDER BY fr.created_at DESC LIMIT ? OFFSET ?').all(...p, limit, offset);
        res.json({
            data: rows,
            meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) },
        });
    }
);
app.get('/api/forwarding-requests/:id', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });
    const id = +req.params.id;
    const row = db.prepare(
        `SELECT fr.*, mi.subject, mi.sender_name FROM forwarding_request fr
       LEFT JOIN mail_item mi ON mi.id=fr.mail_item WHERE fr.id=? AND fr."user"=?`
    ).get(id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Forwarding request not found' });
    res.json({ data: row });
});
app.post('/api/forwarding-requests', auth, validate(schemas.forwardingRequest), (req, res) => {
    const { mail_item_id, destination_name, destination_address, is_billable = false } = req.body || {};
    const mail = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(mail_item_id, req.user.id);
    if (!mail) return res.status(404).json({ error: 'Mail item not found' });
    if (mail.deleted) return res.status(400).json({ error: 'Cannot forward deleted mail item' });
    if (mail.status === 'forward_requested' || mail.status === 'forwarded')
        return res.status(400).json({ error: 'Already requested' });
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const billable = is_billable || mail.created_at < thirtyDaysAgo;
    const now = Date.now();
    const info = db
        .prepare(
            `INSERT INTO forwarding_request (created_at,"user",mail_item,requested_at,status,is_billable,destination_name,destination_address,source)
         VALUES (?,?,?,?,'pending',?,?,?,'api')`
        )
        .run(now, req.user.id, mail_item_id, now, billable ? 1 : 0, destination_name || null, destination_address || null);
    db.prepare(`UPDATE mail_item SET status='forward_requested', requested_at=? WHERE id=?`).run(now, mail_item_id);
    logMailEvent(mail_item_id, req.user.id, 'forward_requested', { destination_name, destination_address, is_billable: billable });
    const resp = {
        ok: true,
        message: 'Forwarding request created',
        data: { forwarding_request_id: info.lastInsertRowid, is_billable: billable },
    };
    if (billable) resp.data.payment_link_url = `https://pay.gocardless.com/one-off/${info.lastInsertRowid}`;
    res.status(201).json(resp);
});
app.get('/api/forwarding-requests/usage', auth, (req, res) => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const totalFree = db
        .prepare('SELECT COUNT(*) c FROM forwarding_request WHERE "user"=? AND created_at>=? AND is_billable=0')
        .get(req.user.id, start.getTime()).c;
    const totalBill = db
        .prepare('SELECT COUNT(*) c FROM forwarding_request WHERE "user"=? AND created_at>=? AND is_billable=1')
        .get(req.user.id, start.getTime()).c;
    res.json({ ok: true, data: { total_free: totalFree, total_billable: totalBill } });
});
app.put('/api/forwarding-requests/:id/cancel', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });
    const id = +req.params.id;
    const fr = db.prepare('SELECT * FROM forwarding_request WHERE id=? AND "user"=?').get(id, req.user.id);
    if (!fr) return res.status(404).json({ error: 'Forwarding request not found' });
    if (fr.status !== 'pending') return res.status(400).json({ error: 'Can only cancel pending requests' });
    db.prepare("UPDATE forwarding_request SET status='cancelled', cancelled_at=? WHERE id=?").run(Date.now(), id);
    db.prepare("UPDATE mail_item SET status='scanned' WHERE id=?").run(fr.mail_item);
    res.json({ ok: true, message: 'Forwarding request cancelled.' });
});

// ===== PLANS =====
app.get('/api/plans', (req, res) => {
    try {
        const plans = db.prepare('SELECT * FROM plans WHERE active=1 ORDER BY price ASC').all();
        res.json({ data: plans.map(p => ({ ...p, features: p.features ? JSON.parse(p.features) : [] })) });
    } catch (e) {
        logger.error('plans failed', e);
        res.status(500).json({ error: 'Plans fetch failed' });
    }
});

// ===== PAYMENTS (USER) =====
app.get('/api/payments',
    auth,
    [query('page').optional().isInt({ min: 1 }), query('per_page').optional().isInt({ min: 1, max: 100 })],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid query' });
        const { page = 1, per_page = 20 } = req.query;
        const total = db.prepare('SELECT COUNT(*) c FROM payment WHERE user_id=?').get(req.user.id).c;
        const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
        const rows = db.prepare('SELECT * FROM payment WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(
            req.user.id, limit, offset
        );
        res.json({ data: rows, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) } });
    }
);
app.get('/api/payments/subscriptions/status', auth, (req, res) => {
    const row = db.prepare('SELECT plan_status, plan_start_date, gocardless_subscription_id, mandate_id FROM user WHERE id=?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ data: row });
});
app.post('/api/payments/redirect-flows', auth, (req, res) => {
    const redirectId = `RE${Date.now()}`;
    const redirectUrl = `https://pay.gocardless.com/flow/${redirectId}?user_id=${req.user.id}`;
    res.json({ ok: true, data: { redirect_url: redirectUrl, redirect_flow_id: redirectId } });
});
app.post('/api/payments/redirect-flows/:id/complete', auth, param('id').isString(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid redirect flow id' });

    const id = req.params.id;
    db.prepare(`UPDATE user SET gocardless_customer_id=?, mandate_id=?, plan_status='active' WHERE id=?`).run(
        `CUST_${Date.now()}`,
        `MD_${Date.now()}`,
        req.user.id
    );

    res.json({ ok: true, message: 'Payment mandate successfully created.', data: { redirect_flow_id: id } });
});

app.post('/api/payments/subscriptions', auth, async (req, res) => {
    const { action } = req.body || {};
    if (action !== 'cancel') return res.status(400).json({ error: 'Invalid action' });
    db.prepare(`UPDATE user SET plan_status='cancelled' WHERE id=?`).run(req.user.id);

    const me = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(req.user.id);
    if (me) {
        await sendTemplateEmail('plan-cancelled', me.email, {
            first_name: me.first_name || '',
            reactivate_url: `${APP_URL}/billing`,
        });
    }

    res.json({ ok: true, message: 'Your subscription has been cancelled.' });
});

// ===== KYC (Mock) =====
app.post('/api/kyc/upload', auth, async (req, res) => {
    const sdkToken = `sumsub_token_${Date.now()}`;
    const applicantId = `applicant_${req.user.id}_${Date.now()}`;
    db.prepare('UPDATE user SET sumsub_applicant_id=? WHERE id=?').run(applicantId, req.user.id);

    const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(req.user.id);
    if (u) {
        await sendTemplateEmail('kyc-submitted', u.email, {
            first_name: u.first_name || '',
            help_url: `${APP_URL}/kyc`,
        });
    }

    res.json({ ok: true, data: { sdk_access_token: sdkToken } });
});
app.get('/api/kyc/status', auth, (req, res) => {
    const u = db.prepare('SELECT kyc_status, sumsub_review_status, sumsub_rejection_reason, kyc_updated_at FROM user WHERE id=?').get(req.user.id);
    res.json({ data: u });
});
app.post('/api/kyc/resend-verification-link', auth, (req, res) => {
    res.json({ ok: true, message: 'Verification link has been resent.' });
});
app.post('/api/company-search', auth, (req, res) => {
    const { query: q } = req.body || {};
    if (!q) return res.status(400).json({ error: 'Search query required' });
    res.json({
        data: [
            { name: `${q} Ltd`, number: '12345678', status: 'active' },
            { name: `${q} Limited`, number: '87654321', status: 'active' },
        ],
    });
});

// ===== SUPPORT TICKETS =====
app.post('/api/support/tickets', auth, validate(schemas.createSupportTicket), async (req, res) => {
    const { subject, message } = req.body;
    const now = Date.now();
    const info = db
        .prepare(
            `
        INSERT INTO support_ticket (created_at, user_id, subject, message, status)
        VALUES (?,?,?,?, 'open')
      `
        )
        .run(now, req.user.id, subject, message || null);

    const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(req.user.id);
    try {
        await sendTemplateEmail('support-request-received', u.email, {
            first_name: u.first_name || '',
            ticket_id: String(info.lastInsertRowid),
            subject,
            view_url: `${APP_URL}/support/tickets/${info.lastInsertRowid}`,
        });
    } catch (e) {
        logger.error('support received email failed', { error: e.message, ticket_id: info.lastInsertRowid });
    }

    res.status(201).json({ ok: true, data: { ticket_id: info.lastInsertRowid } });
});

app.post('/api/admin/support/tickets/:id/close', auth, adminOnly, param('id').isInt(), validate(schemas.closeSupportTicket), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid ticket id' });

    const id = +req.params.id;
    const row = db
        .prepare('SELECT st.*, u.email, u.first_name FROM support_ticket st JOIN user u ON u.id=st.user_id WHERE st.id=?')
        .get(id);
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    if (row.status === 'closed') return res.status(400).json({ error: 'Already closed' });

    db.prepare("UPDATE support_ticket SET status='closed', closed_at=?, updated_at=? WHERE id=?").run(Date.now(), Date.now(), id);
    logAdminAction(req.user.id, 'support_close', 'support_ticket', id, { note: req.body.note || null }, req);

    try {
        await sendTemplateEmail('support-request-closed', row.email, {
            first_name: row.first_name || '',
            ticket_id: String(id),
            satisfaction_url: `${APP_URL}/support/feedback/${id}`,
        });
    } catch (e) {
        logger.error('support closed email failed', { error: e.message, ticket_id: id });
    }

    res.json({ ok: true, message: 'Ticket closed.' });
});

// ===== ADMIN — USERS =====
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
    const { page = 1, per_page = 20, search } = req.query || {};
    let sql = `SELECT id,created_at,name,email,first_name,last_name,kyc_status,plan_status,is_admin,company_name,companies_house_number FROM user`;
    const p = [];
    if (search) {
        sql += ' WHERE name LIKE ? OR email LIKE ? OR company_name LIKE ?';
        const s = `%${search}%`;
        p.push(s, s, s);
    }
    const total = db
        .prepare(
            sql.replace(
                'SELECT id,created_at,name,email,first_name,last_name,kyc_status,plan_status,is_admin,company_name,companies_house_number',
                'SELECT COUNT(*) c'
            )
        )
        .get(...p).c;
    const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
    const rows = db.prepare(sql + ' ORDER BY created_at DESC LIMIT ? OFFSET ?').all(...p, limit, offset);
    res.json({ data: rows, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) } });
});
app.get('/api/admin/users/:user_id', auth, adminOnly, param('user_id').isInt(), (req, res) => {
    const id = +req.params.user_id;
    const u = db.prepare('SELECT * FROM user WHERE id=?').get(id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({ data: userRowToDto(u) });
});
app.put('/api/admin/users/:user_id', auth, adminOnly, param('user_id').isInt(), (req, res) => {
    const id = +req.params.user_id;
    const allowed = ['first_name', 'last_name', 'email', 'kyc_status', 'plan_status', 'is_admin', 'company_name', 'companies_house_number', 'forwarding_address'];
    const apply = {};
    for (const k of allowed) if (k in (req.body || {})) apply[k] = req.body[k];
    if (!Object.keys(apply).length) return res.status(400).json({ error: 'No fields to update' });
    const sets = Object.keys(apply).map(k => `${k}=@${k}`).join(',');
    db.prepare(`UPDATE user SET ${sets} WHERE id=@id`).run({ ...apply, id });
    logAdminAction(req.user.id, 'update', 'user', id, apply, req);
    const u = db.prepare('SELECT * FROM user WHERE id=?').get(id);
    res.json({ data: userRowToDto(u) });
});

app.put('/api/admin/users/:user_id/kyc-status', auth, adminOnly, param('user_id').isInt(), async (req, res) => {
    const id = Number(req.params.user_id);
    const { kyc_status, rejection_reason } = req.body || {};
    if (!kyc_status) return res.status(400).json({ error: 'kyc_status required' });

    const updates = { kyc_status, kyc_updated_at: Date.now() };
    if (rejection_reason) updates.sumsub_rejection_reason = rejection_reason;

    const sets = Object.keys(updates).map(k => `${k}=@${k}`).join(',');
    db.prepare(`UPDATE user SET ${sets} WHERE id=@id`).run({ ...updates, id });

    logAdminAction(req.user.id, 'kyc_override', 'user', id, updates, req);

    const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(id);

    try {
        if (u) {
            if (kyc_status === 'verified') {
                await sendTemplateEmail('kyc-approved', u.email, {
                    first_name: u.first_name || '',
                    dashboard_url: APP_URL,
                    certificate_url: `${CERTIFICATE_BASE_URL}/${id}/proof-of-address.pdf`,
                });
            } else if (kyc_status === 'rejected') {
                await sendTemplateEmail('kyc-rejected', u.email, {
                    first_name: u.first_name || '',
                    reason: rejection_reason || 'Verification was not approved',
                    retry_url: `${APP_URL}/kyc`,
                });
            }
        }
    } catch (e) {
        logger.error('kyc-status email send failed', { error: e.message, user_id: id, kyc_status });
    }

    const updated = db.prepare('SELECT * FROM user WHERE id=?').get(id);
    return res.json({ data: userRowToDto(updated) });
});

app.post('/api/admin/users/:user_id/impersonate', auth, adminOnly, param('user_id').isInt(), (req, res) => {
    const target = +req.params.user_id;
    const u = db.prepare('SELECT * FROM user WHERE id=?').get(target);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now(), exp = now + 2 * 60 * 60 * 1000;
    db.prepare('INSERT INTO impersonation_token (admin_user_id,target_user_id,token,created_at,expires_at,ip_address) VALUES (?,?,?,?,?,?)').run(
        req.user.id, target, token, now, exp, req.ip || null
    );
    logAdminAction(req.user.id, 'impersonate', 'user', target, { token_expires_at: exp }, req);
    res.json({ ok: true, data: { impersonation_token: token } });
});
app.get('/api/admin/users/:user_id/billing-history', auth, adminOnly, param('user_id').isInt(), (req, res) => {
    const id = +req.params.user_id;
    const payments = db.prepare('SELECT * FROM payment WHERE user_id=? ORDER BY created_at DESC').all(id);
    res.json({ data: payments });
});

// ===== ADMIN — MAIL =====
app.get('/api/admin/mail-items/:id', auth, adminOnly, param('id').isInt(), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });

    const id = +req.params.id;
    const row = db
        .prepare(
            `
        SELECT m.*, u.id AS user_id, u.name AS user_name, u.email AS user_email
        FROM mail_item m
        LEFT JOIN user u ON u.id = m.user_id
        WHERE m.id = ?
      `
        )
        .get(id);

    if (!row) return res.status(404).json({ error: 'Mail item not found' });

    const shaped = nestUser(mapMailBooleans(row));
    const responseBody = { data: shaped };
    const etag = etagFor(responseBody);

    if (req.headers['if-none-match'] && req.headers['if-none-match'] === etag) {
        return res.status(304).end();
    }

    try {
        logAdminAction(req.user.id, 'read_mail_item', 'mail_item', id, { path: req.originalUrl }, req);
    } catch (_) { }

    res.set('ETag', etag);
    res.json(responseBody);
});

app.post('/api/admin/mail-items', auth, adminOnly, async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];
    const IDEM_RE = /^\d{6}-\d{4}$/; // YYMMDD-#### format

    if (!idempotencyKey || !IDEM_RE.test(idempotencyKey)) {
        return res.status(422).json({
            error: 'Missing or bad Idempotency-Key header (use YYMMDD-#### format like 250910-0001)'
        });
    }

    // Check if this idempotency key was already used
    const existing = db.prepare('SELECT id, user_id FROM mail_item WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) {
        return res.json({
            mail_item_id: existing.id,
            user_id: existing.user_id,
            message: 'Item already exists (idempotent)'
        });
    }

    const { user_id, subject, sender_name, received_date, notes, tag } = req.body;
    const now = Date.now();

    try {
        const info = db
            .prepare(
                `INSERT INTO mail_item (created_at,user_id,subject,sender_name,received_date,notes,tag,status,idempotency_key)
    VALUES (?,?,?,?,?,?,?,'received',?)`
            )
            .run(now, user_id, subject, sender_name || null, received_date || null, notes || null, tag || null, idempotencyKey);

        logAdminAction(req.user.id, 'create', 'mail_item', info.lastInsertRowid, req.body, req);
        const row = db.prepare('SELECT * FROM mail_item WHERE id=?').get(info.lastInsertRowid);

        const owner = db.prepare('SELECT email, first_name, plan_status FROM user WHERE id=?').get(user_id);
        if (owner && (owner.plan_status === 'cancelled' || owner.plan_status === 'past_due')) {
            await sendTemplateEmail('mail-received-after-cancellation', owner.email, {
                first_name: owner.first_name || '',
                subject: subject || 'Mail received',
                options_url: `${APP_URL}/billing`,
            });
        }

        res.status(201).json({
            mail_item_id: info.lastInsertRowid,
            user_id: user_id,
            data: row
        });
    } catch (e) {
        // Race condition: if unique constraint hit, fetch and return existing
        if (e.message && e.message.includes('UNIQUE constraint failed')) {
            const again = db.prepare('SELECT id, user_id FROM mail_item WHERE idempotency_key = ?').get(idempotencyKey);
            if (again) {
                return res.json({
                    mail_item_id: again.id,
                    user_id: again.user_id,
                    message: 'Item already exists (idempotent)'
                });
            }
        }
        throw e;
    }
});

app.get('/api/admin/mail-items', auth, adminOnly, (req, res) => {
    const { page = 1, per_page = 20, status, user_id, search, sort, order } = req.query || {};

    const sortable = new Set(['created_at', 'received_date', 'scanned_at', 'status', 'id']);
    const sortBy = sortable.has(sort) ? sort : 'created_at';
    const sortOrder = (order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    let sql = `
        SELECT m.*, u.id AS user_id, u.name as user_name, u.email as user_email
        FROM mail_item m
        LEFT JOIN user u ON u.id=m.user_id
        WHERE 1=1
      `;
    const p = [];
    if (status) { sql += ' AND m.status=?'; p.push(status); }
    if (user_id) { sql += ' AND m.user_id=?'; p.push(parseInt(user_id)); }
    if (search) {
        sql += ' AND (m.subject LIKE ? OR m.sender_name LIKE ? OR u.name LIKE ?)';
        const s = `%${search}%`;
        p.push(s, s, s);
    }

    const total = db.prepare(sql.replace('SELECT m.*, u.id AS user_id, u.name as user_name, u.email as user_email', 'SELECT COUNT(*) c')).get(...p).c;

    const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
    const rows = db.prepare(sql + ` ORDER BY m.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...p, limit, offset);

    const data = rows.map(r => nestUser(mapMailBooleans(r)));
    res.json({
        data,
        meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit), sort: sortBy, order: sortOrder },
    });
});

app.put('/api/admin/mail-items/:id', auth, adminOnly, param('id').isInt(), async (req, res) => {
    const id = +req.params.id;
    const allowed = ['tag', 'status', 'subject', 'sender_name', 'notes', 'admin_note', 'scan_file_url', 'file_size'];
    const updates = {};
    for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    // Special guard for "Mark as Scanned" - requires scan to be attached first
    if (updates.status === 'scanned') {
        const item = db.prepare('SELECT id, scan_file_url, received_date FROM mail_item WHERE id = ?').get(id);
        if (!item) return res.status(404).json({ error: 'Mail item not found' });

        // Check if scan is attached (scan_file_url)
        if (!item.scan_file_url) {
            return res.status(409).json({
                error: 'Attach scan before marking as scanned',
                message: 'A scan must be attached before marking the item as scanned'
            });
        }

        // Calculate shred date (received + 30 days)
        const receivedAt = item.received_date ? new Date(item.received_date) : new Date();
        const shredDate = new Date(receivedAt);
        shredDate.setDate(shredDate.getDate() + 30);

        // Add scanned timestamp and shred date to updates
        updates.scanned = 1;
        updates.scanned_at = Date.now();
        updates.notes = (updates.notes || '') + ` [Shred date: ${shredDate.toISOString().split('T')[0]}]`;
    }

    // Use transaction for atomic "Mark as Scanned" operation
    const tx = db.transaction((mailId, updateData) => {
        const before = db.prepare('SELECT * FROM mail_item WHERE id=?').get(mailId);

        const sets = Object.keys(updateData).map(k => `${k}=?`).join(',');
        const values = Object.values(updateData);
        db.prepare(`UPDATE mail_item SET ${sets} WHERE id=?`).run(...values, mailId);

        const after = db.prepare('SELECT * FROM mail_item WHERE id=?').get(mailId);

        return { before, after };
    });

    const { before, after } = tx(id, updates);

    logMailEvent(id, req.user.id, 'admin_updated', updates);
    logAdminAction(req.user.id, 'update_mail_item', 'mail_item', id, updates, req);

    if (before?.status !== 'scanned' && after?.status === 'scanned') {
        const owner = db.prepare(`SELECT u.email, u.first_name FROM user u WHERE u.id=?`).get(after.user_id);
        if (owner) {
            await sendTemplateEmail('mail-scanned', owner.email, {
                first_name: owner.first_name || '',
                subject: after.subject || 'New mail',
                view_url: `${APP_URL}/mail/${id}`,
            });
        }
    }

    res.json({ data: after });
});

app.delete('/api/admin/mail-items/:id', auth, adminOnly, param('id').isInt(), (req, res) => {
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    db.prepare(`UPDATE mail_item SET deleted=1, deleted_by_admin=1, status='deleted' WHERE id=?`).run(id);

    logAdminAction(req.user.id, 'delete', 'mail_item', id, {}, req);
    res.json({ ok: true, message: 'Mail item removed by admin.' });
});
app.post('/api/admin/mail-items/:id/restore', auth, adminOnly, param('id').isInt(), (req, res) => {
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND deleted=1').get(id);
    if (!item) return res.status(404).json({ error: 'Deleted mail item not found' });
    db.prepare('UPDATE mail_item SET deleted=0, deleted_by_admin=0, status="received" WHERE id=?').run(id);
    logAdminAction(req.user.id, 'restore', 'mail_item', id, {}, req);
    const row = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    res.json({ data: row });
});
app.post('/api/admin/mail-items/:id/log-physical-receipt', auth, adminOnly, param('id').isInt(), (req, res) => {
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    const ts = Date.now();
    db.prepare('UPDATE mail_item SET physical_receipt_timestamp=? WHERE id=?').run(ts, id);
    logMailEvent(id, req.user.id, 'physical_receipt_logged', { timestamp: ts });
    logAdminAction(req.user.id, 'log_physical_receipt', 'mail_item', id, { timestamp: ts }, req);
    res.json({ ok: true, message: 'Physical receipt logged.' });
});
app.post('/api/admin/mail-items/:id/log-physical-dispatch', auth, adminOnly, param('id').isInt(), async (req, res) => {
    const id = +req.params.id;
    const { tracking_number } = req.body || {};
    const item = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    const ts = Date.now();
    db.prepare('UPDATE mail_item SET physical_dispatch_timestamp=?, tracking_number=? WHERE id=?').run(ts, tracking_number || null, id);
    logMailEvent(id, req.user.id, 'physical_dispatch_logged', { timestamp: ts, tracking_number });
    logAdminAction(req.user.id, 'log_physical_dispatch', 'mail_item', id, { timestamp: ts, tracking_number }, req);

    const owner = db
        .prepare(
            `
          SELECT u.email, u.first_name, m.subject 
          FROM mail_item m JOIN user u ON u.id = m.user_id 
          WHERE m.id = ?
        `
        )
        .get(id);
    if (owner) {
        const trackUrl = tracking_number ? `${ROYALMAIL_TRACK_URL}/${encodeURIComponent(tracking_number)}` : '';
        await sendTemplateEmail('mail-forwarded', owner.email, {
            first_name: owner.first_name || '',
            subject: owner.subject || 'Your mail',
            tracking_number: tracking_number || '',
            track_url: trackUrl,
            help_url: APP_URL,
        });
    }

    res.json({ ok: true, message: 'Physical dispatch logged.' });
});

// ===== ADMIN — PAYMENTS =====
app.post('/api/admin/payments/initiate-refund', auth, adminOnly, (req, res) => {
    const { payment_id, amount, reason } = req.body || {};
    if (!payment_id) return res.status(400).json({ error: 'payment_id required' });
    const p = db.prepare('SELECT * FROM payment WHERE id=?').get(payment_id);
    if (!p) return res.status(404).json({ error: 'Payment not found' });
    const now = Date.now();
    db.prepare('INSERT INTO payment (created_at,user_id,status,amount,description,payment_type) VALUES (?,?, "refunded", ?, ?, "refund")').run(
        now, p.user_id, -(amount || p.amount || 0), reason || 'Admin refund'
    );
    logAdminAction(req.user.id, 'refund', 'payment', payment_id, { amount, reason }, req);
    res.json({ ok: true, message: 'Refund initiated successfully.' });
});
app.post('/api/admin/payments/create-adhoc-link', auth, adminOnly, (req, res) => {
    const { user_id, amount, description } = req.body || {};
    if (!user_id || !amount) return res.status(400).json({ error: 'user_id and amount required' });
    const pid = `adhoc_${Date.now()}`;
    const url = `https://pay.gocardless.com/one-off/${pid}`;
    db.prepare('INSERT INTO payment (created_at,user_id,status,amount,description,payment_type) VALUES (?,?, "pending", ?, ?, "adhoc")').run(
        Date.now(), user_id, amount, description || 'Admin charge'
    );
    logAdminAction(req.user.id, 'create_payment_link', 'payment', user_id, { amount, description }, req);
    res.json({ ok: true, data: { payment_link_url: url, payment_id: pid } });
});

// ===== WEBHOOKS (mock-safe) =====
app.post('/api/webhooks/gocardless', async (req, res) => {
    const body = req.body || {};
    db.prepare('INSERT INTO webhook_log (created_at,type,source,raw_payload,received_at) VALUES (?,?,?,?,?)').run(
        Date.now(), 'gocardless', 'webhook', JSON.stringify(body), Date.now()
    );
    if (body.payment) {
        const p = body.payment;
        if (p.user_id && p.status) {
            db.prepare(
                'INSERT INTO payment (created_at,user_id,gocardless_customer_id,subscription_id,status,invoice_url,mandate_id,amount,currency) VALUES (?,?,?,?,?,?,?,?,?)'
            ).run(Date.now(), p.user_id, p.gocardless_customer_id || null, p.subscription_id || null, p.status, p.invoice_url || null, p.mandate_id || null, p.amount || null, p.currency || 'GBP');

            const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(p.user_id);

            if (p.status === 'confirmed' || p.status === 'paid') {
                db.prepare(`UPDATE user SET plan_status='active' WHERE id=?`).run(p.user_id);

                if (u) {
                    await sendTemplateEmail('invoice-sent', u.email, {
                        first_name: u.first_name || '',
                        invoice_url: p.invoice_url || `${APP_URL}/billing`,
                        amount: p.amount ? (p.amount / 100).toFixed(2) : undefined,
                        currency: p.currency || 'GBP',
                    });
                }
            }
            if (p.status === 'failed') {
                db.prepare(`UPDATE user SET plan_status='past_due' WHERE id=?`).run(p.user_id);

                if (u) {
                    await sendTemplateEmail('payment-failed', u.email, {
                        first_name: u.first_name || '',
                        fix_url: `${APP_URL}/billing`,
                    });
                }
            }
            if (p.status === 'cancelled') {
                db.prepare(`UPDATE user SET plan_status='past_due' WHERE id=?`).run(p.user_id);
            }
        }
    }
    res.json({ ok: true });
});

app.post('/api/webhooks/sumsub', async (req, res) => {
    const body = req.body || {};
    db.prepare('INSERT INTO webhook_log (created_at,type,source,raw_payload,received_at) VALUES (?,?,?,?,?)').run(
        Date.now(), 'sumsub', 'webhook', JSON.stringify(body), Date.now()
    );
    const applicantId = body.applicant_id;
    const status = body.review_status;
    const userId = body.user_id;
    if (userId && status) {
        const kyc = status === 'completed' || status === 'approved' ? 'verified' : status === 'rejected' ? 'rejected' : 'pending';
        db.prepare('UPDATE user SET sumsub_applicant_id=?, sumsub_review_status=?, kyc_status=?, kyc_updated_at=?, sumsub_rejection_reason=? WHERE id=?').run(
            applicantId || null, status, kyc, Date.now(), body.rejection_reason || null, userId
        );
        if (kyc === 'verified') {
            const folderUrl = `https://onedrive.example.com/Clients/${userId}`;
            db.prepare('UPDATE user SET one_drive_folder_url=? WHERE id=?').run(folderUrl, userId);
        }

        const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(userId);
        if (u) {
            if (kyc === 'verified') {
                await sendTemplateEmail('kyc-approved', u.email, {
                    first_name: u.first_name || '',
                    dashboard_url: APP_URL,
                    certificate_url: `${CERTIFICATE_BASE_URL}/${userId}/proof-of-address.pdf`,
                });
            } else if (kyc === 'rejected') {
                await sendTemplateEmail('kyc-rejected', u.email, {
                    first_name: u.first_name || '',
                    reason: body.rejection_reason || 'Verification was not approved',
                    retry_url: `${APP_URL}/kyc`,
                });
            }
        }
    }
    res.json({ ok: true });
});

// ===== HEALTH =====
app.get('/api/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ===== Mail Search & Admin Routes =====
// (moved earlier to avoid route conflicts)

// ===== 404 for unknown /api/* =====
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    next();
});

// ===== ERROR HANDLER (last) =====
app.use((err, req, res, next) => {
    logger.error('Unhandled', { message: err.message, stack: err.stack, path: req.path });
    if (err.message && String(err.message).startsWith('Not allowed by CORS')) {
        return res.status(403).json({ error: 'CORS policy violation' });
    }
    res.status(500).json({ error: NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ===== START + GRACEFUL SHUTDOWN =====
let server = null;

if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log(`VAH backend listening on http://localhost:${PORT}`);
        console.log(`CORS origins: ${process.env.APP_ORIGIN || 'http://localhost:3000'}`);
        console.log('Booted with CSRF route /api/csrf, allowed origins:', ['http://localhost:3000', 'https://www.virtualaddresshub.co.uk']);
    });

    // ===== EXPIRING SOON NUDGE (48h warning) =====
    setInterval(() => {
        try {
            const now = Date.now();
            const soon = now + 48 * 60 * 60 * 1000;
            const rows = db.prepare(`
    SELECT id, user_id, storage_expires_at
    FROM mail_item
    WHERE storage_expires_at BETWEEN ? AND ?
    AND forwarding_status = 'No'
    `).all(now, soon);

            const { notify } = require("../lib/notify");
            rows.forEach(r => notify({
                userId: r.user_id,
                type: "mail",
                title: "Forwarding window ending soon",
                body: "You have mail that expires in the next 48 hours.",
                meta: { mail_item_id: r.id, expires_at: r.storage_expires_at }
            }));
        } catch (_) { }
    }, 60 * 60 * 1000); // Run every hour
    function shutdown(sig) {
        console.log(`\n${sig} received. Shutting down...`);
        server.close(() => process.exit(0));
    }
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Debug status (staging-only convenience)
app.get('/__status', (req, res) => {
    const routes = [];
    (app._router?.stack || []).forEach((m) => {
        if (m.route && m.route.path) {
            const methods = Object.keys(m.route.methods || {}).map(k => k.toUpperCase());
            methods.forEach((meth) => routes.push(`${meth} ${m.route.path}`));
        }
    });

    res.json({
        pid: process.pid,
        dir: __dirname,
        usingDistDb: fs.existsSync(path.join(__dirname, 'db', 'index.js')),
        haveCsrf: routes.includes('GET /api/csrf'),
        branch: process.env.RENDER_GIT_BRANCH,
        commit: process.env.RENDER_GIT_COMMIT,
        node: process.version,
        routes: routes.slice(0, 30) // keep short
    });
});

// Export for tests / serverless adapters
module.exports = { app, db, server };

