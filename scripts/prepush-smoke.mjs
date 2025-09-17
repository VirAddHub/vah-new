/* eslint-disable no-console */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PORT = process.env.SMOKE_PORT || '4010';
const ORIGIN = `http://127.0.0.1:${PORT}`;
const distEntry = path.join(process.cwd(), 'dist', 'server', 'index.js');

// Only run if we have a built server
if (!fs.existsSync(distEntry)) {
  console.log('[smoke] dist/server/index.js not found; skipping smoke (build first to enable).');
  process.exit(0);
}

console.log('[smoke] starting ephemeral backend…');

const child = spawn(
  process.execPath,
  [distEntry],
  {
    env: {
      ...process.env,
      // force a tiny, local, DB-less run
      NODE_ENV: 'development',
      PORT,
      DB_CLIENT: 'sqlite',
      DATABASE_URL: '', // ensure it won't try PG
      DEV_MODE: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  }
);

let alive = true;
const kill = () => {
  if (!alive) return;
  alive = false;
  try { process.kill(child.pid); } catch {}
};

child.stdout.on('data', (b) => {
  const s = b.toString();
  if (process.env.SMOKE_VERBOSE === '1') process.stdout.write(s);
});
child.stderr.on('data', (b) => {
  const s = b.toString();
  if (process.env.SMOKE_VERBOSE === '1') process.stderr.write(s);
});

process.on('exit', kill);
process.on('SIGINT', () => { kill(); process.exit(130); });
process.on('SIGTERM', () => { kill(); process.exit(143); });

async function waitForReady(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ORIGIN}/api/health`, { method: 'GET' });
      if (res.ok) {
        return true;
      }
    } catch {}
    await delay(500);
  }
  return false;
}

(async () => {
  const ready = await waitForReady();
  if (!ready) {
    kill();
    console.error('[smoke] backend did not become ready in time');
    process.exit(1);
  }

  console.log('[smoke] backend ready, hitting /api/health…');
  const r = await fetch(`${ORIGIN}/api/health`);
  if (!r.ok) {
    kill();
    console.error(`[smoke] health returned ${r.status}`);
    process.exit(1);
  }
  const json = await r.json().catch(() => ({}));
  if (!json.ok) {
    kill();
    console.error('[smoke] health payload not ok:', json);
    process.exit(1);
  }

  console.log(`[smoke] OK: ${JSON.stringify({ db: json.db, ok: json.ok })}`);
  kill();
  process.exit(0);
})().catch((e) => {
  kill();
  console.error('[smoke] error:', e?.message || e);
  process.exit(1);
});
