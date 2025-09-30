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
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import joi from 'joi';
import { body, query, param, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import http from 'http';
import type { Request, Response, NextFunction } from 'express';

// Centralized environment config
import { HOST, PORT } from './config/env';

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
import profileRouter from "./server/routes/profile";
import publicPlansRouter from "./server/routes/public/plans";
import debugEmailRouter from "./server/routes/debug-email";
import devRouter from "./server/routes/dev";
import passwordResetRouter from "./server/routes/password-reset";
import { passwordResetRouter as profilePasswordResetRouter } from "./server/routes/profile.password-reset";
import passwordResetRouterV2 from "./server/routes/profile/password-reset";
import robustPasswordResetRouter from "./server/routes/profile/reset-password-request";

// --- cookie options helper
const { sessionCookieOptions, isSecureEnv } = require("./lib/cookies");

// --- init
const app = express();
app.set("trust proxy", 1);

// ---- Health routes FIRST (before helmet/cors/anything else) ----
app.use('/api', health);

// security + CORS (must be before routes)
app.use(helmet());

// Strict CORS allowlisting
app.use(corsMiddleware);

// cookies must come before any access to req.cookies
app.use(cookieParser());

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
const csrfProtection = (req: any, res: any, next: any) => {
    // Skip CSRF for webhooks and API routes that don't change state
    if (req.path.startsWith('/api/webhooks/') ||
        req.path.startsWith('/api/metrics') ||
        req.method === 'GET') {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
};

// ---- Health routes already mounted above (before helmet/cors) ----

// Rate limiting (IPv6-safe with health check exemption)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
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

// Global parsers for the whole app (safe)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database initialization
async function initializeDatabase() {
    try {
        if (process.env.DB_CLIENT === 'pg') {
            // Don't initialize DB at startup - make it lazy
            logger.info('PostgreSQL will be initialized on first use');
        } else {
            logger.info('SQLite database ready');
        }
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
            if (has) console.warn('[warn] dist still references storage_expires_at; rebuild needed');
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

    // Mount Postmark webhook FIRST with raw parser (before other routes)
    app.post('/api/webhooks-postmark', express.raw({ type: 'application/json' }), postmarkWebhook);

    // Mount other routes
    app.use('/api/profile', profileRouter);
    app.use(robustPasswordResetRouter); // Mount robust password reset FIRST
    app.use('/api/profile', profilePasswordResetRouter);
    app.use('/api/profile', passwordResetRouterV2(getPool()));
    app.use('/api', sumsubWebhook);
    app.use('/api', publicPlansRouter);
    app.use('/api', debugEmailRouter);
    app.use('/api', passwordResetRouter);

    // Dev routes (staging/local only) - disabled in production for security
    if (process.env.NODE_ENV !== 'production') {
        app.use(devRouter);
        logger.info('🔧 Dev routes enabled (non-production)');
    } else {
        logger.info('🔒 Dev routes disabled (production)');
    }

    // Stub other routes to prevent crashes
    app.use('/api/admin-mail', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/admin-mail-bulk', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/admin-audit', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/webhooks-gc', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/webhooks-onedrive', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/email-prefs', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/gdpr-export', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/downloads', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/notifications', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/mail-search', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/files', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/mail-forward', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/admin-repair', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/admin-forward-audit', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/debug', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/metrics', (_req, res) => res.json({ ok: true, message: 'stub' }));

    // ---- Global error handlers to prevent crashes ----
    process.on("unhandledRejection", (reason) => {
        console.error("[unhandledRejection]", reason);
    });

    process.on("uncaughtException", (error) => {
        console.error("[uncaughtException]", error);
        // Don't exit - let the platform restart if truly fatal
    });

    // ---- Server bootstrap: bind to Render's PORT or fallback ----
    const server = http.createServer(app);

    server.listen(PORT, HOST, () => {
        const env = process.env.NODE_ENV || 'development';
        const cors = process.env.CORS_ORIGINS || 'default';
        // Print extremely explicit diagnostics for Render logs:
        console.log('[boot] Render deployment:', process.env.RENDER_EXTERNAL_URL || '(unknown)');
        console.log('[boot] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'missing');
        console.log('[boot] CORS origins:', cors);
        console.log(`[start] backend listening at http://${HOST}:${PORT}`);
        console.log('[boot] health check:', '/api/healthz');
        console.log('[boot] NODE_ENV:', env);
    });

    // ---- Graceful shutdown (prevents crash loops) ----
    const shutdown = (signal: NodeJS.Signals) => {
        console.log(`[boot] received ${signal}, shutting down...`);
        server.close(err => {
            if (err) {
                console.error('[boot] error during server.close:', err);
                process.exit(1);
            }
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

start().catch(err => {
    console.error(err);
    process.exit(1);
});

export default app;
