// VirtualAddressHub Backend — Next.js-ready Express API

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
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

// CORS middleware
import { corsMiddleware } from './cors';

// Database adapters
import { ensureSchema, selectOne, selectMany, execute, insertReturningId } from '../db/index';

// --- routes that need raw body (webhooks)
import sumsubWebhook from "./server/routes/webhooks-sumsub";
import profileRouter from "./server/routes/profile";

// --- cookie options helper
const { sessionCookieOptions, isSecureEnv } = require("../../lib/cookies");

// --- init
const app = express();
app.set("trust proxy", 1);

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

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Raw body for webhooks
app.use('/api/webhooks/onedrive', express.raw({ type: 'application/json' }));

// Database initialization
async function initializeDatabase() {
    try {
        if (process.env.DB_CLIENT === 'pg') {
            await ensureSchema();
            logger.info('PostgreSQL schema ensured');
        } else {
            logger.info('SQLite database ready');
        }
        logger.info('DB connected');
    } catch (e) {
        logger.error('DB connect failed', e);
        process.exit(1);
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

    // ---- Health check (must be synchronous/instant) ----
    app.get('/api/healthz', (_req, res) => {
        res.status(200).send('ok');
    });

    // Mount routes
    app.use('/api/profile', profileRouter);
    app.use('/api', sumsubWebhook);

    // Stub other routes to prevent crashes
    app.use('/api/admin-mail', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/admin-mail-bulk', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/admin-audit', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/webhooks-gc', (_req, res) => res.json({ ok: true, message: 'stub' }));
    app.use('/api/webhooks-postmark', (_req, res) => res.json({ ok: true, message: 'stub' }));
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

    // ---- Server bootstrap: bind to Render's PORT or fallback ----
    const rawPort = process.env.PORT || process.env.port || '8080';
    const PORT = Number(rawPort);
    const HOST = '0.0.0.0';

    const server = http.createServer(app);

    server.listen(PORT, HOST, () => {
        const env = process.env.NODE_ENV || 'development';
        const cors = process.env.CORS_ORIGINS || 'default';
        // Print extremely explicit diagnostics for Render logs:
        console.log('[boot] Render deployment:', process.env.RENDER_EXTERNAL_URL || '(unknown)');
        console.log('[boot] DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'missing');
        console.log('[boot] CORS origins:', cors);
        console.log(`[boot] listening on http://${HOST}:${PORT}`);
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
