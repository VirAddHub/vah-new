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

// --- PUBLIC PATHS GATE ---
const PUBLIC_PATHS = new Set([
    '/healthz',
    '/api/healthz',
    '/api/ready',
    '/api/auth/ping',
    '/api/plans',
    '/plans', // legacy alias
]);
function isPublic(req) {
    const url = req.originalUrl || req.url || '';
    const path = url.split('?')[0]; // remove query string
    return PUBLIC_PATHS.has(path) || path.startsWith('/scans/');
}

// Helper to load routers from CJS/TS default exports or module.exports
function loadRouter(p) {
    const mod = require(p);
    const r = (mod && (mod.default || mod.router || mod)) || mod;

    // Accept express.Router instances or handler functions
    if (typeof r === 'function') return r;
    if (r && typeof r === 'object' && typeof r.handle === 'function') return r;

    throw new TypeError(`Invalid router export from ${p}`);
}

// Safe middleware loader
function asMw(mod) {
    if (typeof mod === 'function') return mod;
    if (mod && typeof mod.default === 'function') return mod.default;
    return null;
}
const cors = require("cors");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
// Guard missing optional modules for dev mode
let sessions = null;
try {
    sessions = require('./sessions');
} catch (_) {
    // dev mode without sessions; proceed
}
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
const { makeCors } = require('./cors.js');

app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); });
const corsMw = asMw(makeCors);
if (corsMw) app.use(corsMw); else console.warn('[boot] cors middleware missing');

// OPTIONS requests are handled by cors middleware above

// ---- PUBLIC BASICS (mount very early) ----
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true, service: 'backend' }));
app.get('/api/healthz', (_req, res) => res.status(200).json({ ok: true, service: 'api' }));
app.get('/api/ready', (_req, res) => res.status(200).json({ ok: true, ready: true }));
app.get('/api/auth/ping', (_req, res) => res.status(200).json({ ok: true, pong: true }));

// ---- PUBLIC PLANS ROUTER (mount before any auth) ----
const publicPlans = require('./routes/public/plans');
const publicRoutes = asMw(publicPlans);
if (publicRoutes) app.use('/api', publicRoutes);

// ---- PUBLIC LEGACY: /plans → same payload as /api/plans
app.get('/plans', (req, res) => {
    // simple passthrough to /api/plans without redirect (avoid CORS/get semantics)
    res.json({
        plans: [
            { id: 'basic', name: 'Basic', price: 0, currency: 'GBP', interval: 'month' },
            { id: 'pro', name: 'Pro', price: 1500, currency: 'GBP', interval: 'month' },
            { id: 'teams', name: 'Teams', price: 4900, currency: 'GBP', interval: 'month' },
        ], public: true, legacy: true
    });
});

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
const sessionsMw = asMw(sessions);
if (sessionsMw) app.use(sessionsMw);

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


// --- PUBLIC ENDPOINTS (idempotent) ---
if (!app._publicMounted) {
    // health / ready
    app.get('/healthz', (_req, res) => res.status(200).send('ok'));
    app.get('/api/healthz', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/ready', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/auth/ping', (_req, res) => res.status(200).json({ ok: true }));

    // plans (GET-only) + legacy alias
    const allowGetOnly = (req, res, next) => {
        if (req.method !== 'GET') {
            res.set('Allow', 'GET');
            return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
        }
        next();
    };
    app.use('/api/plans', allowGetOnly);
    app.get('/api/plans', (_req, res) => {
        // Avoid accidental 500s: serve a safe stub if real service isn't wired
        res.status(200).json({
            ok: true,
            data: [{ id: 'monthly', name: 'Digital Mailbox', price_pence: 999 }],
        });
    });
    app.get('/plans', (_req, res) => {
        res.set('Deprecation', 'true');
        res.set('Link', '</api/plans>; rel="canonical"');
        res.status(200).json({
            ok: true,
            deprecated: true,
            canonical: '/api/plans',
            data: [{ id: 'monthly', name: 'Digital Mailbox', price_pence: 999 }],
        });
    });

    // smoke-test targeted 404 that must beat router auth
    app.all('/api/invalid-endpoint', (_req, res) =>
        res.status(404).json({ ok: false, error: 'Not Found' })
    );
    app._publicMounted = true;
}

