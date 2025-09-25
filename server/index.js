// VirtualAddressHub Backend — PostgreSQL-only Express API for Render

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
const session = require("express-session");
const createMemoryStore = require("memorystore");
const MemoryStore = createMemoryStore(session);
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
app.set('trust proxy', 1); // required for secure cookies behind Render

// CORS configuration - MUST be at the very top before any other middleware
const ALLOWED_ORIGINS = new Set([
    'https://vah-frontend-final.vercel.app',
    'http://localhost:3000',
]);

function resolveOrigin(origin) {
    if (!origin) return false;
    return ALLOWED_ORIGINS.has(origin) ? origin : false;
}

const corsOptions = {
    origin: (origin, cb) => {
        console.log('[CORS] Checking origin:', origin);
        const allowed = resolveOrigin(origin);
        console.log('[CORS] Resolved to:', allowed);
        if (!origin || allowed) {
            cb(null, true);
        } else {
            console.log('[CORS] Rejecting origin:', origin);
            cb(null, false);
        }
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','X-CSRF-Token','X-Requested-With','Accept'],
    exposedHeaders: ['Content-Disposition'],
};

// Add a tiny logger so you can see preflights clearly
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log('[OPTIONS]', req.headers.origin, req.path);
    }
    next();
});

// CORS must be before anything else:
app.use(cors(corsOptions));

// IMPORTANT: handle *all* OPTIONS with CORS and end with 204
app.options(/^\/.*/, cors(corsOptions), (req, res) => {
    res.sendStatus(204);
});

// Health / readiness probe for CI and Render
app.get(['/api/ready', '/api/healthz', '/healthz'], (req, res) => {
    res.json({ ok: true, service: 'vah-backend' });
});

// Security first (after CORS)
app.use(helmet());

// Cookies after CORS
app.use(cookieParser());

// important: express must parse JSON before routes
app.use(express.json());

// secure session cookie for cross-site usage
app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
        httpOnly: true,
        secure: true,         // Render uses HTTPS → required for cross-site cookies
        sameSite: 'none',     // cross-site
        maxAge: 1000 * 60 * 60 * 24 * 7,
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
app.use(require('./routes/user/email-prefs').default);

// Public routes
app.use(require('./routes/public/plans').default);

// Dashboard routes
app.use('/api', require('./routes/dashboard'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`VAH backend listening on http://0.0.0.0:${PORT}`);
    console.log(`CORS origins: ${Array.from(ALLOWED_ORIGINS).join(', ')}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
});

module.exports = app;
