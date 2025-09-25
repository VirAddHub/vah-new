// VirtualAddressHub Backend — PostgreSQL-only Express API for Render
// Updated: Express 5 compatibility and CORS fixes deployed

require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
});

// Hard fail if SQLite is detected
if (process.env.DISABLE_SQLITE !== "true") {
    console.warn("Set DISABLE_SQLITE=true to guarantee Postgres-only mode.");
}

// Import and use strict environment validation
const { validateEnvironment, env } = require('./bootstrap/requireEnv');
validateEnvironment();

// --- core & middleware
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const createMemoryStore = require("memorystore");
const MemoryStore = createMemoryStore(expressSession);
const rateLimit = require("express-rate-limit");
const winston = require('winston');
const compression = require('compression');
const morgan = require('morgan');
const { db } = require('./db.js');

// --- safe table helpers ---
async function tableExists(name) {
    try {
        // PostgreSQL: check if table exists
        await db.get(`SELECT 1 FROM ${name} LIMIT 1`);
        return true;
    } catch (e) {
        const msg = String(e && e.message).toLowerCase();
        if (
            msg.includes('does not exist') ||        // Postgres
            msg.includes('undefined table')          // Postgres variant
        ) return false;
        throw e;
    }
}

function logSkip(what, table) {
    console.log(`[boot] ${what} skipped: table "${table}" missing`);
}

// --- init
const app = express();
app.set('trust proxy', 1); // needed for Secure cookies behind CF/Render

// CORS configuration - MUST be at the very top before any other middleware
const allowlist = new Set([
    'https://vah-frontend-final.vercel.app',
    'http://localhost:3000',
]);

// Allow Vercel preview: https://vah-frontend-final-*.vercel.app
function isAllowed(origin) {
    if (!origin) return true; // allow same-origin / server-to-server
    if (allowlist.has(origin)) return true;
    if (/^https:\/\/vah-frontend-final-[\w-]+\.vercel\.app$/.test(origin)) return true;
    return false;
}

if (process.env.ALLOWED_ORIGINS) {
    for (const o of process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)) {
        allowlist.add(o);
    }
}

const corsOptions = {
    origin(origin, cb) {
        if (isAllowed(origin)) return cb(null, origin || true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Disposition'],
};

app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });
app.use(require('cors')(corsOptions));

// ✅ Use v6-compatible wildcard:
app.options('/(.*)', require('cors')(corsOptions));

// CORS Debug middleware (behind env flag)
if (process.env.CORS_DEBUG === '1') {
    app.use((req, res, next) => {
        const originalSend = res.send;
        const originalJson = res.json;

        // Log request details
        console.log('[CORS_DEBUG] Request:', {
            method: req.method,
            url: req.originalUrl,
            origin: req.headers.origin
        });

        // Override response methods to log headers after response
        res.send = function (data) {
            console.log('[CORS_DEBUG] Response headers:', {
                'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
                'Set-Cookie': res.get('Set-Cookie') ? 'Present' : 'Not set'
            });
            return originalSend.call(this, data);
        };

        res.json = function (data) {
            console.log('[CORS_DEBUG] Response headers:', {
                'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials'),
                'Set-Cookie': res.get('Set-Cookie') ? 'Present' : 'Not set'
            });
            return originalJson.call(this, data);
        };

        next();
    });
}

// Health / readiness probe for CI and Render
app.get(['/api/ready', '/api/healthz', '/healthz'], (req, res) => {
    res.json({ ok: true, service: 'vah-backend' });
});

// Simple health endpoint for Render
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// Security first (after CORS) - configure helmet to not block cross-origin requests
app.use(helmet({
    // API returns JSON; avoid strict CORP that can interfere with credentialed CORS
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Leave CSP off for API JSON endpoints to avoid noise (optional, but safer):
    contentSecurityPolicy: false,
}));

// Cookies after CORS
app.use(cookieParser());

// important: express must parse JSON before routes
app.use(express.json());

