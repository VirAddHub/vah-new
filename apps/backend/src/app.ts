// VirtualAddressHub Backend — App factory (route mounting, middleware setup)
// This file is separate from server.ts so that tests can import createApp()
// without triggering DB connections or server.listen().

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import winston from 'winston';
import compression from 'compression';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

import { isCorsOriginAllowed } from './lib/corsAllowlist';
import { safeHttpAccessLog } from './lib/accessLog';

// Health routes (no DB dependencies)
import { health } from './server/routes/health';

// --- routes that need raw body (webhooks)
import { postmarkWebhook } from './server/routes/webhooks-postmark';
import onedriveWebhook from './server/routes/webhooks-onedrive';
import gocardlessWebhook from './server/routes/webhooks-gocardless';
import stripeWebhook from './server/routes/webhooks-stripe';
import sumsubWebhook from './server/routes/webhooks-sumsub';
import { Router } from 'express';
import profileRouter from './server/routes/profile';
import profileEmailChangeRouter from './server/routes/profileEmailChange';
import businessOwnersRouter from './server/routes/businessOwners';
import accountBusinessesRouter from './server/routes/account-businesses';
import publicPlansRouter from './server/routes/public/plans';
import debugEmailRouter from './server/routes/debug-email';
import devRouter from './server/routes/dev';
import authRouter from './server/routes/auth';
import migrateRouter from './routes/migrate';
import { stopForwardingLocksCleanup } from './server/routes/admin-forwarding-locks';

import mailRouter from './server/routes/mail';
import billingRouter from './server/routes/billing';
import paymentsRouter from './server/routes/payments';
import stripeCheckoutRouter from './server/routes/stripe-checkout';
import adminUsersRouter from './server/routes/admin-users';
import adminForwardingRouter from './server/routes/admin-forwarding';
import adminForwardingDebugRouter from './server/routes/admin-forwarding-debug';
import adminForwardingLocksRouter from './server/routes/admin-forwarding-locks';
import adminStatsRouter from './server/routes/admin-stats';
import adminBillingRouter from './server/routes/admin-billing';
import adminPlansRouter from './server/routes/admin-plans';
import adminMailItemsRouter from './server/routes/admin-mail-items';
import adminActivityRouter from './server/routes/admin-activity';
import adminServiceStatusRouter from './server/routes/admin-service-status';
import adminMetricsGrowthRouter from './server/routes/admin-metrics-growth';
import adminHealthRouter from './server/routes/admin-health';
import adminOverviewRouter from './server/routes/admin-overview';
import adminInvoicesRouter from './server/routes/admin-invoices';
import adminExportsRouter from './server/routes/admin-exports';
import companiesHouseRouter from './server/routes/companies-house';
import opsSelfTestRouter from './server/routes/ops-selftest';
import idealPostcodesRouter from './server/routes/ideal-postcodes';
import internalBillingRouter from './server/routes/internal-billing';
import { errorHandler } from './server/middleware/errorHandler';

import paymentsStubRouter from './server/routes/payments-stub';
import kycRouter from './server/routes/kyc';
import forwardingRouter from './server/routes/forwarding';
import emailPrefsRouterNew from './server/routes/email-prefs';
import supportRouter from './server/routes/support';
import contactRouter from './server/routes/contact';
import addressRouterImport from './server/routes/address';
import adminChVerificationRouter from './server/routes/admin-ch-verification';
import bffMailScanRouter from './routes/bff-mail-scan';
import { quizRouter } from './server/routes/quiz';
import internalMailImportRouter from './server/routes/internalMailImport';
import mailForwardRouter from './server/routes/mail-forward';
import gdprExportRouter from './server/routes/gdpr-export';
import filesRouter from './server/routes/files';
import downloadsRouter from './server/routes/downloads';
import adminAuditRouter from './server/routes/admin-audit';
import adminForwardAuditRouter from './server/routes/admin-forward-audit';
import adminBlogRouter from './server/routes/admin-blog';
import adminMediaRouter from './server/routes/admin-media';
import adminRepairRouter from './server/routes/admin-repair';
import blogRouter from './server/routes/blog';
import debugRouterLegacy from './server/routes/debug';
import mailSearchRouter from './server/routes/mail-search';
import metricsRouter from './server/routes/metrics';
import notificationsRouter from './server/routes/notifications';

