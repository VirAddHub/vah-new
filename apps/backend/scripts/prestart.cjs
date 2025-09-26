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

// --- stale-build guard (precise patterns, no regex syntax errors) ---
const fs = require('fs');
const path = require('path');

function scanDistForOldSQL(distDir = 'dist') {
  const offenders = [];
  const patterns = [
    /COALESCE\(storage_expires_at/i,          // literal "(" must be single-escaped in regex literal
    /\bSELECT[^\n;]*storage_expires_at/i,
    /\bWHERE[^\n;]*storage_expires_at/i,
  ];

  function walk(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(p)) walk(path.join(p, name));
    } else if (stat.isFile() && (p.endsWith('.js') || p.endsWith('.mjs'))) {
      const src = fs.readFileSync(p, 'utf8');
      const hit = patterns.find((re) => re.test(src));
      if (hit) offenders.push(p);
    }
  }

  if (fs.existsSync(distDir)) walk(distDir);
  return offenders;
}

const offenders = scanDistForOldSQL('dist');
if (offenders.length > 0) {
  console.error('[prestart] stale dist: SQL references to storage_expires_at detected in:');
  offenders.slice(0, 10).forEach(f => console.error('  -', f));
  console.error('[prestart] continuing boot because compat column is ensured; update Render Start Command to `npm run start`.');
} else {
  console.log('[prestart] ✅ dist build verified clean');
}
// --- end stale-build guard ---