// secure session cookie for cross-site usage
app.use(expressSession({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
        httpOnly: true,
        secure: true,          // required with SameSite=None
        sameSite: 'none',      // cross-site
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: '/',
    },
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Public debug routes (before any auth middleware)
app.get('/api/auth/ping', (req, res) => res.json({ ok: true }));

// Temporary endpoint to create test users (remove in production)
app.post('/api/create-test-users', async (req, res) => {
    try {
        const bcrypt = require('bcrypt');
        const now = Date.now();

        // Hash passwords
        const adminPassword = await bcrypt.hash('AdminPass123!', 12);
        const userPassword = await bcrypt.hash('UserPass123!', 12);

        // Create admin user using direct PostgreSQL pool
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        const adminResult = await pool.query(`
      INSERT INTO "user" (
        email, password, first_name, last_name, name,
        is_admin, role, status, kyc_status, plan_status,
        plan_start_date, onboarding_step, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) ON CONFLICT (email) DO UPDATE SET
        is_admin = EXCLUDED.is_admin,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        password = EXCLUDED.password,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email, first_name, last_name, is_admin, role
    `, [
            'admin@virtualaddresshub.co.uk',
            adminPassword,
            'Admin',
            'User',
            'Admin User',
            true,
            'admin',
            'active',
            'verified',
            'active',
            now,
            'completed',
            now,
            now
        ]);

        // Create regular user
        const userResult = await pool.query(`
      INSERT INTO "user" (
        email, password, first_name, last_name, name,
        is_admin, role, status, kyc_status, plan_status,
        plan_start_date, onboarding_step, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) ON CONFLICT (email) DO UPDATE SET
        is_admin = EXCLUDED.is_admin,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        password = EXCLUDED.password,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email, first_name, last_name, is_admin, role
    `, [
            'user@virtualaddresshub.co.uk',
            userPassword,
            'Regular',
            'User',
            'Regular User',
            false,
            'user',
            'active',
            'verified',
            'active',
            now,
            'completed',
            now,
            now
        ]);

        await pool.end();

        res.json({
            success: true,
            message: 'Test users created successfully',
            admin: adminResult.rows[0],
            user: userResult.rows[0],
            credentials: {
                admin: { email: 'admin@virtualaddresshub.co.uk', password: 'AdminPass123!' },
                user: { email: 'user@virtualaddresshub.co.uk', password: 'UserPass123!' }
            }
        });
    } catch (error) {
        console.error('Error creating test users:', error);
        res.status(500).json({ error: 'Failed to create test users', details: error.message });
    }
});

// Auth routes (import existing handlers)
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// User-specific routes
app.use(require('./routes/user/tickets').default);
app.use(require('./routes/user/forwarding').default);
app.use(require('./routes/user/billing').default);
app.use(require('./routes/user/invoices').default);
app.use(require('./routes/user/email-prefs').default);

// Core user routes
const profileModule = require('./routes/profile');
const profileRouter = profileModule.default || profileModule;
app.use(profileRouter);

const mailItemsModule = require('./routes/mail-items');
const mailItemsRouter = mailItemsModule.default || mailItemsModule;
app.use(mailItemsRouter);

const forwardingModule = require('./routes/forwarding-requests');
const forwardingRouter = forwardingModule.default || forwardingModule;
app.use(forwardingRouter);

const billingModule = require('./routes/billing');
const billingRouter = billingModule.default || billingModule;
app.use(billingRouter);

const emailPrefsModule = require('./routes/email-prefs');
const emailPrefsRouter = emailPrefsModule.default || emailPrefsModule;
app.use(emailPrefsRouter);

// Admin routes
const adminMetricsModule = require('./routes/admin.metrics');
const adminMetricsRouter = adminMetricsModule.default || adminMetricsModule;
app.use('/api/admin/metrics', adminMetricsRouter);

// Admin mail management
const adminMailModule = require('./routes/admin/mail-items');
const adminMailRouter = adminMailModule.default || adminMailModule;
app.use(adminMailRouter);

// Admin billing management
const adminBillingModule = require('./routes/admin/billing');
const adminBillingRouter = adminBillingModule.default || adminBillingModule;
app.use(adminBillingRouter);

// Admin user management
const adminUsersModule = require('./routes/admin/users');
const adminUsersRouter = adminUsersModule.default || adminUsersModule;
app.use(adminUsersRouter);

// Admin forwarding management
const adminForwardingModule = require('./routes/admin/forwarding');
const adminForwardingRouter = adminForwardingModule.default || adminForwardingModule;
app.use(adminForwardingRouter);

// Admin analytics
const adminAnalyticsModule = require('./routes/admin/analytics');
const adminAnalyticsRouter = adminAnalyticsModule.default || adminAnalyticsModule;
app.use(adminAnalyticsRouter);

// Public routes
app.use(require('./routes/public/plans').default);

// Dashboard routes
app.use('/api', require('./routes/dashboard'));

// OPTIONS fallback (preflight safety net):
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler - must be after all routes
app.use((err, _req, res, _next) => {
    console.error("[UNCAUGHT]", err);
    // Only treat truly unexpected conditions as 5xx
    res.status(500).json({ error: "server_error" });
});

// Process guards for better error handling
process.on('uncaughtException', (err) => {
    console.error('[fatal] uncaughtException', err);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.error('[fatal] unhandledRejection', err);
    process.exit(1);
});

// Start server
const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, HOST, () => {
    console.log(`[boot] listening on http://${HOST}:${PORT}`);
    console.log(`[boot] CORS origins: ${Array.from(allowlist).join(', ')}`);
    console.log(`[boot] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
});

module.exports = app;
