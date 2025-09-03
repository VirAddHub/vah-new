require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
});
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Password123!';
// VirtualAddressHub Backend — Production Ready
// Install deps:
// npm i express better-sqlite3 bcryptjs cookie-parser cors nanoid jsonwebtoken joi helmet express-rate-limit winston compression express-validator morgan uuid dotenv
// Run: node server.js

const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const joi = require('joi');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const compression = require('compression');
const { body, query, param, validationResult } = require('express-validator');
const morgan = require('morgan');

// ===== ENV =====
const app = express();
const PORT = Number(process.env.PORT || 4000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const ORIGIN = (process.env.APP_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());
const APP_URL = ORIGIN[0]; // for links in emails
const JWT_SECRET = process.env.JWT_SECRET || 'dev-change-this';
const JWT_COOKIE = process.env.JWT_COOKIE || 'vah_session';
const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || 'setup-secret-2024';
const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || '';
const DB_PATH = process.env.DB_PATH || (NODE_ENV === 'test' ? ':memory:' : 'vah.db');

const CERTIFICATE_BASE_URL =
    process.env.CCERTIFICATE_BASE_URL || process.env.CERTIFICATE_BASE_URL || 'https://certificates.virtualaddresshub.co.uk';
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
        new winston.transports.File({ filename: 'logs/combined.log' })
    ],
});
if (NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

// ===== SECURITY / MIDDLEWARE =====
app.use(helmet({
    contentSecurityPolicy: NODE_ENV === 'production'
        ? {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        }
        : false, // easier dev
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

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

// In tests we disable rate limiting entirely to avoid flakiness
const noopLimiter = (req, res, next) => next();

const globalLimiter =
    NODE_ENV === 'test'
        ? noopLimiter
        : createRateLimit(15 * 60 * 1000, 1000, 'Too many requests');

const authLimiter =
    NODE_ENV === 'test'
        ? noopLimiter
        : createRateLimit(15 * 60 * 1000, 20, 'Too many authentication attempts');

// Apply global rate limiter
app.use(globalLimiter);


app.use(globalLimiter);


app.use(globalLimiter);
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

const corsOptions = {
    origin: (origin, cb) => {
        if (!origin || ORIGIN.includes(origin)) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// For secure cookies behind a proxy (Heroku/Render/Nginx)
if (NODE_ENV === 'production') app.set('trust proxy', 1);

// ===== DB =====
let db;
try {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('busy_timeout = 5000');
    logger.info('DB connected');
} catch (e) {
    logger.error('DB connect failed', e);
    process.exit(1);
}

const bootstrapSQL = `
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  forwarding_address TEXT,
  kyc_status TEXT DEFAULT 'pending',
  plan_status TEXT DEFAULT 'active',
  one_drive_folder_url TEXT,
  is_admin INTEGER DEFAULT 0,
  kyc_updated_at INTEGER,
  company_name TEXT,
  companies_house_number TEXT,
  sumsub_applicant_id TEXT,
  sumsub_review_status TEXT,
  sumsub_last_updated INTEGER,
  sumsub_rejection_reason TEXT,
  sumsub_webhook_payload TEXT,
  plan_start_date INTEGER,
  onboarding_step TEXT DEFAULT 'signup',
  gocardless_customer_id TEXT,
  gocardless_subscription_id TEXT,
  mandate_id TEXT,
  last_login_at INTEGER,
  login_attempts INTEGER DEFAULT 0,
  locked_until INTEGER,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);

CREATE TABLE IF NOT EXISTS mail_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  subject TEXT,
  received_date TEXT,
  scan_file_url TEXT,
  file_size INTEGER,
  forwarded_physically INTEGER DEFAULT 0,
  notes TEXT,
  forwarded_date TEXT,
  forward_reason TEXT,
  sender_name TEXT,
  scanned INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  tag TEXT,
  is_billable_forward INTEGER DEFAULT 0,
  admin_note TEXT,
  deleted_by_admin INTEGER DEFAULT 0,
  action_log TEXT,
  scanned_at INTEGER,
  status TEXT DEFAULT 'received',
  requested_at INTEGER,
  physical_receipt_timestamp INTEGER,
  physical_dispatch_timestamp INTEGER,
  tracking_number TEXT,
  updated_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mail_item_user ON mail_item(user_id);

CREATE TABLE IF NOT EXISTS payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  gocardless_customer_id TEXT,
  subscription_id TEXT,
  status TEXT,
  invoice_url TEXT,
  mandate_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'GBP',
  description TEXT,
  payment_type TEXT DEFAULT 'subscription',
  updated_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  mail_item_id INTEGER,
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS admin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  admin_user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip_address TEXT
);

CREATE TABLE IF NOT EXISTS forwarding_request (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  "user" INTEGER NOT NULL,
  mail_item INTEGER NOT NULL,
  requested_at INTEGER,
  status TEXT DEFAULT 'pending',
  payment INTEGER,
  is_billable INTEGER DEFAULT 0,
  billed_at INTEGER,
  destination_name TEXT,
  destination_address TEXT,
  source TEXT,
  cancelled_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY("user") REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY(mail_item) REFERENCES mail_item(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mail_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  mail_item INTEGER NOT NULL,
  actor_user INTEGER,
  event_type TEXT NOT NULL,
  details TEXT,
  FOREIGN KEY(mail_item) REFERENCES mail_item(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  raw_payload TEXT,
  received_at INTEGER NOT NULL,
  processed INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS password_reset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  ip_address TEXT,
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'GBP',
  interval TEXT DEFAULT 'monthly',
  features TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS impersonation_token (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL,
  target_user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  ip_address TEXT
);
`;
db.exec(bootstrapSQL);
// Helpful indexes for perf on common filters/sorts
try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mail_item_user_status ON mail_item(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_mail_item_created_at ON mail_item(created_at);
      CREATE INDEX IF NOT EXISTS idx_mail_item_tag ON mail_item(tag);
      CREATE INDEX IF NOT EXISTS idx_forwarding_request_user_status ON forwarding_request("user", status);
      CREATE INDEX IF NOT EXISTS idx_forwarding_request_created_at ON forwarding_request(created_at);
      CREATE INDEX IF NOT EXISTS idx_payment_user_created_at ON payment(user_id, created_at);
    `);
    logger.info('Indexes ensured');
} catch (e) {
    logger.warn('Index creation failed (non-fatal)', { error: String(e) });
}

// --- lightweight auto-migrations for new columns ---
function ensureColumn(table, column, type) {
    // SQLite PRAGMA can't bind table name; safe here because table is hardcoded by us
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name);
    if (!cols.includes(column)) {
        logger.info(`Adding column ${table}.${column} (${type})`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    }
}

// Columns introduced in recent versions:
ensureColumn('mail_item', 'physical_receipt_timestamp', 'INTEGER');
ensureColumn('mail_item', 'physical_dispatch_timestamp', 'INTEGER');
ensureColumn('mail_item', 'tracking_number', 'TEXT');

// ✅ Migrate older DBs that are missing these:
ensureColumn('activity_log', 'ip_address', 'TEXT');
ensureColumn('activity_log', 'user_agent', 'TEXT');

// === Support Tickets (for support_received / support_closed) ===
const supportSQL = `
CREATE TABLE IF NOT EXISTS support_ticket (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  closed_at INTEGER,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'open',
  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_support_ticket_user ON support_ticket(user_id);
`;
db.exec(supportSQL);

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

    // 👇 NEW: create a support ticket (auth or via email for testing)
    createSupportTicket: joi.object({
        subject: joi.string().max(200).required(),
        message: joi.string().max(4000).allow('', null),
        email: joi.string().email().optional() // allow when not authenticated (for testing/dev)
    }),

    // 👇 NEW: close a support ticket (admin)
    closeSupportTicket: joi.object({
        note: joi.string().max(1000).allow('', null)
    }),
};

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            error: 'Validation failed',
            details: error.details[0].message,
        });
    }
    req.body = value;
    next();
};

// ===== ETag + DTO helpers (NEW) =====
function toBool(n) { return n === 1 || n === true; }
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
    return `W/"${Buffer.byteLength(json)}-${crypto.createHash('sha1').update(json).digest('base64')}"`;
}

// ===== POSTMARK CONFIG + HELPERS =====
const POSTMARK_FROM = process.env.POSTMARK_FROM || 'hello@virtualaddresshub.co.uk';
const POSTMARK_FROM_NAME = process.env.POSTMARK_FROM_NAME || 'VirtualAddressHub';
const POSTMARK_REPLY_TO = process.env.POSTMARK_REPLY_TO || '';
const POSTMARK_MESSAGE_STREAM = process.env.POSTMARK_MESSAGE_STREAM || 'outbound';
const POSTMARK_STREAM = process.env.POSTMARK_STREAM || process.env.POSTMARK_MESSAGE_STREAM || 'outbound';

const POSTMARK_TEMPLATES = {
    welcome: 'welcome-email',
    password_reset: 'password-reset-email',
    password_changed_confirmation: 'password-changed-confirmation',
    kyc_submitted: 'kyc-submitted',
    kyc_approved: 'kyc-approved',
    kyc_rejected: 'kyc-rejected',
    invoice_sent: 'invoice-sent',
    payment_failed: 'payment-failed',
    plan_cancelled: 'plan-cancelled',
    mail_scanned: 'mail-scanned',
    mail_forwarded: 'mail-forwarded',
    mail_after_cancel: 'mail-received-after-cancellation',
    support_received: 'support-request-received',
    support_closed: 'support-request-closed',
    account_closed: 'account-closed-data-removed',
};

async function sendTemplateEmail(templateAlias, to, model = {}, extra = {}) {
    // If Postmark not configured or fetch missing, skip gracefully
    if (!POSTMARK_TOKEN || typeof fetch !== 'function') {
        logger.info('Email skipped (Postmark disabled or fetch unavailable).', { templateAlias, to });
        return;
    }
    try {
        const fromHeader = POSTMARK_FROM_NAME ? `${POSTMARK_FROM_NAME} <${POSTMARK_FROM}>` : POSTMARK_FROM;
        const payload = {
            From: fromHeader,
            To: to,
            MessageStream: POSTMARK_STREAM,  // <-- use the defined const
            TemplateAlias: templateAlias,
            TemplateModel: model,
            ...extra
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

async function sendPostmarkEmail({
    To,
    TemplateAlias,       // e.g. 'welcome-email'
    TemplateModel,       // object for template variables
    TemplateId,          // optional numeric template ID (if you prefer ID over alias)
    Subject,             // for non-template sends
    HtmlBody,            // for non-template sends
    TextBody,            // for non-template sends
    MessageStream,       // override stream if needed
    Cc,
    Bcc,
    Tag                  // optional tag for analytics
}) {
    if (!POSTMARK_TOKEN) {
        logger.info('Postmark disabled – set POSTMARK_TOKEN to enable sending.', {
            To,
            Template: TemplateAlias || TemplateId || null,
            Subject: Subject || null
        });
        return { skipped: true };
    }

    const fromHeader = POSTMARK_FROM_NAME ? `${POSTMARK_FROM_NAME} <${POSTMARK_FROM}>` : POSTMARK_FROM;
    const base = {
        From: fromHeader,
        To,
        MessageStream: MessageStream || POSTMARK_STREAM,
    };
    if (POSTMARK_REPLY_TO) base.ReplyTo = POSTMARK_REPLY_TO;
    if (Cc) base.Cc = Cc;
    if (Bcc) base.Bcc = Bcc;
    if (Tag) base.Tag = Tag;

    const usingTemplate = !!(TemplateAlias || TemplateId);
    const endpoint = usingTemplate ? 'email/withTemplate' : 'email';

    const payload = usingTemplate
        ? { ...base, TemplateAlias, TemplateId, TemplateModel }
        : { ...base, Subject, HtmlBody, TextBody };

    try {
        const resp = await fetch(`https://api.postmarkapp.com/${endpoint}`, {
            method: 'POST',
            headers: {
                'X-Postmark-Server-Token': POSTMARK_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            const msg = json?.Message || `Postmark send failed (${resp.status})`;
            throw new Error(msg);
        }
        logger.info('postmark sent', {
            to: To,
            template: TemplateAlias || TemplateId || null,
            subject: Subject || null,
            messageId: json.MessageID
        });
        return json;
    } catch (e) {
        logger.error('postmark send failed', {
            error: String(e),
            to: To,
            template: TemplateAlias || TemplateId || null,
            subject: Subject || null
        });
        throw e;
    }
}

// ===== OTHER HELPERS (unchanged) =====
const userRowToDto = (u) => { if (!u) return null; const { password, ...rest } = u; return rest; };

// 🔧 TEST/ADMIN UTILS
function findAnyAdmin() {
    try {
        return db.prepare('SELECT * FROM user WHERE is_admin = 1 OR role = "admin" ORDER BY created_at ASC LIMIT 1').get();
    } catch {
        return null;
    }
}

function issueToken(user, extra = {}) {
    const payload = { id: user.id, is_admin: !!user.is_admin, ...extra };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: extra.imp ? '10m' : '7d', issuer: 'virtualaddresshub', audience: 'vah-users' });
}
function setSession(res, user) {
    const token = issueToken(user);
    res.cookie(JWT_COOKIE, token, { httpOnly: true, sameSite: NODE_ENV === 'production' ? 'strict' : 'lax', secure: NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 });
}
function auth(req, res, next) {
    const bearer = (req.headers.authorization || '').split(' ');
    const token = (bearer[0] === 'Bearer' && bearer[1]) || req.cookies[JWT_COOKIE];
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
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
}
function logAdminAction(admin_user_id, action_type, target_type, target_id, details, req = null) {
    try {
        db.prepare(`INSERT INTO admin_log (created_at, admin_user_id, action_type, target_type, target_id, details, ip_address)
      VALUES (?,?,?,?,?,?,?)`).run(Date.now(), admin_user_id, action_type, target_type, target_id, JSON.stringify(details || {}), req?.ip || null);
    } catch (e) { logger.error('logAdminAction failed', e); }
}
function logMailEvent(mail_item, actor_user, event_type, details = null) {
    try {
        db.prepare(`INSERT INTO mail_event (created_at, mail_item, actor_user, event_type, details)
      VALUES (?,?,?,?,?)`).run(Date.now(), mail_item, actor_user || null, event_type, details ? JSON.stringify(details) : null);
    } catch (e) { logger.error('logMailEvent failed', e); }
}
function logActivity(user_id, action, details = null, mail_item_id = null, req = null) {
    try {
        db.prepare(`INSERT INTO activity_log (created_at, user_id, action, details, mail_item_id, ip_address, user_agent)
      VALUES (?,?,?,?,?,?,?)`).run(Date.now(), user_id || null, action, details ? JSON.stringify(details) : null, mail_item_id || null, req?.ip || null, req?.get('User-Agent') || null);
    } catch (e) { logger.error('logActivity failed', e); }
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
        const user = db.prepare('SELECT * FROM user WHERE email=?').get(email);
        if (!user) return res.json({ ok: true, message: 'If the email exists, we sent a link' });
        const existing = db.prepare('SELECT * FROM password_reset WHERE user_id=? AND used=0 AND expires_at>?').get(user.id, Date.now());
        if (existing) return res.status(429).json({ error: 'Password reset already requested. Please wait.' });

        const token = crypto.randomBytes(32).toString('hex');
        const now = Date.now();
        db.prepare('INSERT INTO password_reset (user_id, token, created_at, expires_at, ip_address) VALUES (?,?,?,?,?)')
            .run(user.id, token, now, now + 60 * 60 * 1000, req.ip);

        // Postmark: password reset
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.password_reset,
            user.email,
            {
                first_name: user.first_name || '',
                reset_url: `${APP_URL}/reset-password?token=${token}`,
                expires_in_hours: 1
            }
        );

        logActivity(user.id, 'password_reset_requested', { email }, null, req);
        const resp = { ok: true, message: 'If the email exists, we sent a link' };
        if (NODE_ENV !== 'production') resp.debug_token = token; // dev helper
        res.json(resp);
    } catch (e) { logger.error('reset request failed', e); res.status(500).json({ error: 'Password reset request failed' }); }
});

app.post('/api/profile/reset-password', authLimiter, validate(schemas.resetPassword), async (req, res) => {
    const { token, new_password } = req.body;
    try {
        const row = db.prepare('SELECT * FROM password_reset WHERE token=? AND used=0').get(token);
        if (!row) return res.status(400).json({ error: 'Invalid or used token' });
        if (Date.now() > row.expires_at) return res.status(400).json({ error: 'Token expired' });
        const hash = bcrypt.hashSync(new_password, 12);
        db.prepare('UPDATE user SET password=?, login_attempts=0, locked_until=NULL WHERE id=?').run(hash, row.user_id);
        db.prepare('UPDATE password_reset SET used=1 WHERE id=?').run(row.id);
        logActivity(row.user_id, 'password_reset_completed', null, null, req);

        // Postmark: password changed confirmation
        const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(row.user_id);
        if (u) {
            await sendTemplateEmail(
                POSTMARK_TEMPLATES.password_changed_confirmation,
                u.email,
                {
                    first_name: u.first_name || '',
                    security_tips_url: `${APP_URL}/security`
                }
            );
        }

        res.json({ ok: true, message: 'Password has been reset successfully' });
    } catch (e) { logger.error('reset failed', e); res.status(500).json({ error: 'Password reset failed' }); }
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

        // Postmark: password changed confirmation
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.password_changed_confirmation,
            user.email,
            {
                first_name: user.first_name || '',
                security_tips_url: `${APP_URL}/security`
            }
        );

        res.json({ ok: true, message: 'Password updated successfully' });
    } catch (e) { logger.error('update pwd failed', e); res.status(500).json({ error: 'Password update failed' }); }
});

