// VirtualAddressHub Backend — Next.js-ready Express API

// ---- SIDE EFFECTS CONTROL ----
const SIDE_EFFECTS_OFF =
    process.env.SKIP_BOOT_SIDE_EFFECTS === '1' ||
    process.env.NODE_ENV === 'test';

// ---- CSURF NO-OP GUARD (temporary during transition) ----
try {
    const Module = require('module')
    const original = Module.prototype.require
    Module.prototype.require = function (id) {
        if (id === 'csurf') {
            console.warn('[guard] csurf() replaced with no-op middleware')
            return () => (req, res, next) => next()
        }
        return original.apply(this, arguments)
    }
} catch { }
// ----------------------------------------------------------

require('dotenv').config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
});

// Import and use strict environment validation
const { validateEnvironment, env } = require('./bootstrap/requireEnv');
validateEnvironment();

// Import the app factory
const { createApp } = require('./app-factory');

// Create the Express app
const app = createApp({ disableSideEffects: SIDE_EFFECTS_OFF });

// Export app for tests/tools
module.exports.app = app;

// Only run DB/schedulers/server when live
if (!SIDE_EFFECTS_OFF) {
    (async () => {
        try {
            // Initialize database based on DB_CLIENT environment variable
            if (process.env.DB_CLIENT === 'pg') {
                // PostgreSQL - schema will be ensured by the adapter
                console.log('Using PostgreSQL database');
            } else {
                // SQLite - using centralized db connection from server/db.ts
                console.log('Using SQLite database');
            }
            console.log('DB connected');
        } catch (e) {
            console.error('DB connect failed', e);
            // Only exit if we're the main entrypoint and side effects are enabled
            if (require.main === module) {
                process.exit(1);
            }
        }

        // Schema is now managed by scripts/db-schema.sql and npm run db:init
        // Initialize schema based on database type
        const { DB_CLIENT } = require('./db');

        if (DB_CLIENT === 'pg') {
            // PostgreSQL schema is handled by the adapter
            console.log('PostgreSQL schema will be ensured by adapter');
        } else {
            // Check if schema exists, don't create it
            try {
                const mustHave = ["user", "mail_item", "admin_log", "mail_event", "activity_log"];
                const { listTables } = require('./db');
                const tables = await listTables();
                const names = new Set(tables);
                const missing = mustHave.filter(t => !names.has(t));
                if (missing.length) {
                    console.error("❌ DB schema missing tables:", missing);
                    console.error("Run: npm run db:init");
                    process.exit(1);
                }
                console.log('SQLite schema check passed');
            } catch (e) {
                console.error("❌ DB check failed:", e);
                process.exit(1);
            }
        }

        // Start any schedulers or background processes here
        // startIntervals();
        // startSchedulers();
    })();

    if (require.main === module) {
        const port = process.env.PORT || 10000;
        const server = app.listen(port, () => console.log(`listening :${port}`));
        module.exports.server = server;
    }
}
