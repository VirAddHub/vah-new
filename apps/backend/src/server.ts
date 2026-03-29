// VirtualAddressHub Backend — Next.js-ready Express API

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import winston from 'winston';
import compression from 'compression';
import joi from 'joi';
import { body, query, param, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import http from 'http';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Centralized environment config
import { HOST, PORT } from './config/env';
import { validateProductionConfigOrThrow } from './config/productionEnvValidation';
import { logGraphConfigAtStartup } from './config/azure';
import { logSumsubConfigAtStartup } from './lib/sumsubConfig';
import { safeHttpAccessLog } from './lib/accessLog';

import { isCorsOriginAllowed } from './lib/corsAllowlist';

// Health routes (no DB dependencies)
import { health } from './server/routes/health';

// Database adapters
import { ensureSchema, getPool } from "./server/db";
import { selectOne, selectMany, execute, insertReturningId } from "./server/db-helpers";

// --- routes that need raw body (webhooks)
import { postmarkWebhook } from "./server/routes/webhooks-postmark";
import onedriveWebhook from "./server/routes/webhooks-onedrive";
import gocardlessWebhook from "./server/routes/webhooks-gocardless";
import stripeWebhook from "./server/routes/webhooks-stripe";
import sumsubWebhook from "./server/routes/webhooks-sumsub";
import { Router } from "express";
import profileRouter from "./server/routes/profile";
import profileEmailChangeRouter from "./server/routes/profileEmailChange";
import businessOwnersRouter from "./server/routes/businessOwners";
import accountBusinessesRouter from "./server/routes/account-businesses";
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
import stripeCheckoutRouter from "./server/routes/stripe-checkout";
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
import kycRouter from "./server/routes/kyc";
import forwardingRouter from "./server/routes/forwarding";
import emailPrefsRouterNew from "./server/routes/email-prefs";
import supportRouter from "./server/routes/support";
import contactRouter from "./server/routes/contact";
import addressRouterImport from "./server/routes/address";
import bffMailScanRouter from "./routes/bff-mail-scan";
import { quizRouter } from "./server/routes/quiz";
import internalMailImportRouter from "./server/routes/internalMailImport";
import mailForwardRouter from "./server/routes/mail-forward";
import gdprExportRouter from "./server/routes/gdpr-export";
import filesRouter from "./server/routes/files";
import downloadsRouter from "./server/routes/downloads";
import { sessionCookieOptions, isSecureEnv } from "./lib/cookies";
import adminAuditRouter from "./server/routes/admin-audit";
import adminForwardAuditRouter from "./server/routes/admin-forward-audit";
import adminBlogRouter from "./server/routes/admin-blog";
import adminMediaRouter from "./server/routes/admin-media";
import adminRepairRouter from "./server/routes/admin-repair";
import blogRouter from "./server/routes/blog";
import debugRouterLegacy from "./server/routes/debug";
import mailSearchRouter from "./server/routes/mail-search";
import metricsRouter from "./server/routes/metrics";
import notificationsRouter from "./server/routes/notifications";
type MaybeDefault<T> = { default?: T } | T;
// handle CJS/ESM default interop safely
function unwrapDefault<T>(m: MaybeDefault<T>): T {
    if (m && typeof m === "object" && "default" in m) {
        return (m as { default?: T }).default ?? (m as unknown as T);
    }
    return m as T;
}
// End of legacy requires
// --- init
const app = express();
app.set("trust proxy", 1);

// ---- Health routes FIRST (before helmet/cors/anything else) ----
app.use('/api', health);

// ---- Webhooks BEFORE CORS ----
// Webhooks are server-to-server and should not be subject to browser CORS allowlists.
// They are secured by provider signatures instead.
app.post('/api/webhooks-postmark', express.raw({ type: 'application/json' }), postmarkWebhook);

// Webhooks: GoCardless + Stripe (raw body required for signature verification)
const webhooksRouter = Router();
webhooksRouter.use(gocardlessWebhook);
webhooksRouter.use(stripeWebhook);

// Sumsub webhook — now fully TypeScript; receives raw Buffer for signature verification
webhooksRouter.use('/sumsub', sumsubWebhook);

app.use(
    '/api/webhooks',
    express.raw({ type: 'application/json' }),
    ((req: Request & { rawBody?: string }, _res: Response, next: NextFunction) => {
        if (req.path === '/gocardless' || req.path === '/stripe') {
            req.rawBody = req.body?.toString?.('utf8') ?? '';
        }
        next();
    }) satisfies RequestHandler,
    webhooksRouter
);

// security + CORS (must be before browser-facing routes)
// CSP is applied in a dedicated middleware below (API-only strict policy). Helmet's default CSP
// targets HTML apps and would duplicate or conflict with that header.
app.use(helmet({ contentSecurityPolicy: false }));
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
// With credentials: true, origins are explicit (never *). Misconfigured CORS_ORIGINS breaks credentialed browsers only — it does not open cross-site cookie access to arbitrary origins.
// Production: canonical prod hosts + CORS_ORIGINS / ALLOWED_ORIGINS only (see lib/corsAllowlist.ts).
// Non-production: trusted prod set + localhost + CORS_PREVIEW_ORIGINS (explicit URLs; no default Vercel regex).
app.use(cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        const isProd = process.env.NODE_ENV === 'production';

        if (!origin) {
            return cb(null, true);
        }

        if (isCorsOriginAllowed(origin, isProd)) {
            return cb(null, true);
        }

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


// HTTP access log: structured, no query strings or full URLs (avoids leaking tokens in ?params).
// Sets X-Request-ID (honours incoming X-Request-ID when it is a valid UUID for trace correlation).
app.use(safeHttpAccessLog(logger));

/**
 * Content-Security-Policy for this service (API-first Express host).
 *
 * This is not the product document origin (Next.js sets CSP for HTML). Here we mostly return
 * JSON, PDF, ZIP, CSV, and binary images (e.g. admin-media sendFile) — not HTML documents.
 * If a response is ever misinterpreted as HTML, this policy stays maximally strict: no
 * script/style/connect/worker surface, no plugins (object), no framing parent, no form posts.
 *
 * Explicit script-src/style-src/connect-src/worker-src duplicate default-src 'none' so the file
 * is easy to audit and future edits to default-src cannot accidentally widen execution.
 *
 * No unsafe-inline, unsafe-eval, or broad URL allowlists.
 *
 * Retained:
 * - report-uri (legacy; widely implemented) → same-origin POST /api/csp-report
 * - upgrade-insecure-requests in production only (hardening; avoids changing local http:// dev)
 *
 * Note: handlers mounted before this middleware (e.g. early /api health + raw webhooks) finish
 * the response without passing through here, so they typically omit this header — acceptable
 * for non-HTML JSON/health and signature-verified webhook bodies.
 */
function buildApiContentSecurityPolicy(): string {
    const reportPath = '/api/csp-report';
    const parts = [
        "default-src 'none'",
        "script-src 'none'",
        "style-src 'none'",
        "connect-src 'none'",
        "worker-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "object-src 'none'",
        `report-uri ${reportPath}`,
    ];
    if (process.env.NODE_ENV === 'production') {
        parts.splice(parts.length - 1, 0, 'upgrade-insecure-requests');
    }
    return parts.join('; ');
}

app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Security-Policy', buildApiContentSecurityPolicy());
    next();
});

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