// ===== ADMIN SETUP (ONE-TIME) =====
app.post('/api/create-admin-user', authLimiter, (req, res) => {
    const { email, password, first_name, last_name, setup_secret } = req.body || {};
    if (setup_secret !== ADMIN_SETUP_SECRET) return res.status(403).json({ error: 'Invalid setup credentials' });
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
        const exists = db.prepare('SELECT id FROM user WHERE is_admin=1').get();
        if (exists) return res.status(409).json({ error: 'Admin user already exists' });
        const hash = bcrypt.hashSync(password, 12);
        const now = Date.now();
        const name = `${first_name || ''} ${last_name || ''}`.trim();
        const info = db.prepare(`INSERT INTO user (created_at,name,email,password,first_name,last_name,is_admin,kyc_status,plan_status,plan_start_date,onboarding_step)
      VALUES (?,?,?,?,?,?,1,'verified','active',?,'completed')`).run(now, name, email, hash, first_name || '', last_name || '', now);
        res.json({ ok: true, data: { user_id: info.lastInsertRowid }, message: 'Admin user created successfully.' });
    } catch (e) {
        if (String(e).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
        logger.error('admin create failed', e); res.status(500).json({ error: 'Admin user creation failed' });
    }
});
// ===== AUTH — SIGNUP =====

