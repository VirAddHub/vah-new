# Production Deployment Checklist

## ✅ Do these now

### 1) Disable dev bypass

**ENV (prod):** `.env.production`

```dotenv
NODE_ENV=production
DEV_MODE=0
BASE_URL=https://your-domain
```

**Quick check**

```bash
# should be 401/403 now (no dev header allowed in prod)
curl -i https://your-domain/api/admin/mail-items -H "X-Dev-Admin: 1"
```

---

### 2) Real admin auth working (no test headers)

If you need to ensure an admin exists:

**SQLite (one-off)**

```bash
sqlite3 data/app.db "INSERT OR IGNORE INTO users(email,role) VALUES('admin@virtualaddresshub.co.uk','admin');"
```

**Postgres (one-off)**

```bash
psql "$DATABASE_URL" -c "INSERT INTO users(email,role) VALUES('admin@virtualaddresshub.co.uk','admin') ON CONFLICT DO NOTHING;"
```

**Manual QA**

* Log in via the real login flow.
* Hit an admin route in browser (no `X-Dev-Admin`).

---

### 3) Secrets set (env)

**ENV (prod):** `.env.production`

```dotenv
# Mail
POSTMARK_SERVER_TOKEN=...
POSTMARK_FROM=hello@virtualaddresshub.co.uk

# OneDrive webhook verification
ONEDRIVE_WEBHOOK_SECRET=...

# Payments
GO_CARDLESS_ACCESS_TOKEN=...
GO_CARDLESS_WEBHOOK_SECRET=...

# KYC
SUMSUB_APP_TOKEN=...
SUMSUB_SECRET_KEY=...

# App
BASE_URL=https://your-domain
SESSION_COOKIE_SECURE=1
SESSION_COOKIE_SAMESITE=lax
```

---

### 4) Cookies / CSRF hardened

**EDIT:** `server/server.js` (or wherever Express is configured)

```js
const helmet = require("helmet");
app.set("trust proxy", 1); // behind HTTPS proxy (nginx, load balancer)
app.use(helmet({
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
}));
```

**Session & CSRF config (example):**

```js
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  domain: "your-domain", // optional if needed
};
app.use(require("cookie-parser")());
/* your session middleware here using cookieOpts */
```

**Reverse proxy (nginx) snippet**

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain;

  # HSTS (already via helmet; duplicating here is OK)
  add_header Strict-Transport-Security "max-age=15552000; includeSubDomains; preload" always;

  location / {
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
    proxy_pass http://127.0.0.1:4000;
  }
}
```

---

### 5) One Node process only (SQLite = single writer)

**Option A — PM2 (single instance)**

```bash
npm i -g pm2
pm2 start server.js --name vah --update-env -- \
  && pm2 save
# verify single instance:
pm2 list
```

**Option B — systemd**

```
[Unit]
Description=VirtualAddressHub
After=network.target

[Service]
Environment=NODE_ENV=production
WorkingDirectory=/srv/vah
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
User=www-data

[Install]
WantedBy=multi-user.target
```

---

### 6) Init DB + integrity on the prod box

```bash
NODE_ENV=production npm run db:init
NODE_ENV=production npm run db:integrity
```

Expected: integrity script exits **0** with a success message.

---

### 7) SPF / DKIM / DMARC green (Postmark)

* In Postmark dashboard → **Sender Signatures / Domains**
* Add **DKIM** (CNAME/TXT) & **Return-Path** if prompted
* SPF: add/merge the TXT record shown in Postmark UI for your root domain
  *(Use the exact values shown by Postmark — DNS hosts differ.)*
* DMARC (recommended baseline):

```
Host: _dmarc.your-domain
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@your-domain; fo=1; adkim=s; aspf=s
```

* Wait for DNS to propagate; Postmark should show **Verified/Aligned**.

---

## 🚀 Start (prod, single instance)

```bash
NODE_ENV=production npm ci
NODE_ENV=production npm run build
NODE_ENV=production npm run db:init
NODE_ENV=production npm run db:integrity
NODE_ENV=production PORT=4000 node server.js
```

---

## 🔎 Production smoke (real auth)

```bash
# 1) Create mail item (real admin token/session)
curl -s -X POST https://your-domain/api/admin/mail-items \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: PROD-$(date +%y%m%d)-0001" \
  -d '{"user_id":1,"subject":"HMRC PAYE","sender_name":"HMRC","received_date":"'$(date +%F)'","tag":"HMRC"}' | jq

