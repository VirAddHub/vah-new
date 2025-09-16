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
    console.log('[prestart] Postgres detected — skipping SQLite migrate/seed');
    // TODO: add PG migrator later (e.g. drizzle/knex/prisma)
}