app.post('/api/auth/signup', authLimiter, validate(schemas.signup), async (req, res) => {
    const { email, password, first_name = '', last_name = '' } = req.body;
    try {
        // unique email?
        const exists = db.prepare('SELECT id FROM user WHERE email=?').get(email);
        if (exists) return res.status(409).json({ error: 'Email already registered' });

        const hash = bcrypt.hashSync(password, 12);
        const now = Date.now();
        const name = `${first_name} ${last_name}`.trim();

        const info = db.prepare(`
        INSERT INTO user (
          created_at, name, email, password,
          first_name, last_name,
          kyc_status, plan_status, plan_start_date, onboarding_step
        ) VALUES (?,?,?,?,?,?, 'pending', 'active', ?, 'signup')
      `).run(now, name, email, hash, first_name, last_name, now);

        const user = db.prepare('SELECT * FROM user WHERE id=?').get(info.lastInsertRowid);

        // create session cookie
        setSession(res, user);

        // send welcome email (template alias: "welcome-email")
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.welcome,
            user.email,
            {
                first_name: user.first_name || '',
                dashboard_url: APP_URL
            }
        );

        logActivity(user.id, 'signup', { email: user.email }, null, req);
        return res.status(201).json({ ok: true, data: userRowToDto(user) });
    } catch (e) {
        logger.error('signup failed', e);
        return res.status(500).json({ error: 'Signup failed' });
    }
});
// ===== AUTH — LOGIN / LOGOUT =====

// 👇 EDITED: robust test-only admin login bypass/rescue
app.post('/api/auth/login', authLimiter, validate(schemas.login), (req, res) => {
    const { email, password } = req.body;
    const emailLower = String(email || '').toLowerCase();

    // Look up the requested user first
    const user = db.prepare('SELECT * FROM user WHERE email=?').get(email);

    // If tests are logging in with the *actual* admin email we have, bypass password
    const isAdminUser = !!(user && ((user.is_admin === 1) || user.role === 'admin'));

    // Normal lockout + password flow
    const lock = checkAccountLockout(email);
    if (lock.locked) return res.status(423).json({ error: 'Account locked. Try again later.' });

    const ok = user && bcrypt.compareSync(password, user.password);
    if (!ok) {
        incrementLoginAttempts(email);
        return res.status(400).json({ error: 'Invalid email or password' });
    }

    clearLoginAttempts(email);
    setSession(res, user);
    logActivity(user.id, 'login', null, null, req);
    return res.json({ ok: true, data: userRowToDto(user) });
});


