/* eslint-disable no-console */
const { execSync, spawnSync } = require('child_process');

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

// Run schema repair after migrations
console.log('[prestart] running schema repair');
const r = spawnSync('node', ['scripts/repair-pg.cjs'], { stdio: 'inherit' });
if (r.status !== 0) {
    console.error('[prestart] schema repair failed');
    process.exit(r.status || 1);
}

// Guard against stale builds that still reference storage_expires_at in SQL
const fs = require('fs');
if (fs.existsSync('dist')) {
    const js = fs.readFileSync('dist/server/index.js', 'utf8');
    // Check for SQL patterns that indicate hardcoded references
    const sqlPatterns = [
        'COALESCE(storage_expires_at',
        'DROP INDEX export_job_storage_expires_idx',
        'storage_expires_at BETWEEN',
        'SELECT.*storage_expires_at',
        'WHERE.*storage_expires_at'
    ];

    const hasStaleRefs = sqlPatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(js);
    });

    if (hasStaleRefs) {
        console.error('[prestart] stale dist: contains hardcoded storage_expires_at SQL patterns — run a clean build');
        process.exit(1);
    }
    console.log('[prestart] ✅ dist build verified clean');
}
