// VirtualAddressHub Backend — Next.js-ready Express API

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import winston from 'winston';
import compression from 'compression';
import morgan from 'morgan';
import crypto from 'crypto';
import joi from 'joi';
import { body, query, param, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import http from 'http';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Centralized environment config
import { HOST, PORT } from './config/env';
import { logGraphConfigAtStartup } from './config/azure';

// CORS middleware
import { corsMiddleware } from './cors';

// Health routes (no DB dependencies)
import { health } from './server/routes/health';

// Database adapters
import { ensureSchema, getPool } from "./server/db";
import { selectOne, selectMany, execute, insertReturningId } from "./server/db-helpers";

// --- routes that need raw body (webhooks)
import sumsubWebhook from "./server/routes/webhooks-sumsub";
import { postmarkWebhook } from "./server/routes/webhooks-postmark";
import onedriveWebhook from "./server/routes/webhooks-onedrive";
import gocardlessWebhook from "./server/routes/webhooks-gocardless";
import profileRouter from "./server/routes/profile";
import profileEmailChangeRouter from "./server/routes/profileEmailChange";
import businessOwnersRouter from "./server/routes/businessOwners";
import publicPlansRouter from "./server/routes/public/plans";
import debugEmailRouter from "./server/routes/debug-email";
import devRouter from "./server/routes/dev";
import robustPasswordResetRouter from "./server/routes/profile/reset-password-request";
import { passwordResetRouter } from "./server/routes/profile.password-reset";
import authRouter from "./server/routes/auth";
// import { internalRouter } from "./routes/internal"; // No longer needed - admin-driven system
import migrateRouter from "./routes/migrate";
import triggerMigrateRouter from "./routes/trigger-migrate";
import webhookMigrateRouter from "./routes/webhook-migrate";
import directMigrateRouter from "./routes/direct-migrate";
import webhookRouter from "./server/routes/webhooks";
import { stopForwardingLocksCleanup } from "./server/routes/admin-forwarding-locks";
import { stopSelfTestScheduler } from "./server/routes/ops-selftest";

// NEW: Import missing endpoints
import mailRouter from "./server/routes/mail";
import billingRouter from "./server/routes/billing";
import paymentsRouter from "./server/routes/payments";
import adminUsersRouter from "./server/routes/admin-users";
import adminForwardingRouter from "./server/routes/admin-forwarding";
import adminForwardingDebugRouter from "./server/routes/admin-forwarding-debug";
import adminForwardingLocksRouter from "./server/routes/admin-forwarding-locks";
import adminStatsRouter from "./server/routes/admin-stats";
import adminBillingRouter from "./server/routes/admin-billing";
import adminPlansRouter from "./server/routes/admin-plans";
import adminMailItemsRouter from "./server/routes/admin-mail-items";
import adminActivityRouter from "./server/routes/admin-activity";
import adminServiceStatusRouter from "./server/routes/admin-service-status";
import adminMetricsGrowthRouter from "./server/routes/admin-metrics-growth";
import adminHealthRouter from "./server/routes/admin-health";
import adminOverviewRouter from "./server/routes/admin-overview";
import adminInvoicesRouter from "./server/routes/admin-invoices";
import adminExportsRouter from "./server/routes/admin-exports";
import companiesHouseRouter from "./server/routes/companies-house";
import opsSelfTestRouter from "./server/routes/ops-selftest";
import idealPostcodesRouter from "./server/routes/ideal-postcodes";
import internalBillingRouter from "./server/routes/internal-billing";
import { errorHandler } from "./server/middleware/errorHandler";

// Import maintenance service
import { systemMaintenance } from "./server/services/maintenance";

// Safe stubs for integrations until providers are wired
import paymentsStubRouter from "./server/routes/payments-stub";
import kycStubRouter from "./server/routes/kyc-stub";
import kycRouter from "./server/routes/kyc";
import forwardingRouter from "./server/routes/forwarding";
import emailPrefsRouterNew from "./server/routes/email-prefs";
import supportRouter from "./server/routes/support";
import contactRouter from "./server/routes/contact";
import addressRouterImport from "./server/routes/address";
import bffMailScanRouter from "./routes/bff-mail-scan";
import { quizRouter } from "./server/routes/quiz";
import internalMailImportRouter from "./server/routes/internalMailImport";


type MaybeDefault<T> = { default?: T } | T;
// handle CJS/ESM default interop safely
function unwrapDefault<T>(m: MaybeDefault<T>): T {
    if (m && typeof m === "object" && "default" in m) {
        return (m as { default?: T }).default ?? (m as unknown as T);
    }
    return m as T;
}
const addressRouter = unwrapDefault(addressRouterImport as unknown as MaybeDefault<typeof addressRouterImport>);

// Legacy routes (CommonJS requires - will be converted to ES modules eventually)
// Use path.join to resolve paths correctly - need to go back to project root
import * as path from 'path';
// When running from dist/src/server.js, go back to project root then into routes
const projectRoot = path.join(__dirname, '../..');
const routesDir = path.join(projectRoot, 'routes');
// const addressRouter = require(path.join(routesDir, 'address')); // File doesn't exist
const adminAuditRouter = require(path.join(routesDir, 'admin-audit'));
const adminForwardAuditRouter = require(path.join(routesDir, 'admin-forward-audit'));
const adminMailBulkRouter = require(path.join(routesDir, 'admin-mail-bulk'));
const adminMailRouter = require(path.join(routesDir, 'admin-mail'));
const adminRepairRouter = require(path.join(routesDir, 'admin-repair'));
const adminBlogRouter = require(path.join(routesDir, 'admin-blog'));
const blogRouter = require(path.join(routesDir, 'blog'));
const debugRouterLegacy = require(path.join(routesDir, 'debug'));
const downloadsRouter = require(path.join(routesDir, 'downloads'));
// const emailPrefsRouter = require(path.join(routesDir, 'email-prefs')); // Now using TypeScript version
const filesRouter = require(path.join(routesDir, 'files'));
const gdprExportRouter = require(path.join(routesDir, 'gdpr-export'));
const kycStartRouter = require(path.join(routesDir, 'kyc-start'));
const mailForwardRouter = require(path.join(routesDir, 'mail-forward'));
const mailSearchRouter = require(path.join(routesDir, 'mail-search'));
const metricsRouter = require(path.join(routesDir, 'metrics'));
const notificationsRouter = require(path.join(routesDir, 'notifications'));
const profileResetRouter = require(path.join(routesDir, 'profile-reset'));
const webhooksGcRouter = require(path.join(routesDir, 'webhooks-gc'));
// Mount legacy routes that need raw body handling
// Note: webhooks-postmark and webhooks-sumsub are already imported above

// --- cookie options helper
const { sessionCookieOptions, isSecureEnv } = require("./lib/cookies");

// --- init
const app = express();
app.set("trust proxy", 1);

// ---- Health routes FIRST (before helmet/cors/anything else) ----
app.use('/api', health);

// ---- Webhooks BEFORE CORS ----
// Webhooks are server-to-server and should not be subject to browser CORS allowlists.
// They are secured by provider signatures instead.
app.post('/api/webhooks-postmark', express.raw({ type: 'application/json' }), postmarkWebhook);

// GoCardless webhook (raw body required for signature verification)
app.use(
    '/api/webhooks',
    express.raw({ type: 'application/json' }),
    ((req: Request & { rawBody?: string }, _res: Response, next: NextFunction) => {
        if (req.path === '/gocardless') {
            req.rawBody = req.body?.toString?.('utf8') ?? '';
        }
        next();
    }) satisfies RequestHandler,
    gocardlessWebhook
);

// security + CORS (must be before browser-facing routes)
app.use(helmet());
// HSTS: tell browsers to only use HTTPS for this domain (prod only)
if (process.env.NODE_ENV === 'production') {
    // 2 years, include subdomains, preload list compatible
    app.use(helmet.hsts({ maxAge: 63072000, includeSubDomains: true, preload: true }));
}

// Enforce HTTPS behind proxies (Render/Vercel set x-forwarded-proto)
app.use((req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production') return next();
    const xfProto = (req.headers['x-forwarded-proto'] as string | undefined) || '';
    if (xfProto && xfProto !== 'https') {
        // Redirect safe methods; reject unsafe methods to avoid clients replaying POSTs unexpectedly.
        if (req.method === 'GET' || req.method === 'HEAD') {
            const host = req.headers.host || '';
            return res.redirect(308, `https://${host}${req.originalUrl}`);
        }
        return res.status(400).json({ ok: false, error: 'https_required' });
    }
    return next();
});

// CORS first - apply to ALL responses including errors
app.use(cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        const isProd = process.env.NODE_ENV === 'production';
        
        // Support both CORS_ORIGINS and ALLOWED_ORIGINS env vars (for backwards compatibility)
        const corsOriginsEnv = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '';
        const envOrigins = corsOriginsEnv
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        
        const allowedOrigins = [
            // prod domains
            'https://virtualaddresshub.co.uk',
            'https://www.virtualaddresshub.co.uk',
            // explicit staging/frontends
            'https://vah-new-frontend-75d6.vercel.app',
            'https://vah-frontend-final.vercel.app',
            // local dev - only allow in non-production (or if explicitly set in env)
            ...(isProd ? [] : ['http://localhost:3000', 'http://localhost:3001']),
            // env-configured origins (from CORS_ORIGINS or ALLOWED_ORIGINS)
            ...envOrigins,
        ];

        // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
        if (!origin) {
            return cb(null, true);
        }

        // Check if origin is in allowlist
        if (allowedOrigins.includes(origin)) {
            return cb(null, true);
        }

        // Allow Vercel preview deployment URLs (pattern: https://vah-new-frontend-*-*.vercel.app)
        // These include preview deployments with hashes and project identifiers
        if (/^https:\/\/vah-new-frontend-.*\.vercel\.app$/.test(origin)) {
            return cb(null, true);
        }
        if (/^https:\/\/vah-frontend-final-.*\.vercel\.app$/.test(origin)) {
            return cb(null, true);
        }

        // Reject all other origins with explicit error
        logger.warn('[cors] blocked_origin', { origin });
        return cb(new Error(`CORS policy: Origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token', 'X-Requested-With', 'Cache-Control', 'Pragma'],
    exposedHeaders: ['Content-Disposition'],
    optionsSuccessStatus: 204,
}));


// cookies must come before any access to req.cookies
app.use(cookieParser());

// CSRF protection - ensure token cookie is set for all requests
import { ensureCsrfToken, requireCsrfToken, getOrCreateCsrfToken } from './middleware/csrf';
app.use('/api', ensureCsrfToken);

// CSRF token endpoint - allows clients to fetch CSRF token
// Must be before requireCsrfToken middleware so GET requests are not blocked
app.get('/api/csrf', (req: Request, res: Response) => {
    const token = getOrCreateCsrfToken(req, res);
    res.json({ csrfToken: token });
});

// compression
app.use(compression());

// logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'vah-backend' },
    transports: [
        new winston.transports.Console()
    ]
});


// Morgan HTTP logging
app.use(morgan('combined', {
    stream: {
        write: (message: string) => logger.info(message.trim())
    }
}));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.set('X-Request-ID', requestId);
    next();
});

// CSP middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    res.set('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https:; " +
        "font-src 'self' data:; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
    );
    next();
});

// CSRF protection for state-changing routes
const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for webhooks and API routes that don't change state
    if (req.path.startsWith('/api/webhooks/') ||
        req.path.startsWith('/api/metrics') ||
        req.method === 'GET') {
        return next();
    }

    const headerToken = req.headers['x-csrf-token'];
    const tokenFromHeader = typeof headerToken === 'string' ? headerToken : undefined;
    const body = req.body as unknown;
    const tokenFromBody =
        body && typeof body === 'object' && '_csrf' in body && typeof (body as { _csrf?: unknown })._csrf === 'string'
            ? (body as { _csrf: string })._csrf
            : undefined;
    const token = tokenFromHeader || tokenFromBody;

    const maybeSession = req as unknown as { session?: { csrfToken?: unknown } };
    const sessionToken = typeof maybeSession.session?.csrfToken === 'string' ? maybeSession.session.csrfToken : undefined;

    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
};

// ---- Health routes already mounted above (before helmet/cors) ----

// Rate limiting (IPv6-safe with health check exemption)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs (increased for admin usage)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''), // IPv6-safe key generation
    skip: (req) => {
        const ua = (req.headers['user-agent'] || '').toString();
        // Skip our health check and Render's probe entirely
        if (req.path === '/api/healthz') return true;
        if (ua.startsWith('Render/1.0')) return true;
        return false;
    },
});

// Apply rate limiter to API routes only (health check already excluded)
// Optional staging toggle to disable rate limiting
const disableLimiter = process.env.DISABLE_RATE_LIMIT === '1';

if (process.env.DISABLE_RATE_LIMIT_FOR_HEALTHZ === '1' && process.env.NODE_ENV === 'test') {
    // In test mode, wrap limiter to skip health checks
    app.use('/api', (req, res, next) => {
        if (req.path === '/api/healthz') {
            return next(); // Skip rate limiting for health checks in test mode
        }
        return limiter(req, res, next);
    });
} else if (!disableLimiter) {
    app.use('/api', limiter);
}

// NOTE: JSON/body parsers are mounted inside start() AFTER raw-body webhooks.

// Database initialization
async function initializeDatabase() {
    try {
        // PostgreSQL connection will be established on first use (lazy initialization)
        logger.info('PostgreSQL will be initialized on first use');
        logger.info('DB connection will be established on first use');
    } catch (e) {
        logger.error('DB initialization warning:', e);
        // Don't exit - let the app start and fail gracefully on first DB use
        logger.warn('Continuing without DB initialization - will retry on first use');
    }
}

// Helper functions for database operations
const ensureColumn = async (table: string, column: string, type: string) => {
    try {
        const result = await selectOne(`
            SELECT name FROM pragma_table_info(?) WHERE name = ?
        `, [table, column]);

        if (!result) {
            await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            logger.info(`Added column ${column} to ${table}`);
        }
    } catch (e) {
        // Column might already exist or table might not exist yet
        logger.debug(`Column ${column} might already exist in ${table}`);
    }
};

// Initialize database and start server
async function start() {
    await initializeDatabase();

    // Database is ready, proceed with route mounting

    // Dev-only guard to detect stale dist
    if (process.env.NODE_ENV !== 'production') {
        try {
            const fs = require('fs');
            const has = fs
                .readFileSync('dist/server/index.js', 'utf8')
                .includes('storage_expires_at');
            if (has) logger.warn('[warn] dist still references storage_expires_at; rebuild needed');
        } catch (e) {
            // Ignore if dist doesn't exist yet
        }
    }

    // ---- Health check already defined above (before helmet/cors) ----

    // Version info (for deployment verification)
    app.get('/api/__version', (_req, res) => {
        try {
            const buildMeta = require('../../dist/build-meta.json');
            res.json({
                builtAt: buildMeta.builtAt,
                commit: buildMeta.commit || 'unknown',
                branch: buildMeta.branch || 'unknown',
                nodeEnv: process.env.NODE_ENV || 'development'
            });
        } catch {
            res.json({
                builtAt: 'unknown',
                commit: 'unknown',
                branch: 'unknown',
                nodeEnv: process.env.NODE_ENV || 'development'
            });
        }
    });

    // Global parsers for the rest of the app (safe)
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // JSON parse error handler
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
        if (err instanceof SyntaxError && 'body' in err) {
            return res.status(400).json({ ok: false, error: "Invalid JSON" });
        }
        next(err);
    });

    // Internal routes - mail import from OneDrive worker
    app.use('/api/internal', internalMailImportRouter);
    logger.info('[mount] /api/internal (mail import) mounted');

    // JWT authentication middleware - extracts and verifies JWT tokens
    const { authenticateJWT } = require('./middleware/auth');
    app.use('/api', authenticateJWT);
    logger.info('[middleware] JWT authentication middleware mounted');

    // CSRF protection for state-changing requests (after auth, before routes)
    app.use('/api', requireCsrfToken);
    logger.info('[middleware] CSRF protection middleware mounted');

    // Mount other routes
    app.use('/api/auth', authRouter);
    logger.info('[mount] /api/auth mounted');
    app.use('/api/profile', profileRouter);
    app.use('/api/profile', profileEmailChangeRouter); // Mount email change routes
    app.use('/api/profile', robustPasswordResetRouter); // Mount robust password reset
    app.use('/api/profile', passwordResetRouter); // Mount password reset endpoints
    app.use('/api/business-owners', businessOwnersRouter); // Mount business owners routes
    app.use('/api', sumsubWebhook);
    app.use('/api', publicPlansRouter);
    app.use('/api', debugEmailRouter);

    // NEW: Mount missing endpoints
    // Disable ETags for mail routes to prevent 304 responses
    app.use('/api', (req, res, next) => {
        if (req.path.startsWith('/mail-items')) {
            res.setHeader('ETag', '');
        }
        next();
    });
    app.use('/api', mailRouter);
    logger.info('[mount] /api (mail routes) mounted');
    app.use('/api/billing', billingRouter);
    logger.info('[mount] /api/billing mounted');

    // Internal billing runner (cron-triggered)
    app.use('/api/internal', internalBillingRouter);
    logger.info('[mount] /api/internal mounted');
    app.use('/api/payments', paymentsRouter);
    logger.info('[mount] /api/payments mounted');

    // Mount safe stubs for integrations until providers are wired
    app.use('/api/payments', paymentsStubRouter);
    logger.info('[mount] /api/payments (stubs) mounted');
    app.use('/api/kyc', kycStubRouter);
    logger.info('[mount] /api/kyc (stubs) mounted');

    app.use('/api', forwardingRouter);
    logger.info('[mount] /api (forwarding routes) mounted');
    app.use('/api/email-prefs', emailPrefsRouterNew);
    logger.info('[mount] /api/email-prefs (new) mounted');
    app.use('/api/admin', adminUsersRouter);
    logger.info('[mount] /api/admin (users) mounted');
    app.use('/api/admin', adminForwardingRouter);
    logger.info('[mount] /api/admin (forwarding) mounted');
    app.use('/api', adminForwardingDebugRouter);
    logger.info('[mount] /api (admin-forwarding-debug) mounted');
    app.use('/api', adminForwardingLocksRouter);
    logger.info('[mount] /api (admin-forwarding-locks) mounted');
    app.use('/api/admin', adminStatsRouter);
    logger.info('[mount] /api/admin (stats) mounted');
    app.use('/api/admin', adminBillingRouter);
    logger.info('[mount] /api/admin (billing) mounted');
    app.use('/api/admin', adminPlansRouter);
    logger.info('[mount] /api/admin (plans) mounted');
    app.use('/api/admin', adminMailItemsRouter);
    logger.info('[mount] /api/admin (mail-items) mounted');
    app.use('/api/admin', adminActivityRouter);
    logger.info('[mount] /api/admin (activity) mounted');
    app.use('/api/admin', adminServiceStatusRouter);
    logger.info('[mount] /api/admin (service-status) mounted');
    app.use('/api/admin', adminMetricsGrowthRouter);
    logger.info('[mount] /api/admin (metrics-growth) mounted');
    app.use('/api/admin/health', adminHealthRouter);
    logger.info('[mount] /api/admin/health mounted');
    app.use('/api/admin/overview', adminOverviewRouter);
    logger.info('[mount] /api/admin/overview mounted');
    app.use('/api/admin', adminInvoicesRouter);
    logger.info('[mount] /api/admin (invoices) mounted');
    app.use('/api/admin/exports', adminExportsRouter);
    logger.info('[mount] /api/admin/exports mounted');
    app.use('/api/admin', adminBlogRouter);
    logger.info('[mount] /api/admin (blog) mounted');
    app.use('/api', blogRouter);
    logger.info('[mount] /api (blog) mounted');

    // Media upload routes
    const adminMediaRouter = require(path.join(routesDir, 'admin-media'));
    app.use('/api/admin', adminMediaRouter);
    app.use('/api', adminMediaRouter);
    logger.info('[mount] /api/admin (media) mounted');
    app.use('/api/companies-house', companiesHouseRouter);
    logger.info('[mount] /api/companies-house mounted');
    app.use('/api', idealPostcodesRouter);
    logger.info('[mount] /api (ideal-postcodes) mounted');

    app.use('/api/debug', debugRouterLegacy);
    app.use('/api', opsSelfTestRouter);
    logger.info('[mount] /api (ops-self-test) mounted');
    logger.info('[mount] /api/debug mounted');
    app.use('/api/kyc', kycRouter);
    logger.info('[mount] /api/kyc mounted');
    app.use('/api/support', supportRouter);
    logger.info('[mount] /api/support mounted');
    app.use('/api/contact', contactRouter);
    logger.info('[mount] /api/contact mounted');

    app.use('/api/quiz', quizRouter);
    logger.info('[mount] /api/quiz mounted');

    // BFF mail scan routes (buffer and serve with safe headers)
    app.use('/api/bff', bffMailScanRouter);
    logger.info('[mount] /api/bff (mail scan) mounted');
    app.use('/api', bffMailScanRouter); // compat for /api/legacy/mail-items/:id/download
    logger.info('[mount] /api (legacy mail scan compat) mounted');

    // Test download routes (for testing file downloads)
    const testDownloadsRouter = require(path.join(routesDir, 'test-downloads'));
    app.use('/api/test', testDownloadsRouter);
    app.use('/api', migrateRouter);
    app.use('/api', triggerMigrateRouter);
    app.use('/api', webhookMigrateRouter);
    app.use('/api', directMigrateRouter);
    logger.info('[mount] /api/test (downloads) mounted');

    // Dev routes (staging/local only) - disabled in production for security
    if (process.env.NODE_ENV !== 'production') {
        app.use(devRouter);
        logger.info('🔧 Dev routes enabled (non-production)');
    } else {
        logger.info('🔒 Dev routes disabled (production)');
    }

    // Mount address router
    if (addressRouter && typeof addressRouter === 'function') {
        app.use('/api/address', addressRouter);
        logger.info('[mount] /api/address mounted');
    } else {
        logger.error('[mount] /api/address not mounted (addressRouter not a function)', {
            type: typeof addressRouter,
        });
    }

    app.use('/api/admin-audit', adminAuditRouter);
    logger.info('[mount] /api/admin-audit mounted');

    app.use('/api/admin-forward-audit', adminForwardAuditRouter);
    logger.info('[mount] /api/admin-forward-audit mounted');

    app.use('/api/admin-mail-bulk', adminMailBulkRouter);
    logger.info('[mount] /api/admin-mail-bulk mounted');

    app.use('/api/admin-mail', adminMailRouter);
    logger.info('[mount] /api/admin-mail mounted');

    app.use('/api/admin-repair', adminRepairRouter);
    logger.info('[mount] /api/admin-repair mounted');

    app.use('/api/debug', debugRouterLegacy);
    logger.info('[mount] /api/debug mounted');

    app.use('/api/downloads', downloadsRouter);
    logger.info('[mount] /api/downloads mounted');

    // NOTE: /api/email-prefs is now mounted from the new TypeScript route above (emailPrefsRouterNew)
    // app.use('/api/email-prefs', emailPrefsRouter);
    // logger.info('[mount] /api/email-prefs mounted');

    app.use('/api/files', filesRouter);
    logger.info('[mount] /api/files mounted');

    app.use('/api/gdpr-export', gdprExportRouter);
    logger.info('[mount] /api/gdpr-export mounted');

    app.use('/api/kyc', kycStartRouter);
    logger.info('[mount] /api/kyc mounted');

    // Global error handler (must be last, after all routes)
    app.use(errorHandler);
    logger.info('[mount] Error handler middleware mounted');

    app.use('/api/mail/forward', mailForwardRouter);
    logger.info('[mount] /api/mail/forward mounted');

    app.use('/api/mail-search', mailSearchRouter);
    logger.info('[mount] /api/mail-search mounted');

    app.use('/api/metrics', metricsRouter);
    logger.info('[mount] /api/metrics mounted');

    app.use('/api/notifications', notificationsRouter);
    logger.info('[mount] /api/notifications mounted');

    app.use('/api', profileResetRouter);
    logger.info('[mount] /api (profile-reset routes) mounted');

    app.use('/api/webhooks-gc', webhooksGcRouter);
    logger.info('[mount] /api/webhooks-gc mounted');

    // GoCardless webhook is already mounted above with raw body support

    app.use('/api/webhooks-onedrive', onedriveWebhook);
    logger.info('[mount] /api/webhooks-onedrive mounted');

    app.use(webhookRouter);
    logger.info('[mount] webhook routes mounted');

    // 404 handler that still returns CORS
    app.use((req, res) => {
        const origin = req.headers.origin as string;
        const allowedOrigins = [
            'https://vah-new-frontend-75d6.vercel.app',
            'https://vah-frontend-final.vercel.app',
            'http://localhost:3000'
        ];
        if (origin && allowedOrigins.includes(origin)) {
            res.set('Access-Control-Allow-Origin', origin);
            res.set('Access-Control-Allow-Credentials', 'true');
        }
        res.status(404).json({ ok: false, error: 'not_found' });
    });

    // Global error handler (must be last, after all routes)
    // Note: CORS is handled by corsMiddleware above, so errorHandler doesn't need to set CORS headers
    app.use(errorHandler);
    logger.info('[mount] Error handler middleware mounted');

    // ---- Global error handlers to prevent crashes ----
    process.on("unhandledRejection", (reason: unknown) => {
        const msg =
            reason && typeof reason === 'object' && 'message' in reason && typeof (reason as { message?: unknown }).message === 'string'
                ? String((reason as { message: string }).message)
                : String(reason);
        logger.error("[unhandledRejection]", { message: msg });
    });

    process.on("uncaughtException", (error: unknown) => {
        const msg =
            error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
                ? String((error as { message: string }).message)
                : String(error);
        logger.error("[uncaughtException]", { message: msg });
        // Don't exit - let the platform restart if truly fatal
    });

    // ---- Run startup migrations ----
    if (process.env.RUN_STARTUP_MIGRATIONS === 'true') {
        logger.info('[migration] running_startup_migrations');
        const { runStartupMigrations } = require('./scripts/startup-migrate');
        runStartupMigrations().catch((e: unknown) => {
            const msg =
                e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
                    ? String((e as { message: string }).message)
                    : String(e);
            logger.error('[migration] startup_migrations_failed', { message: msg });
        });
    }

    // ---- Server bootstrap: bind to Render's PORT or fallback ----
    const server = http.createServer(app);

    // Configure timeouts for Render
    server.headersTimeout = 65_000;
    server.requestTimeout = 60_000;

    server.listen(PORT, HOST, () => {
        const env = process.env.NODE_ENV || 'development';
        const cors = process.env.CORS_ORIGINS || 'default';
        const gcEnv = process.env.GC_ENVIRONMENT || process.env.GOCARDLESS_ENV || 'sandbox';
        const gcToken = (process.env.GC_ACCESS_TOKEN || process.env.GOCARDLESS_ACCESS_TOKEN || '').trim();

        // Start maintenance service
        systemMaintenance.start();
        logger.info('[boot] system_maintenance_started');

        // Print extremely explicit diagnostics for Render logs:
        logger.info('[boot] deployment_info', {
            renderExternalUrl: process.env.RENDER_EXTERNAL_URL || '(unknown)',
            databaseUrl: process.env.DATABASE_URL ? 'set' : 'missing',
            corsOrigins: cors,
            port: PORT,
            nodeEnv: env,
            gocardlessWebhookRoute: '/api/webhooks/gocardless',
            gcEnv,
            gcTokenPrefix: gcToken ? gcToken.slice(0, 7) : '(missing)',
        });

        // Debug logging for APP_BASE_URL (non-production only)
        if (env !== 'production') {
            logger.debug('[boot] app_base_url', { appBaseUrl: process.env.APP_BASE_URL || '(not set)' });
        }

        // Log Graph API configuration
        logGraphConfigAtStartup();
    });

    // ---- Graceful shutdown (prevents crash loops) ----
    const shutdown = (signal: NodeJS.Signals) => {
        logger.info('[boot] shutdown_signal', { signal });
        try {
            // Stop background intervals so we don't run jobs during shutdown.
            try { systemMaintenance.stop(); } catch { }
            try { stopForwardingLocksCleanup(); } catch { }
            try { stopSelfTestScheduler(); } catch { }
        } catch { }
        server.close((err: unknown) => {
            if (err) {
                const msg =
                    err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
                        ? String((err as { message: string }).message)
                        : String(err);
                logger.error('[boot] server_close_failed', { message: msg });
                process.exit(1);
            }
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

start().catch((err: unknown) => {
    const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
            ? String((err as { message: string }).message)
            : String(err);
    logger.error('[boot] fatal_start_error', { message: msg });
    process.exit(1);
});

export default app;