app.post('/api/auth/logout', auth, (req, res) => {
    res.clearCookie(JWT_COOKIE, {
        httpOnly: true,
        sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
        secure: NODE_ENV === 'production'
    });
    logActivity(req.user.id, 'logout', null, null, req);
    res.status(204).end();
});
// === TEST ADMIN BOOTSTRAP (HARDENED: always sync password & clear lockouts) ===
if (NODE_ENV === 'test') {
    const email = TEST_ADMIN_EMAIL;
    const rawPassword = TEST_ADMIN_PASSWORD;
    const now = Date.now();

    // Discover user table columns
    const colRows = db.prepare(`PRAGMA table_info(user)`).all();
    const cols = new Set(colRows.map(r => r.name));
    const has = (c) => cols.has(c);

    const passHash = bcrypt.hashSync(rawPassword, 12);

    // Admin representation can be role or is_admin; prefer role if present
    const adminSetSql = has('role') ? 'role = ?' : 'is_admin = ?';
    const adminSetVal = has('role') ? 'admin' : 1;

    const existing = db.prepare(`SELECT id FROM user WHERE email = ?`).get(email);

    if (!existing) {
        const fields = ['created_at', 'email'];
        const ph = ['?', '?'];
        const values = [now, email];

        if (has('password')) { fields.push('password'); ph.push('?'); values.push(passHash); }
        if (has('password_hash')) { fields.push('password_hash'); ph.push('?'); values.push(passHash); }

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

// ===== PROFILE =====
app.get('/api/profile', auth, (req, res) => {
    try {
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        if (!u) return res.status(404).json({ error: 'User not found' });
        res.json(userRowToDto(u));
    } catch (e) { logger.error('profile fetch failed', e); res.status(500).json({ error: 'Profile fetch failed' }); }
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
    } catch (e) { logger.error('profile update failed', e); res.status(500).json({ error: 'Profile update failed' }); }
});
app.put('/api/profile/address', auth, (req, res) => {
    const { forwarding_address } = req.body || {};
    if (!forwarding_address) return res.status(400).json({ error: 'forwarding_address required' });
    try {
        db.prepare('UPDATE user SET forwarding_address=? WHERE id=?').run(forwarding_address, req.user.id);
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        logActivity(req.user.id, 'address_updated', { forwarding_address }, null, req);
        res.json(userRowToDto(u));
    } catch (e) { logger.error('address update failed', e); res.status(500).json({ error: 'Address update failed' }); }
});
app.get('/api/profile/certificate-url', auth, (req, res) => {
    try {
        const u = db.prepare('SELECT * FROM user WHERE id=?').get(req.user.id);
        if (!u) return res.status(404).json({ error: 'User not found' });
        if (u.kyc_status !== 'verified') return res.status(403).json({ error: 'KYC verification required' });
        res.json({ url: `${CERTIFICATE_BASE_URL}/${u.id}/proof-of-address.pdf` });
    } catch (e) { logger.error('cert url failed', e); res.status(500).json({ error: 'Certificate URL generation failed' }); }
});

// ===== MAIL (USER) =====
app.get('/api/mail-items', auth, [
    query('status').optional().isIn(['received', 'scanned', 'forward_requested', 'forwarded', 'deleted']),
    query('tag').optional().isLength({ max: 100 }),
    query('search').optional().isLength({ max: 200 }),
    query('page').optional().isInt({ min: 1 }),
    query('per_page').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid query', details: errors.array() });
    try {
        const { status, tag, search, page = 1, per_page = 20 } = req.query;
        let sql = 'SELECT * FROM mail_item WHERE user_id=? AND deleted=0';
        const params = [req.user.id];
        if (status) { sql += ' AND status=?'; params.push(status); }
        if (tag) { sql += ' AND tag=?'; params.push(tag); }
        if (search) { sql += ' AND (subject LIKE ? OR sender_name LIKE ? OR notes LIKE ?)'; const t = `%${search}%`; params.push(t, t, t); }
        const total = db.prepare(sql.replace('SELECT *', 'SELECT COUNT(*) c')).get(...params).c;
        const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
        const items = db.prepare(sql + ' ORDER BY created_at DESC LIMIT ? OFFSET ?').all(...params, limit, offset);
        res.json({ data: items, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) } });
    } catch (e) { logger.error('mail list failed', e); res.status(500).json({ error: 'Mail items fetch failed' }); }
});
app.get('/api/mail-items/:id', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    res.json({ data: item });
});
app.get('/api/mail-items/:id/scan-url', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const row = db.prepare('SELECT scan_file_url FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Mail item not found' });
    if (!row.scan_file_url) return res.status(404).json({ error: 'No scan available' });
    res.json({ ok: true, data: { scan_url: row.scan_file_url } });
});
app.get('/api/mail-items/:id/history', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const exists = db.prepare('SELECT id FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!exists) return res.status(404).json({ error: 'Mail item not found' });
    const events = db.prepare('SELECT * FROM mail_event WHERE mail_item=? ORDER BY created_at ASC').all(id);
    res.json({ data: events });
});
app.post('/api/mail-items/:id/tag', auth, [param('id').isInt(), body('tag').optional().isLength({ max: 100 })], (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    const id = +req.params.id; const { tag } = req.body || {};
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    db.prepare('UPDATE mail_item SET tag=? WHERE id=?').run(tag || null, id);
    logMailEvent(id, req.user.id, 'tag_updated', { old_tag: item.tag, new_tag: tag });
    const updated = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    res.json({ data: updated });
});
app.delete('/api/mail-items/:id', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    db.prepare(`UPDATE mail_item SET deleted=1, status='deleted' WHERE id=?`).run(id);
    logMailEvent(id, req.user.id, 'deleted');
    logActivity(req.user.id, 'mail_deleted', { mail_item_id: id }, id, req);
    res.json({ ok: true, message: 'Mail item archived.' });
});
app.post('/api/mail-items/:id/restore', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid mail id' });
    const id = +req.params.id;
    const item = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=? AND deleted=1').get(id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Deleted mail item not found' });
    db.prepare(`UPDATE mail_item SET deleted=0, status='received' WHERE id=?`).run(id);
    logMailEvent(id, req.user.id, 'restored');
    const restored = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    res.json({ data: restored });
});

// Legacy (used by your frontend bulk forward)
app.get('/api/mail', auth, (req, res) => {
    const { status, tag } = req.query || {};
    let sql = 'SELECT * FROM mail_item WHERE user_id=? AND deleted=0'; const p = [req.user.id];
    if (status) { sql += ' AND status=?'; p.push(status); }
    if (tag) { sql += ' AND tag=?'; p.push(tag); }
    sql += ' ORDER BY created_at DESC';
    res.json(db.prepare(sql).all(...p));
});
app.post('/api/mail/bulk-forward-request', auth, (req, res) => {
    const { items = [], destination_name, destination_address } = req.body || {};
    const forwarded = []; const errors = [];
    const now = Date.now(); const limit = now - 30 * 24 * 3600 * 1000;
    for (const id of items) {
        const row = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(id, req.user.id);
        if (!row) { errors.push({ mail_id: id, reason: 'not_owner' }); continue; }
        if (row.deleted) { errors.push({ mail_id: id, reason: 'deleted' }); continue; }
        if (row.created_at < limit) { errors.push({ mail_id: id, reason: 'too_old' }); continue; }
        db.prepare("UPDATE mail_item SET status='forward_requested', requested_at=? WHERE id=?").run(now, id);
        db.prepare(`INSERT INTO forwarding_request (created_at,"user",mail_item,requested_at,status,is_billable,destination_name,destination_address,source)
      VALUES (?,?,?,?,'queued',0,?,?,'dashboard')`)
            .run(now, req.user.id, id, now, destination_name || null, destination_address || null);
        logMailEvent(id, req.user.id, 'forward_requested', { destination_name, destination_address });
        forwarded.push(id);
    }
    res.json({ forwarded, errors, message: `${forwarded.length} items queued, ${errors.length} failed` });
});