import { ensureCsrfToken, requireCsrfToken, getOrCreateCsrfToken } from './middleware/csrf';
import { authenticateJWT } from './middleware/auth';

type MaybeDefault<T> = { default?: T } | T;
// handle CJS/ESM default interop safely
function unwrapDefault<T>(m: MaybeDefault<T>): T {
    if (m && typeof m === 'object' && 'default' in m) {
        return (m as { default?: T }).default ?? (m as unknown as T);
    }
    return m as T;
}

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

export function createApp() {
    const app = express();
    app.set('trust proxy', 1);

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

    // ---- Health routes FIRST (before helmet/cors/anything else) ----
    app.use('/api', health);

    // ---- Webhooks BEFORE CORS ----
    app.post('/api/webhooks/postmark', express.raw({ type: 'application/json' }), postmarkWebhook);
    app.post('/api/webhooks-postmark', (_req, res) => res.redirect(308, '/api/webhooks/postmark'));

    // Webhooks: GoCardless + Stripe (raw body required for signature verification)
    const webhooksRouter = Router();
    webhooksRouter.use(gocardlessWebhook);
    webhooksRouter.use(stripeWebhook);

    // Sumsub webhook — raw Buffer for signature verification
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

    // security + CORS
    app.use(helmet({ contentSecurityPolicy: false }));
    if (process.env.NODE_ENV === 'production') {
        app.use(helmet.hsts({ maxAge: 63072000, includeSubDomains: true, preload: true }));
    }

    // Enforce HTTPS behind proxies
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV !== 'production') return next();
        const xfProto = (req.headers['x-forwarded-proto'] as string | undefined) || '';
        if (xfProto && xfProto !== 'https') {
            if (req.method === 'GET' || req.method === 'HEAD') {
                const host = req.headers.host || '';
                return res.redirect(308, `https://${host}${req.originalUrl}`);
            }
            return res.status(400).json({ ok: false, error: 'https_required' });
        }
        return next();
    });

    // CORS
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
    app.use('/api', ensureCsrfToken);

    // CSRF token endpoint
    app.get('/api/csrf', (req: Request, res: Response) => {
        const token = getOrCreateCsrfToken(req, res);
        res.json({ csrfToken: token });
    });

    // compression
    app.use(compression());

    // HTTP access log
    app.use(safeHttpAccessLog(logger));

    // Content-Security-Policy
    app.use((_req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Content-Security-Policy', buildApiContentSecurityPolicy());
        next();
    });

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
        skip: (req) => {
            const ua = (req.headers['user-agent'] || '').toString();
            if (req.path === '/api/healthz') return true;
            if (ua.startsWith('Render/1.0')) return true;
            return false;
        },
    });

    // Auth-only rate limiter (never disabled)
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    });

    const disableLimiterRaw = String(process.env.DISABLE_RATE_LIMIT ?? '').trim();
    const disableLimiterRequested =
        disableLimiterRaw === '1' || disableLimiterRaw.toLowerCase() === 'true';
    const isProductionEnv = process.env.NODE_ENV === 'production';
    const disableLimiter = disableLimiterRequested && !isProductionEnv;

    if (process.env.DISABLE_RATE_LIMIT_FOR_HEALTHZ === '1' && process.env.NODE_ENV === 'test') {
        app.use('/api', (req, res, next) => {
            if (req.path === '/api/healthz') {
                return next();
            }
            return limiter(req, res, next);
        });
    } else if (!disableLimiter) {
        app.use('/api', limiter);
    }

    // Version info
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

    // Global parsers
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // JSON parse error handler
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
        if (err instanceof SyntaxError && 'body' in err) {
            return res.status(400).json({ ok: false, error: 'Invalid JSON' });
        }
        next(err);
    });

    // Internal routes - mail import from OneDrive worker
    app.use('/api/internal', internalMailImportRouter);
    logger.info('[mount] /api/internal (mail import) mounted');

    // JWT authentication middleware
    app.use('/api', authenticateJWT);
    logger.info('[middleware] JWT authentication middleware mounted');

    // CSRF protection for state-changing requests (after auth, before routes)
    app.use('/api', requireCsrfToken);
    logger.info('[middleware] CSRF protection middleware mounted');

    // Auth rate limiter (never disabled)
    app.use('/api/auth', authLimiter);

    // CSP report endpoint
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

    // Mount routes
    app.post('/api/profile/reset-password-request', (req, res) => {
        res.redirect(307, '/api/auth/reset-password/request');
    });
    app.use('/api/auth', authRouter);
    logger.info('[mount] /api/auth mounted');
    app.use('/api/profile', profileRouter);
    app.use('/api/profile', profileEmailChangeRouter);
    app.use('/api/business-owners', businessOwnersRouter);
    app.use('/api/account', accountBusinessesRouter);
    app.use('/api', publicPlansRouter);
    app.use('/api', blogRouter);
    logger.info('[mount] /api (blog, public) mounted (TS handler)');
    app.use('/api', adminMediaRouter);
    logger.info('[mount] /api (media/blog, public) mounted (TS handler)');

    if (process.env.NODE_ENV !== 'production') {
        app.use('/api', debugEmailRouter);
        logger.info('[mount] /api (debug-email) mounted (non-production only)');
    } else {
        logger.info('[mount] /api (debug-email) disabled (production)');
    }

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

    app.use('/api/internal', internalBillingRouter);
    logger.info('[mount] /api/internal mounted');
    app.use('/api/payments', paymentsRouter);
    app.use('/api/payments/stripe', stripeCheckoutRouter);
    logger.info('[mount] /api/payments mounted');

    if (process.env.NODE_ENV !== 'production') {
        app.use('/api/payments', paymentsStubRouter);
        logger.info('[mount] /api/payments (stubs) mounted (non-production only)');
    } else {
        logger.info('[mount] /api/payments (stubs) disabled (production)');
    }

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
    app.use('/api/address', addressRouterImport);
    logger.info('[mount] /api/address mounted');
    app.use('/api/admin', adminChVerificationRouter);
    logger.info('[mount] /api/admin (ch-verification) mounted');

    app.use('/api/quiz', quizRouter);
    logger.info('[mount] /api/quiz mounted');

    app.use('/api/bff', bffMailScanRouter);
    logger.info('[mount] /api/bff (mail scan) mounted');

    if (process.env.NODE_ENV !== 'production') {
        app.use('/api', migrateRouter);
        logger.info('[mount] /api migration routes enabled (non-production only)');
        const whSecret = process.env.MIGRATE_WEBHOOK_SECRET?.trim();
        if (!whSecret || whSecret.length < 32) {
            logger.warn(
                '[mount] POST /api/webhook/migrate will return 401 until MIGRATE_WEBHOOK_SECRET is set (>=32 chars)'
            );
        }
    } else {
        logger.info('[mount] /api migration routes disabled (production)');
    }

    if (process.env.NODE_ENV !== 'production') {
        app.use(devRouter);
        logger.info('[dev] Dev routes enabled (non-production)');
    } else {
        logger.info('[dev] Dev routes disabled (production)');
    }

    app.use('/api/admin-audit', adminAuditRouter);
    logger.info('[mount] /api/admin-audit mounted (TS handler)');

    app.use('/api/admin-forward-audit', adminForwardAuditRouter);
    logger.info('[mount] /api/admin-forward-audit mounted (TS handler)');

    app.use('/api/admin-repair', adminRepairRouter);
    logger.info('[mount] /api/admin-repair mounted (TS handler)');

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

    app.use('/api/webhooks/onedrive', onedriveWebhook);
    logger.info('[mount] /api/webhooks/onedrive mounted');
    app.use('/api/webhooks-onedrive', (_req, res) => res.redirect(308, '/api/webhooks/onedrive'));
    logger.info('[mount] /api/webhooks-onedrive redirect mounted');

    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ ok: false, error: 'not_found' });
    });

    app.use(errorHandler);
    logger.info('[mount] Error handler middleware mounted');

    return app;
}