// Auth-only rate limiter (never disabled) — login/signup/reset must stay rate-limited
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many authentication attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
});

// Apply rate limiter to API routes only (health check already excluded)
// Non-production: DISABLE_RATE_LIMIT=1 or =true disables the *general* API limiter only (see below).
// Production: same env values are rejected at startup (productionEnvValidation.ts) — limiter is always mounted.
// Auth routes use authLimiter below; it is never gated by DISABLE_RATE_LIMIT.
const disableLimiterRaw = String(process.env.DISABLE_RATE_LIMIT ?? '').trim();
const disableLimiterRequested =
    disableLimiterRaw === '1' || disableLimiterRaw.toLowerCase() === 'true';
const isProductionEnv = process.env.NODE_ENV === 'production';
const disableLimiter = disableLimiterRequested && !isProductionEnv;

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

    try {
        validateProductionConfigOrThrow();
    } catch (e) {
        logger.error('[boot] production_env_validation_failed', {
            message: e instanceof Error ? e.message : String(e),
        });
        process.exit(1);
    }

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

    // Auth rate limiter (never disabled)
    app.use('/api/auth', authLimiter);
    // Additional per-group limiters: lib/routeGroupRateLimits.ts (forwarding, mail forward, KYC writes, GDPR export API)

    // CSP report endpoint (rate-limited, no auth) — browsers POST violation reports here
    const cspReportLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    });
    const cspReportRouter = express.Router();
    cspReportRouter.post('/', cspReportLimiter, (req: Request, res: Response) => {
        logger.info('[csp-report]', { body: req.body });
        res.status(204).end();
    });
    app.use('/api/csp-report', cspReportRouter);

    // Mount other routes
    app.use('/api/auth', authRouter);
    logger.info('[mount] /api/auth mounted');
    app.use('/api/profile', profileRouter);
    app.use('/api/profile', profileEmailChangeRouter); // Mount email change routes
    app.use('/api/profile', robustPasswordResetRouter); // Mount robust password reset
    app.use('/api/profile', passwordResetRouter); // Mount password reset endpoints
    app.use('/api/business-owners', businessOwnersRouter); // Mount business owners routes
    app.use('/api/account', accountBusinessesRouter);
    app.use('/api', publicPlansRouter);
    app.use('/api', blogRouter);
    logger.info('[mount] /api (blog, public) mounted (TS handler)');
    // Public blog cover images (before mail router so unauthenticated requests succeed)
    app.use('/api', adminMediaRouter);
    logger.info('[mount] /api (media/blog, public) mounted (TS handler)');
    // debug-email can send arbitrary templates — never mount in production (env validation is not enough).
    if (process.env.NODE_ENV !== 'production') {
        app.use('/api', debugEmailRouter);
        logger.info('[mount] /api (debug-email) mounted (non-production only)');
    } else {
        logger.info('[mount] /api (debug-email) disabled (production)');
    }

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
    app.use('/api/payments/stripe', stripeCheckoutRouter);
    logger.info('[mount] /api/payments mounted');

    // Mount safe stubs for integrations until providers are wired
    app.use('/api/payments', paymentsStubRouter);
    logger.info('[mount] /api/payments (stubs) mounted');

    // KYC is now fully handled by the unified TS kycRouter

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
    logger.info('[mount] /api/admin (blog) mounted (TS handler)');

    // Media upload routes (GET /api/media/blog already mounted above for public access)
    app.use('/api/admin', adminMediaRouter);
    logger.info('[mount] /api/admin (media) mounted (TS handler)');
    app.use('/api/companies-house', companiesHouseRouter);
    logger.info('[mount] /api/companies-house mounted');
    app.use('/api', idealPostcodesRouter);
    logger.info('[mount] /api (ideal-postcodes) mounted');

    app.use('/api', opsSelfTestRouter);
    logger.info('[mount] /api (ops-self-test) mounted');
    app.use('/api/kyc', kycRouter);
    logger.info('[mount] /api/kyc (TS status/upload) mounted');
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

    // Migration / schema mutation HTTP routes — never mount in production (unauthenticated
    // DDL, exec of migration scripts). When enabled (non-prod), migrate routes use requireAdmin;
    // GET /migrate/status returns aggregate flags only (no table/column names in JSON).
    if (process.env.NODE_ENV !== 'production') {
        app.use('/api', migrateRouter);
        app.use('/api', triggerMigrateRouter);
        app.use('/api', webhookMigrateRouter);
        app.use('/api', directMigrateRouter);
        logger.info('[mount] /api migration routes enabled (non-production only)');
        const whSecret = process.env.MIGRATE_WEBHOOK_SECRET?.trim();
        if (!whSecret || whSecret.length < 32) {
            logger.warn(
                '[mount] POST /api/webhook/migrate will return 401 until MIGRATE_WEBHOOK_SECRET is set (≥32 chars)'
            );
        }
    } else {
        logger.info('[mount] /api migration routes disabled (production)');
    }

    // Dev routes (staging/local only) - disabled in production for security
    if (process.env.NODE_ENV !== 'production') {
        app.use(devRouter);
        logger.info('🔧 Dev routes enabled (non-production)');
    } else {
        logger.info('🔒 Dev routes disabled (production)');
    }


    app.use('/api/admin-audit', adminAuditRouter);
    logger.info('[mount] /api/admin-audit mounted (TS handler)');

    app.use('/api/admin-forward-audit', adminForwardAuditRouter);
    logger.info('[mount] /api/admin-forward-audit mounted (TS handler)');


    app.use('/api/admin-repair', adminRepairRouter);
    logger.info('[mount] /api/admin-repair mounted (TS handler)');

    // /api/debug includes unauthenticated endpoints (e.g. export-jobs/ping); mount only outside production.
    if (process.env.NODE_ENV !== 'production') {
        app.use('/api/debug', debugRouterLegacy);
        logger.info('[mount] /api/debug mounted (non-production only)');
    } else {
        logger.info('[mount] /api/debug disabled (production)');
    }

    app.use('/api/downloads', downloadsRouter);
    logger.info('[mount] /api/downloads mounted (TS handler)');


    app.use('/api/files', filesRouter);
    logger.info('[mount] /api/files mounted (TS handler)');

    app.use('/api/gdpr-export', gdprExportRouter);
    logger.info('[mount] /api/gdpr-export mounted (TS handler)');

    app.use('/api/mail/forward', mailForwardRouter);
    logger.info('[mount] /api/mail/forward mounted (TS handler)');

    app.use('/api/mail-search', mailSearchRouter);
    logger.info('[mount] /api/mail-search mounted (TS handler)');

    app.use('/api/metrics', metricsRouter);
    logger.info('[mount] /api/metrics mounted (TS handler)');

    app.use('/api/notifications', notificationsRouter);
    logger.info('[mount] /api/notifications mounted (TS handler)');

    // GoCardless webhook is already mounted above with raw body support

    app.use('/api/webhooks-onedrive', onedriveWebhook);
    logger.info('[mount] /api/webhooks-onedrive mounted');

    app.use(webhookRouter);
    logger.info('[mount] webhook routes mounted');

    // 404 — global `cors()` middleware already sets ACAO/ACAC on the response
    app.use((_req, res) => {
        res.status(404).json({ ok: false, error: 'not_found' });
    });

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
        const gcEnv = process.env.GC_ENVIRONMENT || process.env.GOCARDLESS_ENV || 'live';
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

        logSumsubConfigAtStartup();
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