// ===== FORWARDING =====
app.get('/api/forwarding-requests', auth, [
    query('status').optional().isIn(['pending', 'queued', 'processing', 'completed', 'cancelled', 'failed']),
    query('page').optional().isInt({ min: 1 }),
    query('per_page').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid query', details: errors.array() });
    const { status, page = 1, per_page = 20 } = req.query;
    let sql = `SELECT fr.*, mi.subject, mi.sender_name FROM forwarding_request fr
             LEFT JOIN mail_item mi ON mi.id=fr.mail_item WHERE fr."user"=?`;
    const p = [req.user.id]; if (status) { sql += ' AND fr.status=?'; p.push(status); }
    const total = db.prepare(sql.replace('SELECT fr.*, mi.subject, mi.sender_name', 'SELECT COUNT(*) c')).get(...p).c;
    const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
    const rows = db.prepare(sql + ' ORDER BY fr.created_at DESC LIMIT ? OFFSET ?').all(...p, limit, offset);
    res.json({ data: rows, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) } });
});
app.get('/api/forwarding-requests/:id', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });
    const id = +req.params.id;
    const row = db.prepare(`SELECT fr.*, mi.subject, mi.sender_name FROM forwarding_request fr
    LEFT JOIN mail_item mi ON mi.id=fr.mail_item WHERE fr.id=? AND fr."user"=?`).get(id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Forwarding request not found' });
    res.json({ data: row });
});
app.post('/api/forwarding-requests', auth, validate(schemas.forwardingRequest), (req, res) => {
    const { mail_item_id, destination_name, destination_address, is_billable = false } = req.body || {};
    const mail = db.prepare('SELECT * FROM mail_item WHERE id=? AND user_id=?').get(mail_item_id, req.user.id);
    if (!mail) return res.status(404).json({ error: 'Mail item not found' });
    if (mail.deleted) return res.status(400).json({ error: 'Cannot forward deleted mail item' });
    if (mail.status === 'forward_requested' || mail.status === 'forwarded') return res.status(400).json({ error: 'Already requested' });
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const billable = is_billable || mail.created_at < thirtyDaysAgo;
    const now = Date.now();
    const info = db.prepare(`INSERT INTO forwarding_request (created_at,"user",mail_item,requested_at,status,is_billable,destination_name,destination_address,source)
    VALUES (?,?,?,?,'pending',?,?,?,'api')`).run(now, req.user.id, mail_item_id, now, billable ? 1 : 0, destination_name || null, destination_address || null);
    db.prepare(`UPDATE mail_item SET status='forward_requested', requested_at=? WHERE id=?`).run(now, mail_item_id);
    logMailEvent(mail_item_id, req.user.id, 'forward_requested', { destination_name, destination_address, is_billable: billable });
    const resp = { ok: true, message: 'Forwarding request created', data: { forwarding_request_id: info.lastInsertRowid, is_billable: billable } };
    if (billable) resp.data.payment_link_url = `https://pay.gocardless.com/one-off/${info.lastInsertRowid}`;
    res.status(201).json(resp);
});
app.get('/api/forwarding-requests/usage', auth, (req, res) => {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const totalFree = db.prepare('SELECT COUNT(*) c FROM forwarding_request WHERE "user"=? AND created_at>=? AND is_billable=0').get(req.user.id, start.getTime()).c;
    const totalBill = db.prepare('SELECT COUNT(*) c FROM forwarding_request WHERE "user"=? AND created_at>=? AND is_billable=1').get(req.user.id, start.getTime()).c;
    res.json({ ok: true, data: { total_free: totalFree, total_billable: totalBill } });
});
app.put('/api/forwarding-requests/:id/cancel', auth, param('id').isInt(), (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });
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
    } catch (e) { logger.error('plans failed', e); res.status(500).json({ error: 'Plans fetch failed' }); }
});

// ===== PAYMENTS (USER) =====
app.get('/api/payments', auth, [
    query('page').optional().isInt({ min: 1 }),
    query('per_page').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid query' });
    const { page = 1, per_page = 20 } = req.query;
    const total = db.prepare('SELECT COUNT(*) c FROM payment WHERE user_id=?').get(req.user.id).c;
    const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
    const rows = db.prepare('SELECT * FROM payment WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.user.id, limit, offset);
    res.json({ data: rows, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) } });
});
app.get('/api/payments/subscriptions/status', auth, (req, res) => {
    const row = db.prepare('SELECT plan_status, plan_start_date, gocardless_subscription_id, mandate_id FROM user WHERE id=?').get(req.user.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ data: row });
});
// Mock redirect flow (dev)
app.post('/api/payments/redirect-flows', auth, (req, res) => {
    const redirectId = `RE${Date.now()}`;
    const redirectUrl = `https://pay.gocardless.com/flow/${redirectId}?user_id=${req.user.id}`;
    res.json({ ok: true, data: { redirect_url: redirectUrl, redirect_flow_id: redirectId } });
});
app.post('/api/payments/redirect-flows/:id/complete',
    auth,
    param('id').isString(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid redirect flow id' });

        const id = req.params.id;
        // Mock completion; in prod, call GoCardless to complete and persist result
        db.prepare(`UPDATE user SET gocardless_customer_id=?, mandate_id=?, plan_status='active' WHERE id=?`)
            .run(`CUST_${Date.now()}`, `MD_${Date.now()}`, req.user.id);

        res.json({ ok: true, message: 'Payment mandate successfully created.', data: { redirect_flow_id: id } });
    }
);

app.post('/api/payments/subscriptions', auth, async (req, res) => {
    const { action } = req.body || {};
    if (action !== 'cancel') return res.status(400).json({ error: 'Invalid action' });
    db.prepare(`UPDATE user SET plan_status='cancelled' WHERE id=?`).run(req.user.id);

    // Postmark: plan cancelled
    const me = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(req.user.id);
    if (me) {
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.plan_cancelled,
            me.email,
            {
                first_name: me.first_name || '',
                reactivate_url: `${APP_URL}/billing`
            }
        );
    }

    res.json({ ok: true, message: 'Your subscription has been cancelled.' });
});

// ===== KYC (Mock) =====
app.post('/api/kyc/upload', auth, async (req, res) => {
    const sdkToken = `sumsub_token_${Date.now()}`;
    const applicantId = `applicant_${req.user.id}_${Date.now()}`;
    db.prepare('UPDATE user SET sumsub_applicant_id=? WHERE id=?').run(applicantId, req.user.id);

    // Postmark: KYC submitted
    const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(req.user.id);
    if (u) {
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.kyc_submitted,
            u.email,
            {
                first_name: u.first_name || '',
                help_url: `${APP_URL}/kyc`
            }
        );
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
    res.json({ data: [{ name: `${q} Ltd`, number: '12345678', status: 'active' }, { name: `${q} Limited`, number: '87654321', status: 'active' }] });
});
// ===== SUPPORT TICKETS =====
app.post('/api/support/tickets', auth, validate(schemas.createSupportTicket), async (req, res) => {
    const { subject, message } = req.body;
    const now = Date.now();
    const info = db.prepare(`
      INSERT INTO support_ticket (created_at, user_id, subject, message, status)
      VALUES (?,?,?,?, 'open')
    `).run(now, req.user.id, subject, message || null);

    const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(req.user.id);
    try {
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.support_received,
            u.email,
            {
                first_name: u.first_name || '',
                ticket_id: String(info.lastInsertRowid),
                subject,
                view_url: `${APP_URL}/support/tickets/${info.lastInsertRowid}`
            }
        );
    } catch (e) {
        logger.error('support received email failed', { error: e.message, ticket_id: info.lastInsertRowid });
    }

    res.status(201).json({ ok: true, data: { ticket_id: info.lastInsertRowid } });
});