# 2) Try mark scanned BEFORE attach -> expect 409
curl -s -X PUT https://your-domain/api/admin/mail-items/<ID> \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"scanned"}' | jq

# 3) Attach via your real OneDrive webhook (with HMAC) or admin attach tool

# 4) Mark scanned -> 200
# 5) Issue scan URL -> first open 200, second 410
```

---

## 🩹 Rollback (SQLite)

```bash
# stop server
cp data/app.db data/app.db.broken.$(date +%F-%H%M)
cp backups/app-YYYY-MM-DD.db data/app.db
NODE_ENV=production PORT=4000 node server.js
```

---

# PG Flip (Staging → Prod)

**Goal:** validate our code on Postgres with zero route rewrites.

## A) Spin up PG locally/staging

```bash
docker run --name vah-pg -e POSTGRES_PASSWORD=vah -e POSTGRES_USER=vah -e POSTGRES_DB=vah -p 5432:5432 -d postgres:16
```

## B) Apply PG schema

**CREATE:** `scripts/schema.pg.sql` (from earlier message—users, mail_items, scan_tokens, mail_audit, admin_log, mail_event)

```bash
psql "postgresql://vah:vah@localhost:5432/vah" -f scripts/schema.pg.sql
psql "postgresql://vah:vah@localhost:5432/vah" -c "INSERT INTO users(email,role) VALUES('admin@virtualaddresshub.co.uk','admin') ON CONFLICT DO NOTHING;"
```

## C) Switch app to PG (staging)

**ENV**

```dotenv
DB_VENDOR=pg
DATABASE_URL=$1***:***@$3
```

**Adapter import (one line per file)**

```diff
- const { db } = require("./server/db");
+ const { db } = require("./server/dbx");  // adapter: PG or SQLite by env
```

> (Use the `server/dbx.js` adapter from earlier; it maps `prepare().get/all/run` + `transaction()` to PG.)

## D) Run same smoke vs PG

```bash
npm run smoke
```

**Pass = PG-ready.**
If you hit differences, fix SQL edge cases:

* `datetime('now')` → `NOW()`
* `json('{"..."}')` → `'<json>'::jsonb`
* `INSERT OR IGNORE` → `INSERT ... ON CONFLICT DO NOTHING`
* `last_insert_rowid()` → `RETURNING id`

## E) Cutover plan

* Set `DB_VENDOR=pg` + real `DATABASE_URL` in prod
* Run `schema.pg.sql` on managed PG
* Migrate any existing data (SQLite → PG) when ready
* Start app (single or multiple instances OK on PG)

---

## Database Management

```bash
# Check integrity
npm run db:integrity

# Rebuild if corrupted
npm run db:rebuild

# Purge FTS remnants (if any)
npm run db:fts:purge

# Full reset (development only)
npm run db:reset
```

## Monitoring Endpoints

- `GET /api/health` - Health check
- `GET /__status` - Detailed status
- `GET /api/search/mail?q=term` - Search mail items
- `GET /api/mail-items/:id/scan-url` - Generate scan URL
- `GET /api/scans/:token` - Consume scan URL

## Security Notes

- All admin routes require authentication
- CSRF protection enabled
- OneDrive webhook HMAC verification
- Rate limiting on sensitive endpoints
- Single-use scan URLs with 15-minute expiration
