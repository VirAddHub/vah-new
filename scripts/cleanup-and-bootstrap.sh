#!/usr/bin/env bash
set -euo pipefail

echo "==> Repo cleanup & bootstrap starting…"

# 0) Guard rails
if ! command -v node >/dev/null 2>&1; then
  echo "Node is required. Aborting."
  exit 1
fi

mkdir -p scripts backups data server server/routes

# 1) Safety branch + DB backup
git rev-parse --is-inside-work-tree >/dev/null 2>&1 && {
  git checkout -b chore/repo-cleanup || true
  git tag -f pre-cleanup-$(date +%Y%m%d-%H%M) || true
} || true

if [ -f data/app.db ]; then
  cp -v data/app.db "backups/app-pre-cleanup-$(date +%Y%m%d-%H%M).db" || true
fi

# 2) .gitignore (safe overwrite)
cat > .gitignore << 'EOF'
# Node & Next
node_modules/
.npmrc
.next/
out/
dist/
coverage/
*.log
logs/
.cache/

# Env & secrets
.env*
!.env.example
!.env.production.example
env.production.example

# DB & backups
data/*.db
data/*.db-*
data/*.db-journal
data/*.sqlite
backups/

# OS/editor
.DS_Store
Thumbs.db
.vscode/
.idea/
EOF

# 3) Ensure env templates exist (do not touch your real .env files)
[ -f .env.example ] || cat > .env.example << 'EOF'
# Common (dev)
BASE_URL=http://localhost:3000
POSTMARK_TOKEN=
POSTMARK_FROM=hello@virtualaddresshub.co.uk
ONEDRIVE_WEBHOOK_SECRET=
GO_CARDLESS_TOKEN=
SUMSUB_TOKEN=
SESSION_COOKIE_SECURE=0
SESSION_COOKIE_SAMESITE=lax
DEV_MODE=1
DB_VENDOR=sqlite
EOF

[ -f env.production.example ] || cat > env.production.example << 'EOF'
# Production
NODE_ENV=production
DEV_MODE=0
BASE_URL=https://your-domain
POSTMARK_TOKEN=***
POSTMARK_FROM=hello@virtualaddresshub.co.uk
ONEDRIVE_WEBHOOK_SECRET=***
GO_CARDLESS_TOKEN=***
SUMSUB_TOKEN=***
SESSION_COOKIE_SECURE=1
SESSION_COOKIE_SAMESITE=lax
DB_VENDOR=sqlite   # set to 'pg' when migrating to Postgres
EOF

# 4) Make sure backend entry is server/index.js, but keep legacy shim to avoid breakages
if [ -f server.js ] && [ ! -f server/index.js ]; then
  mkdir -p server
  git mv server.js server/index.js 2>/dev/null || mv server.js server/index.js
fi

# Always provide a compatibility shim at project root
cat > server.js <<'EOF'
/** Compat shim: keep legacy imports working */
module.exports = require('./server/index.js');
EOF

# 5) Ensure DB adapter exists; prefer using server/dbx.js everywhere
# If you have server/dbx.js already, we'll unify imports to it. Otherwise, create a minimal adapter.
if [ ! -f server/dbx.js ]; then
  cat > server/dbx.js <<'EOF'
/**
 * Minimal DB adapter (SQLite by default).
 * Switch to Postgres later by setting DB_VENDOR=pg and wiring pg Pool here.
 */
const path = require('path');
const Database = require('better-sqlite3');

const vendor = (process.env.DB_VENDOR || 'sqlite').toLowerCase();

let db;
if (vendor === 'sqlite') {
  const dbPath = path.join(__dirname, '..', 'data', 'app.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
} else {
  throw new Error('Postgres adapter not wired yet. Set DB_VENDOR=sqlite or implement PG Pool here.');
}

module.exports = { db, vendor };
EOF
fi

# 6) Unify any lingering imports from ./server/db to ./server/dbx (non-destructive)
# macOS sed requires backup suffix; Linux sed works with -i
if sed --version >/dev/null 2>&1; then SED_INPLACE=( -i ); else SED_INPLACE=( -i '' ); fi

grep -RIl "require(['\"]\\.?\\/server\\/db['\"])" . 2>/dev/null | while read -r f; do
  sed "${SED_INPLACE[@]}" "s#require(['\"]\\.?\\/server\\/db['\"])#require('./server/dbx')#g" "$f" || true
done

grep -RIl "from ['\"]\\.?\\/server\\/db['\"]" . 2>/dev/null | while read -r f; do
  sed "${SED_INPLACE[@]}" "s#from ['\"]\\.?\\/server\\/db['\"]#from './server/dbx'#g" "$f" || true
done

# 7) Keep routes compatibility: if a legacy /routes import exists, add a passthrough
if [ -d routes ] && [ ! -f routes/index.js ]; then
  cat > routes/index.js <<'EOF'
/** Compat: forward to server/routes */
module.exports = require('../server/routes');
EOF
fi

# 8) Ensure PM2 ecosystem references server/index.js (create if missing)
[ -f ecosystem.config.js ] || cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    { name: "vah-api", script: "server/index.js", env: { NODE_ENV: "production", PORT: 4000 } },
    { name: "vah-web", script: "node_modules/next/dist/bin/next", args: "start -p 3000", env: { NODE_ENV: "production" } }
  ]
}
EOF