app.post('/api/admin/support/tickets/:id/close',
    auth, adminOnly, param('id').isInt(), validate(schemas.closeSupportTicket),
    async (req, res) => {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid ticket id' });

        const id = +req.params.id;
        const row = db.prepare('SELECT st.*, u.email, u.first_name FROM support_ticket st JOIN user u ON u.id=st.user_id WHERE st.id=?').get(id);
        if (!row) return res.status(404).json({ error: 'Ticket not found' });
        if (row.status === 'closed') return res.status(400).json({ error: 'Already closed' });

        db.prepare("UPDATE support_ticket SET status='closed', closed_at=?, updated_at=? WHERE id=?")
            .run(Date.now(), Date.now(), id);
        logAdminAction(req.user.id, 'support_close', 'support_ticket', id, { note: req.body.note || null }, req);

        try {
            await sendTemplateEmail(
                POSTMARK_TEMPLATES.support_closed,
                row.email,
                {
                    first_name: row.first_name || '',
                    ticket_id: String(id),
                    satisfaction_url: `${APP_URL}/support/feedback/${id}`
                }
            );
        } catch (e) {
            logger.error('support closed email failed', { error: e.message, ticket_id: id });
        }

        res.json({ ok: true, message: 'Ticket closed.' });
    }
);

// ===== ADMIN — USERS =====
app.get('/api/admin/users', auth, adminOnly, (req, res) => {
    const { page = 1, per_page = 20, search } = req.query || {};
    let sql = `SELECT id,created_at,name,email,first_name,last_name,kyc_status,plan_status,is_admin,company_name,companies_house_number FROM user`;
    const p = [];
    if (search) { sql += ' WHERE name LIKE ? OR email LIKE ? OR company_name LIKE ?'; const s = `%${search}%`; p.push(s, s, s); }
    const total = db.prepare(sql.replace('SELECT id,created_at,name,email,first_name,last_name,kyc_status,plan_status,is_admin,company_name,companies_house_number', 'SELECT COUNT(*) c')).get(...p).c;
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
    const apply = {}; for (const k of allowed) if (k in (req.body || {})) apply[k] = req.body[k];
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

    // Minimal fields just for the email
    const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(id);

    // Best-effort email; don't fail the request if it errors
    try {
        if (u) {
            if (kyc_status === 'verified') {
                await sendTemplateEmail(
                    POSTMARK_TEMPLATES.kyc_approved,
                    u.email,
                    {
                        first_name: u.first_name || '',
                        dashboard_url: APP_URL,
                        certificate_url: `${CERTIFICATE_BASE_URL}/${id}/proof-of-address.pdf`
                    }
                );
            } else if (kyc_status === 'rejected') {
                await sendTemplateEmail(
                    POSTMARK_TEMPLATES.kyc_rejected,
                    u.email,
                    {
                        first_name: u.first_name || '',
                        reason: rejection_reason || 'Verification was not approved',
                        retry_url: `${APP_URL}/kyc`
                    }
                );
            }
        }
    } catch (e) {
        logger.error('kyc-status email send failed', { error: e.message, user_id: id, kyc_status });
    }

    // Return the full, updated user
    const updated = db.prepare('SELECT * FROM user WHERE id=?').get(id);
    return res.json({ data: userRowToDto(updated) });
});

app.post('/api/admin/users/:user_id/impersonate', auth, adminOnly, param('user_id').isInt(), (req, res) => {
    const target = +req.params.user_id;
    const u = db.prepare('SELECT * FROM user WHERE id=?').get(target);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now(), exp = now + 2 * 60 * 60 * 1000;
    db.prepare('INSERT INTO impersonation_token (admin_user_id,target_user_id,token,created_at,expires_at,ip_address) VALUES (?,?,?,?,?,?)')
        .run(req.user.id, target, token, now, exp, req.ip || null);
    logAdminAction(req.user.id, 'impersonate', 'user', target, { token_expires_at: exp }, req);
    res.json({ ok: true, data: { impersonation_token: token } });
});
app.get('/api/admin/users/:user_id/billing-history', auth, adminOnly, param('user_id').isInt(), (req, res) => {
    const id = +req.params.user_id;
    const payments = db.prepare('SELECT * FROM payment WHERE user_id=? ORDER BY created_at DESC').all(id);
    res.json({ data: payments });
});

// ===== ADMIN — MAIL =====

// GET by id: boolean mapping + nested user + conditional GET + audit
app.get('/api/admin/mail-items/:id',
    auth, adminOnly, param('id').isInt(),
    (req, res) => {
        console.log('HIT /api/admin/mail-items/:id', req.params.id);
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid id' });

        const id = +req.params.id;
        const row = db.prepare(`
      SELECT m.*, u.id AS user_id, u.name AS user_name, u.email AS user_email
      FROM mail_item m
      LEFT JOIN user u ON u.id = m.user_id
      WHERE m.id = ?
    `).get(id);

        if (!row) return res.status(404).json({ error: 'Mail item not found' });

        const shaped = nestUser(mapMailBooleans(row));
        const responseBody = { data: shaped };
        const etag = etagFor(responseBody);

        if (req.headers['if-none-match'] && req.headers['if-none-match'] === etag) {
            return res.status(304).end();
        }

        // audit (best-effort)
        try {
            logAdminAction(req.user.id, 'read_mail_item', 'mail_item', id, { path: req.originalUrl }, req);
        } catch (_) { }

        res.set('ETag', etag);
        res.json(responseBody);
    }
);
console.log('MOUNTED: /api/admin/mail-items/:id');

app.post('/api/admin/mail-items', auth, adminOnly, async (req, res) => {
    // validate server-side using Joi schema used below in PUT route, but it's okay for now since admin controlled
    const { user_id, subject, sender_name, received_date, notes, tag } = req.body;
    const now = Date.now();
    const info = db.prepare(`INSERT INTO mail_item (created_at,user_id,subject,sender_name,received_date,notes,tag,status)
    VALUES (?,?,?,?,?,?,?,'received')`).run(now, user_id, subject, sender_name || null, received_date || null, notes || null, tag || null);
    logAdminAction(req.user.id, 'create', 'mail_item', info.lastInsertRowid, req.body, req);
    const row = db.prepare('SELECT * FROM mail_item WHERE id=?').get(info.lastInsertRowid);

    // If user is cancelled/past_due, notify mail received after cancellation
    const owner = db.prepare('SELECT email, first_name, plan_status FROM user WHERE id=?').get(user_id);
    if (owner && (owner.plan_status === 'cancelled' || owner.plan_status === 'past_due')) {
        await sendTemplateEmail(
            POSTMARK_TEMPLATES.mail_after_cancel,
            owner.email,
            {
                first_name: owner.first_name || '',
                subject: subject || 'Mail received',
                options_url: `${APP_URL}/billing`
            }
        );
    }

    res.status(201).json({ data: row });
});

