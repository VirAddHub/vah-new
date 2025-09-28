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

// Helper to load routers from CJS/TS default exports or module.exports
function loadRouter(p) {
    const mod = require(p);
    const r = (mod && (mod.default || mod.router || mod)) || mod;

    // Accept express.Router instances or handler functions
    if (typeof r === 'function') return r;
    if (r && typeof r === 'object' && typeof r.handle === 'function') return r;

    throw new TypeError(`Invalid router export from ${p}`);
}
const cors = require("cors");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const { sessions } = require('./sessions');
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
const { makeCors } = require('./cors');

app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });
app.use(makeCors());

// OPTIONS requests are handled by cors middleware above

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

// PostgreSQL session store for production
app.use(sessions);

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

// Health check route
const healthRouter = require('./routes/health');
app.use(healthRouter);

// Auth routes (import existing handlers)
const authRouter = loadRouter('./routes/auth');
app.use('/api/auth', authRouter);

// User-specific routes
app.use(loadRouter('./routes/user/tickets'));
app.use(loadRouter('./routes/user/forwarding'));
app.use(loadRouter('./routes/user/billing'));
app.use(loadRouter('./routes/user/invoices'));
app.use(loadRouter('./routes/user/email-prefs'));

// Core user routes
app.use(loadRouter('./routes/profile'));

app.use(loadRouter('./routes/mail-items'));

app.use(loadRouter('./routes/forwarding-requests'));

app.use(loadRouter('./routes/billing'));

app.use(loadRouter('./routes/email-prefs'));

// Admin routes
app.use('/api/admin/metrics', loadRouter('./routes/admin.metrics'));

// Admin mail management
app.use(loadRouter('./routes/admin/mail-items'));

// Admin billing management
app.use(loadRouter('./routes/admin/billing'));

// Admin user management
app.use(loadRouter('./routes/admin/users'));

// Admin forwarding management
app.use(loadRouter('./routes/admin/forwarding'));

// Admin analytics
app.use(loadRouter('./routes/admin/analytics'));

// Public routes
try {
    // prefer compiled TS public router
    app.use(loadRouter('./routes/public/plans'));
} catch (e) {
    console.warn('[startup] public/plans route missing, skipping:', e.message);
}

// Dashboard routes
app.use('/api', loadRouter('./routes/dashboard'));

// TEMPORARY: Legacy router for missing endpoints
const { buildLegacyRouter } = require('./routes/legacy-router');
app.use('/api', buildLegacyRouter({ db, logger: console }));

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

// API 404 (runs only if no API route matched)
app.use('/api', (req, res) => {
    console.warn('[404]', req.method, req.originalUrl);
    res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// generic 404 for anything else (non-API) — since this is an API service, just 404
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// Import error handler
const { errorMiddleware } = require('./errors');

// 404 telemetry
app.use((req, res, next) => {
    if (!res.headersSent) console.warn('[404]', req.method, req.originalUrl);
    next();
});

// Global error handler - must be after all routes
app.use(errorMiddleware);

// Print all mounted routes for debugging
const { printRoutes } = require('./utils/printRoutes');
printRoutes(app);

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
    console.log(`[boot] CORS origins: ${process.env.CORS_ORIGINS || 'default'}`);
    console.log(`[boot] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
    console.log(`[boot] Render deployment: https://vah-api-staging.onrender.com`);
});

module.exports = app;
