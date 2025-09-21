/* eslint-disable no-console */
const { execSync } = require('child_process');

if (!process.env.DATABASE_URL) {
    console.error('[prestart] DATABASE_URL is required for PostgreSQL-only mode');
    process.exit(1);
}

console.log('[prestart] DB: postgres');
console.log('[prestart] running PostgreSQL migrate + seed');

try {
    execSync('node scripts/migrate-pg.cjs', { stdio: 'inherit' });
    console.log('[prestart] PostgreSQL migration completed');
} catch (err) {
    console.error('[prestart] PostgreSQL migration failed:', err.message);
    process.exit(1);
}

// Optional: run PG seed for basic data (skip in production)
if (process.env.NODE_ENV !== 'production' && process.env.SEED !== 'false') {
    try {
        execSync('node scripts/seed-pg.cjs', { stdio: 'inherit' });
        console.log('[prestart] PostgreSQL seed completed (non-production)');
    } catch (err) {
        console.warn('[prestart] PG seed failed (non-critical):', err.message);
    }
} else {
    console.log('[prestart] Skipping seed in production');
}