// LIST: add sorting + boolean mapping + nested user
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
    if (search) { sql += ' AND (m.subject LIKE ? OR m.sender_name LIKE ? OR u.name LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }

    const total = db.prepare(sql.replace(
        'SELECT m.*, u.id AS user_id, u.name as user_name, u.email as user_email',
        'SELECT COUNT(*) c'
    )).get(...p).c;

    const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
    const rows = db.prepare(sql + ` ORDER BY m.${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...p, limit, offset);

    const data = rows.map(r => nestUser(mapMailBooleans(r)));
    res.json({ data, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit), sort: sortBy, order: sortOrder } });
});

app.put('/api/admin/mail-items/:id', auth, adminOnly, param('id').isInt(), async (req, res) => {
    const id = +req.params.id; const allowed = ['tag', 'status', 'subject', 'sender_name', 'notes', 'admin_note'];
    const updates = {}; for (const k of allowed) if (k in (req.body || {})) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

    const before = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);

    const sets = Object.keys(updates).map(k => `${k}=@${k}`).join(',');
    db.prepare(`UPDATE mail_item SET ${sets} WHERE id=@id`).run({ ...updates, id });
    logMailEvent(id, req.user.id, 'admin_updated', updates);
    logAdminAction(req.user.id, 'update_mail_item', 'mail_item', id, updates, req);
    const after = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);

    // If status transitioned to "scanned", notify owner
    if (before?.status !== 'scanned' && after?.status === 'scanned') {
        const owner = db.prepare('SELECT u.email, u.first_name FROM user u WHERE u.id=?').get(after.user_id);
        if (owner) {
            await sendTemplateEmail(
                POSTMARK_TEMPLATES.mail_scanned,
                owner.email,
                {
                    first_name: owner.first_name || '',
                    subject: after.subject || 'New mail',
                    view_url: `${APP_URL}/mail/${id}`
                }
            );
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
    db.prepare("UPDATE mail_item SET deleted=0, deleted_by_admin=0, status='received' WHERE id=?").run(id);
    logAdminAction(req.user.id, 'restore', 'mail_item', id, {}, req);
    const row = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    res.json({ data: row });
});
app.post('/api/admin/mail-items/:id/log-physical-receipt', auth, adminOnly, param('id').isInt(), (req, res) => {
    const id = +req.params.id; const item = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    const ts = Date.now();
    db.prepare('UPDATE mail_item SET physical_receipt_timestamp=? WHERE id=?').run(ts, id);
    logMailEvent(id, req.user.id, 'physical_receipt_logged', { timestamp: ts });
    // audit
    logAdminAction(req.user.id, 'log_physical_receipt', 'mail_item', id, { timestamp: ts }, req);
    res.json({ ok: true, message: 'Physical receipt logged.' });
});
app.post('/api/admin/mail-items/:id/log-physical-dispatch', auth, adminOnly, param('id').isInt(), async (req, res) => {
    const id = +req.params.id; const { tracking_number } = req.body || {};
    const item = db.prepare('SELECT * FROM mail_item WHERE id=?').get(id);
    if (!item) return res.status(404).json({ error: 'Mail item not found' });
    const ts = Date.now();
    db.prepare('UPDATE mail_item SET physical_dispatch_timestamp=?, tracking_number=? WHERE id=?').run(ts, tracking_number || null, id);
    logMailEvent(id, req.user.id, 'physical_dispatch_logged', { timestamp: ts, tracking_number });
    logAdminAction(req.user.id, 'log_physical_dispatch', 'mail_item', id, { timestamp: ts, tracking_number }, req);

    // Notify owner: mail forwarded
    const owner = db.prepare(`
    SELECT u.email, u.first_name, m.subject 
    FROM mail_item m JOIN user u ON u.id = m.user_id 
    WHERE m.id = ?
  `).get(id);
    if (owner) {
        const trackUrl = tracking_number ? `${ROYALMAIL_TRACK_URL}/${encodeURIComponent(tracking_number)}` : '';

        await sendTemplateEmail(
            POSTMARK_TEMPLATES.mail_forwarded,
            owner.email,
            {
                first_name: owner.first_name || '',
                subject: owner.subject || 'Your mail',
                tracking_number: tracking_number || '',
                track_url: trackUrl,
                help_url: APP_URL
            }
        );
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
    db.prepare('INSERT INTO payment (created_at,user_id,status,amount,description,payment_type) VALUES (?,?, "refunded", ?, ?, "refund")')
        .run(now, p.user_id, -(amount || p.amount || 0), reason || 'Admin refund');
    logAdminAction(req.user.id, 'refund', 'payment', payment_id, { amount, reason }, req);
    res.json({ ok: true, message: 'Refund initiated successfully.' });
});
app.post('/api/admin/payments/create-adhoc-link', auth, adminOnly, (req, res) => {
    const { user_id, amount, description } = req.body || {};
    if (!user_id || !amount) return res.status(400).json({ error: 'user_id and amount required' });
    const pid = `adhoc_${Date.now()}`; const url = `https://pay.gocardless.com/one-off/${pid}`;
    db.prepare('INSERT INTO payment (created_at,user_id,status,amount,description,payment_type) VALUES (?,?, "pending", ?, ?, "adhoc")')
        .run(Date.now(), user_id, amount, description || 'Admin charge');
    logAdminAction(req.user.id, 'create_payment_link', 'payment', user_id, { amount, description }, req);
    res.json({ ok: true, data: { payment_link_url: url, payment_id: pid } });
});

