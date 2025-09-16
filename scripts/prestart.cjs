/* eslint-disable no-console */
const { execSync } = require('child_process');
const { dbKind } = require('./lib/db-kind.cjs');

const kind = dbKind();
console.log('[prestart] DB kind:', kind);

if (kind === 'sqlite') {
    console.log('[prestart] running SQLite migrate + seed');
    execSync('node scripts/migrate-sqlite.cjs', { stdio: 'inherit' });
    execSync('node scripts/seed.cjs', { stdio: 'inherit' });
} else {
    console.log('[prestart] Postgres detected — running PG migrate');
    execSync('node scripts/migrate-pg.cjs', { stdio: 'inherit' });
    // Optional: run PG seed for basic data
    try {
        execSync('node scripts/seed-pg.cjs', { stdio: 'inherit' });
    } catch (err) {
        console.warn('[prestart] PG seed failed (non-critical):', err.message);
    }
}