# 9) Nginx template (create if missing)
[ -f nginx.conf.template ] || cat > nginx.conf.template <<'EOF'
server {
  listen 80;
  server_name your-domain;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl http2;
  server_name your-domain;

  # ssl_certificate ...; ssl_certificate_key ...;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }
}
EOF

# 10) Health check route (optional but handy) – only if not present
if ! grep -R "/api/health" -n server 2>/dev/null | grep -q .; then
  mkdir -p server/routes
  cat > server/routes/health.js <<'EOF'
const express = require('express');
const router = express.Router();
router.get('/health', (req, res) => res.status(200).json({ ok: true, ts: new Date().toISOString() }));
module.exports = router;
EOF
  # Try to auto-mount in server/index.js if Express structure is standard
  if [ -f server/index.js ] && ! grep -q "server/routes/health" server/index.js; then
    node - "$@" <<'NODE'
const fs = require('fs');
const p = 'server/index.js';
let s = fs.readFileSync(p, 'utf8');
if (!s.includes("require('./routes/health')")) {
  // naive injection just before module.exports or app.listen
  s = s.replace(/(app\.use\(.*\);\s*)?(\n?\/\/\s*ROUTES END|\n*module\.exports|\n*app\.listen)/m,
    `\nconst health = require('./routes/health');\napp.use('/api', health);\n$2`);
  fs.writeFileSync(p, s, 'utf8');
  console.log('Mounted /api/health');
}
NODE
  fi
fi

# 11) package.json scripts (idempotent add/update)
node - <<'NODE'
const fs = require('fs');
const pkgPath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts ||= {};
pkg.scripts["dev"] = pkg.scripts["dev"] || "next dev";
pkg.scripts["build"] = "next build";
pkg.scripts["start:web"] = "next start -p 3000";
pkg.scripts["start:api"] = "NODE_ENV=production node server/index.js";
pkg.scripts["start:prod"] = pkg.scripts["start:prod"] || "concurrently -n web,api -c green,blue \"npm run start:web\" \"npm run start:api\"";
pkg.scripts["db:init"] = pkg.scripts["db:init"] || "node scripts/db-init.cjs";
pkg.scripts["db:integrity"] = pkg.scripts["db:integrity"] || "node scripts/db-integrity.cjs";
pkg.scripts["db:reset"] = pkg.scripts["db:reset"] || "node scripts/db-reset.cjs";
pkg.scripts["db:rebuild"] = pkg.scripts["db:rebuild"] || "node scripts/db-rebuild.cjs";
pkg.scripts["smoke"] = pkg.scripts["smoke"] || "node scripts/smoke-e2e.mjs";
pkg.scripts["smoke:prod"] = pkg.scripts["smoke:prod"] || "node scripts/smoke-production.mjs";
pkg.scripts["deploy:check"] = "npm run db:integrity";
pkg.scripts["deploy:full"] = "npm run build && npm run db:init && npm run db:integrity";
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('package.json scripts updated');
NODE

# 12) Ensure concurrently exists for start:prod
if ! npx --yes concurrently -v >/dev/null 2>&1; then
  npm i -D concurrently
fi

# 13) Build + DB init + integrity
npm ci
npm run build
npm run db:init
npm run db:integrity

# 14) Commit changes
git add -A || true
git commit -m "chore(repo): cleanup, compat shims, unified db adapter, scripts updated" || true

echo "==> Cleanup & bootstrap complete."
echo "Next steps:"
echo "  npm run start:prod   # web:3000 api:4000"
echo "  curl -s http://localhost:4000/api/health | jq"