// ===== ADMIN — LOGS & REPORTS =====
app.get('/api/admin/logs/activity', auth, adminOnly, (req, res) => {
    const { page = 1, per_page = 50, action_type, target_type } = req.query || {};
    let sql = `SELECT al.*, u.name as admin_name FROM admin_log al LEFT JOIN user u ON u.id=al.admin_user_id WHERE 1=1`;
    const p = [];
    if (action_type) { sql += ' AND al.action_type=?'; p.push(action_type); }
    if (target_type) { sql += ' AND al.target_type=?'; p.push(target_type); }
    const total = db.prepare(sql.replace('SELECT al.*, u.name as admin_name', 'SELECT COUNT(*) c')).get(...p).c;
    const limit = parseInt(per_page), offset = (parseInt(page) - 1) * limit;
    const rows = db.prepare(sql + ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?').all(...p, limit, offset);
    res.json({ data: rows, meta: { current_page: parseInt(page), per_page: limit, total, total_pages: Math.ceil(total / limit) } });
});
app.get('/api/admin/logs/email-delivery', auth, adminOnly, (req, res) => {
    res.json({ data: [{ id: 'msg_123', to: 'user@example.com', subject: 'Welcome to VirtualAddressHub', status: 'delivered', sent_at: Date.now() - 86400000, delivered_at: Date.now() - 86300000 }] });
});
app.get('/api/admin/reports/users/csv', auth, adminOnly, (req, res) => {
    const users = db.prepare('SELECT * FROM user ORDER BY created_at DESC').all();
    const headers = ['ID', 'Created At', 'Name', 'Email', 'First Name', 'Last Name', 'Company', 'KYC Status', 'Plan Status', 'Is Admin'];
    const rows = users.map(u => [
        u.id,
        new Date(u.created_at).toISOString(),
        u.name || '',
        u.email,
        u.first_name || '',
        u.last_name || '',
        u.company_name || '',
        u.kyc_status,
        u.plan_status,
        u.is_admin ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows]
        .map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
});

app.get('/api/admin/reports/mail-items/csv', auth, adminOnly, (req, res) => {
    const items = db.prepare(`
        SELECT m.*, u.name as user_name, u.email as user_email
        FROM mail_item m
        LEFT JOIN user u ON u.id = m.user_id
        ORDER BY m.created_at DESC
    `).all();

    const headers = [
        'ID',
        'User',
        'User Email',
        'Subject',
        'Sender',
        'Received Date',
        'Status',
        'Tag',
        'Created At'
    ];

    const rows = items.map(i => [
        i.id,
        i.user_name || '',
        i.user_email || '',
        i.subject || '',
        i.sender_name || '',
        i.received_date || '',
        i.status || '',
        i.tag || '',
        new Date(i.created_at).toISOString()
    ]);

    const csv = [headers, ...rows]
        .map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mail-items.csv"');
    res.send(csv);
});

app.get('/api/admin/reports/forwarding-log/csv', auth, adminOnly, (req, res) => {
    const rows = db.prepare(`
        SELECT fr.*, u.name AS user_name, u.email AS user_email, m.subject AS mail_subject
        FROM forwarding_request fr
        LEFT JOIN user u ON u.id = fr."user"
        LEFT JOIN mail_item m ON m.id = fr.mail_item
        ORDER BY fr.created_at DESC
    `).all();

    const headers = [
        'ID',
        'User',
        'User Email',
        'Mail Subject',
        'Status',
        'Is Billable',
        'Destination Name',
        'Destination Address',
        'Created At'
    ];

    const data = rows.map(r => [
        r.id,
        r.user_name || '',
        r.user_email || '',
        r.mail_subject || '',
        r.status || '',
        r.is_billable ? 'Yes' : 'No',
        r.destination_name || '',
        r.destination_address || '',
        new Date(r.created_at).toISOString()
    ]);

    const csv = [headers, ...data]
        .map(row => row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="forwarding-log.csv"');
    res.send(csv);
});

// ===== ADMIN — HARD DELETE =====
app.delete('/api/admin/users/:user_id', auth, adminOnly, param('user_id').isInt(), async (req, res) => {
    const id = +req.params.user_id; const { confirm } = req.body || {};
    if (confirm !== 'DELETE') return res.status(400).json({ error: 'Must confirm with "DELETE" in request body' });
    const user = db.prepare('SELECT * FROM user WHERE id=?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Send account closed email BEFORE deleting
    await sendTemplateEmail(
        POSTMARK_TEMPLATES.account_closed,
        user.email,
        {
            first_name: user.first_name || user.name || '',
            contact_url: `${APP_URL}/support`
        }
    );

    try {
        db.prepare('DELETE FROM mail_event WHERE actor_user=?').run(id);
        db.prepare('DELETE FROM forwarding_request WHERE "user"=?').run(id);
        db.prepare('DELETE FROM mail_item WHERE user_id=?').run(id);
        db.prepare('DELETE FROM payment WHERE user_id=?').run(id);
        db.prepare('DELETE FROM activity_log WHERE user_id=?').run(id);
        db.prepare('DELETE FROM password_reset WHERE user_id=?').run(id);
        db.prepare('DELETE FROM impersonation_token WHERE target_user_id=? OR admin_user_id=?').run(id, id);
        db.prepare('DELETE FROM support_ticket WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM user WHERE id=?').run(id);
        logAdminAction(req.user.id, 'hard_delete', 'user', id, { email: user.email, name: user.name }, req);
        res.json({ ok: true, message: 'User and all associated data permanently deleted.' });
    } catch (e) { logger.error('hard delete failed', e); res.status(500).json({ error: 'Failed to delete user' }); }
});

// ===== WEBHOOKS (mock-safe) =====
app.post('/api/webhooks/gocardless', async (req, res) => {
    const body = req.body || {};
    db.prepare('INSERT INTO webhook_log (created_at,type,source,raw_payload,received_at) VALUES (?,?,?,?,?)')
        .run(Date.now(), 'gocardless', 'webhook', JSON.stringify(body), Date.now());
    if (body.payment) {
        const p = body.payment;
        if (p.user_id && p.status) {
            db.prepare('INSERT INTO payment (created_at,user_id,gocardless_customer_id,subscription_id,status,invoice_url,mandate_id,amount,currency) VALUES (?,?,?,?,?,?,?,?,?)')
                .run(Date.now(), p.user_id, p.gocardless_customer_id || null, p.subscription_id || null, p.status, p.invoice_url || null, p.mandate_id || null, p.amount || null, p.currency || 'GBP');

            const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(p.user_id);

            if (p.status === 'confirmed' || p.status === 'paid') {
                db.prepare(`UPDATE user SET plan_status='active' WHERE id=?`).run(p.user_id);

                if (u) {
                    await sendTemplateEmail(
                        POSTMARK_TEMPLATES.invoice_sent,
                        u.email,
                        {
                            first_name: u.first_name || '',
                            invoice_url: p.invoice_url || `${APP_URL}/billing`,
                            amount: p.amount ? (p.amount / 100).toFixed(2) : undefined,
                            currency: p.currency || 'GBP'
                        }
                    );
                }
            }
            if (p.status === 'failed') {
                db.prepare(`UPDATE user SET plan_status='past_due' WHERE id=?`).run(p.user_id);

                if (u) {
                    await sendTemplateEmail(
                        POSTMARK_TEMPLATES.payment_failed,
                        u.email,
                        {
                            first_name: u.first_name || '',
                            fix_url: `${APP_URL}/billing`
                        }
                    );
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
    db.prepare('INSERT INTO webhook_log (created_at,type,source,raw_payload,received_at) VALUES (?,?,?,?,?)')
        .run(Date.now(), 'sumsub', 'webhook', JSON.stringify(body), Date.now());
    const applicantId = body.applicant_id; const status = body.review_status; const userId = body.user_id;
    if (userId && status) {
        const kyc = (status === 'completed' || status === 'approved') ? 'verified' : (status === 'rejected' ? 'rejected' : 'pending');
        db.prepare('UPDATE user SET sumsub_applicant_id=?, sumsub_review_status=?, kyc_status=?, kyc_updated_at=?, sumsub_rejection_reason=? WHERE id=?')
            .run(applicantId || null, status, kyc, Date.now(), body.rejection_reason || null, userId);
        if (kyc === 'verified') {
            const folderUrl = `https://onedrive.example.com/Clients/${userId}`;
            db.prepare('UPDATE user SET one_drive_folder_url=? WHERE id=?').run(folderUrl, userId);
        }

        const u = db.prepare('SELECT email, first_name FROM user WHERE id=?').get(userId);
        if (u) {
            if (kyc === 'verified') {
                await sendTemplateEmail(
                    POSTMARK_TEMPLATES.kyc_approved,
                    u.email,
                    {
                        first_name: u.first_name || '',
                        dashboard_url: APP_URL,
                        certificate_url: `${CERTIFICATE_BASE_URL}/${userId}/proof-of-address.pdf`
                    }
                );
            } else if (kyc === 'rejected') {
                await sendTemplateEmail(
                    POSTMARK_TEMPLATES.kyc_rejected,
                    u.email,
                    {
                        first_name: u.first_name || '',
                        reason: body.rejection_reason || 'Verification was not approved',
                        retry_url: `${APP_URL}/kyc`
                    }
                );
            }
        }
    }
    res.json({ ok: true });
});

// ===== HEALTH =====
app.get('/api/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

// ===== 404 for unknown /api/* =====
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    next();
});

// ===== ERROR HANDLER (last) =====
app.use((err, req, res, next) => {
    logger.error('Unhandled', { message: err.message, stack: err.stack, path: req.path });
    if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'CORS policy violation' });
    res.status(500).json({ error: NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// ===== START + GRACEFUL SHUTDOWN =====
let server = null;

if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log(`VAH backend listening on http://localhost:${PORT}`);
        console.log(`CORS origins: ${ORIGIN.join(', ')}`);
    });

    function shutdown(sig) {
        console.log(`\n${sig} received. Shutting down...`);
        server.close(() => process.exit(0));
    }
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Export for tests (Supertest will use `app` directly; no need to listen)
module.exports = { app, db, server };
