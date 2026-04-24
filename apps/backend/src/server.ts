// VirtualAddressHub Backend — Next.js-ready Express API

import 'dotenv/config';
import http from 'http';
import winston from 'winston';

// Centralized environment config
import { HOST, PORT } from './config/env';
import { validateProductionConfigOrThrow } from './config/productionEnvValidation';
import { logGraphConfigAtStartup } from './config/azure';
import { logSumsubConfigAtStartup } from './lib/sumsubConfig';

// Database adapters
import { ensureSchema, getPool } from './server/db';
import { selectOne, selectMany, execute, insertReturningId } from './server/db-helpers';

import { stopForwardingLocksCleanup } from './server/routes/admin-forwarding-locks';
import { stopSelfTestScheduler } from './server/routes/ops-selftest';

// Import maintenance service
import { systemMaintenance } from './server/services/maintenance';

// App factory — all route mounting lives here
import { createApp } from './app';

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

const app = createApp();

// Database initialization
async function initializeDatabase() {
    try {
        logger.info('PostgreSQL will be initialized on first use');
        logger.info('DB connection will be established on first use');
    } catch (e) {
        logger.error('DB initialization warning:', e);
        logger.warn('Continuing without DB initialization - will retry on first use');
    }
}

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

    // ---- Global error handlers to prevent crashes ----
    process.on('unhandledRejection', (reason: unknown) => {
        const msg =
            reason && typeof reason === 'object' && 'message' in reason && typeof (reason as { message?: unknown }).message === 'string'
                ? String((reason as { message: string }).message)
                : String(reason);
        logger.error('[unhandledRejection]', { message: msg });
    });

    process.on('uncaughtException', (error: unknown) => {
        const msg =
            error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
                ? String((error as { message: string }).message)
                : String(error);
        logger.error('[uncaughtException]', { message: msg });
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

        if (env !== 'production') {
            logger.debug('[boot] app_base_url', { appBaseUrl: process.env.APP_BASE_URL || '(not set)' });
        }

        logGraphConfigAtStartup();
        logSumsubConfigAtStartup();
    });

    // ---- Graceful shutdown ----
    const shutdown = (signal: NodeJS.Signals) => {
        logger.info('[boot] shutdown_signal', { signal });
        try {
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

if (process.env.NODE_ENV !== 'test') {
    start().catch((err: unknown) => {
        const msg =
            err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
                ? String((err as { message: string }).message)
                : String(err);
        logger.error('[boot] fatal_start_error', { message: msg });
        process.exit(1);
    });
}

export default app;