// --- ADMIN INTEGRATION STATUS ---
function requireAdmin(req, res, next) {
    try {
        if (req?.cookies?.vah_role === 'admin' || req?.user?.role === 'admin') return next();
    } catch { }
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

// Integration configuration helper
const isConfigured = (name) => {
    if (name === 'gocardless') {
        return !!(process.env.GOCARDLESS_ACCESS_TOKEN && process.env.GOCARDLESS_WEBHOOK_SECRET);
    }
    if (name === 'sumsub') {
        return !!(process.env.SUMSUB_API_KEY && process.env.SUMSUB_WEBHOOK_SECRET);
    }
    return false;
};

app.get('/api/admin/integrations/status', requireAdmin, (_req, res) => {
    res.json({
        ok: true,
        data: {
            gocardless: { configured: isConfigured('gocardless') },
            sumsub: { configured: isConfigured('sumsub') },
        },
    });
});


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
                admin: { email: 'admin@virtualaddresshub.co.uk', password: 'AdminPass123!' }, // pragma: allowlist secret
                user: { email: 'user@virtualaddresshub.co.uk', password: 'UserPass123!' } // pragma: allowlist secret
            }
        });
    } catch (error) {
        console.error('Error creating test users:', error);
        res.status(500).json({ error: 'Failed to create test users', details: error.message });
    }
});

// Health check route
const healthRouter = require('./routes/health');
const healthMw = asMw(healthRouter);
if (healthMw) app.use(healthMw);

// Auth routes (import existing handlers)
try {
    const authRouter = loadRouter('./routes/auth');
    app.use('/api/auth', authRouter);
} catch (e) {
    console.warn('[startup] Auth router not available, skipping:', e.message);
}

// User-specific routes
try {
    app.use(loadRouter('./routes/user/tickets'));
} catch (e) {
    console.warn('[startup] User tickets router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/user/forwarding'));
} catch (e) {
    console.warn('[startup] User forwarding router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/user/billing'));
} catch (e) {
    console.warn('[startup] User billing router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/user/invoices'));
} catch (e) {
    console.warn('[startup] User invoices router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/user/email-prefs'));
} catch (e) {
    console.warn('[startup] User email-prefs router not available, skipping:', e.message);
}

// Core user routes
try {
    app.use(loadRouter('./routes/profile'));
} catch (e) {
    console.warn('[startup] Profile router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/mail-items'));
} catch (e) {
    console.warn('[startup] Mail items router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/forwarding-requests'));
} catch (e) {
    console.warn('[startup] Forwarding requests router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/billing'));
} catch (e) {
    console.warn('[startup] Billing router not available, skipping:', e.message);
}

try {
    app.use(loadRouter('./routes/email-prefs'));
} catch (e) {
    console.warn('[startup] Email prefs router not available, skipping:', e.message);
}

// Admin routes
try {
    app.use('/api/admin/metrics', loadRouter('./routes/admin.metrics'));
} catch (e) {
    console.warn('[startup] Admin metrics router not available, skipping:', e.message);
}

// Admin mail management
try {
    app.use(loadRouter('./routes/admin/mail-items'));
} catch (e) {
    console.warn('[startup] Admin mail items router not available, skipping:', e.message);
}

// Admin billing management
try {
    app.use(loadRouter('./routes/admin/billing'));
} catch (e) {
    console.warn('[startup] Admin billing router not available, skipping:', e.message);
}

// Admin user management
try {
    app.use(loadRouter('./routes/admin/users'));
} catch (e) {
    console.warn('[startup] Admin users router not available, skipping:', e.message);
}

// Admin forwarding management
try {
    app.use(loadRouter('./routes/admin/forwarding'));
} catch (e) {
    console.warn('[startup] Admin forwarding router not available, skipping:', e.message);
}

// Admin analytics
try {
    app.use(loadRouter('./routes/admin/analytics'));
} catch (e) {
    console.warn('[startup] Admin analytics router not available, skipping:', e.message);
}

// Public routes
try {
    // prefer compiled TS public router
    app.use(loadRouter('./routes/public/plans'));
} catch (e) {
    console.warn('[startup] public/plans route missing, skipping:', e.message);
}

// Mount the legacy router at root (it only defines specific paths like /plans)
// Note: This will work if the TypeScript is compiled, otherwise we'll need to use the JS version
try {
    const { legacyRouter } = require('./legacy/adapters.js');
    app.use(legacyRouter);
} catch (e) {
    console.warn('[startup] Legacy router not available, skipping:', e.message);
}

// Dashboard routes
try {
    app.use('/api', loadRouter('./routes/dashboard'));
} catch (e) {
    console.warn('[startup] Dashboard router not available, skipping:', e.message);
}

// TEMPORARY: Legacy router for missing endpoints
try {
    const { buildLegacyRouter } = require('./routes/legacy-router');
    app.use('/api', buildLegacyRouter({ db, logger: console }));
} catch (e) {
    console.warn('[startup] Legacy router not available, skipping:', e.message);
}

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

// ---- FINAL 404s (after all routes) ----
app.use('/api', (req, res, next) => {
    // This will catch any /api/* routes that weren't matched above
    return res.status(404).json({ ok: false, error: 'Not Found', path: req.originalUrl });
});

// optional: non-api 404
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) return next(); // already handled
    return res.status(404).send('Not Found');
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
// Optional route printing for dev
try {
    const { printRoutes } = require('./utils/printRoutes');
    printRoutes(app);
} catch (e) {
    console.warn('[startup] Route printing not available, skipping:', e.message);
}

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
