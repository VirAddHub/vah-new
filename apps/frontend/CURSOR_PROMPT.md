# Cursor Prompt — VAH Infra + Stability Guardrails

## Context

You are working on the **Virtual Address Hub** app. All code must target the **real cloud infra**—no local mocks, no SQLite, no localhost.

## Infrastructure (Authoritative)

* **Backend (Render):** `https://vah-api-staging.onrender.com`
* **Database (Render Postgres, Frankfurt):**
  `postgresql://vah_postgres_user:***@dpg-d2vikgnfte5s73c5nv80-a.frankfurt-postgres.render.com/vah_postgres`
* **Frontend (Vercel):** `https://vah-frontend-final.vercel.app`

## Non-Negotiables (Always enforce)

* 🚫 **No `localhost`** URLs in code, config, tests, or examples.
* 🚫 **No SQLite**. Use **PostgreSQL** for all persistence.
* 🚫 **No mock DBs**. Hit the real Render Postgres (via env `DATABASE_URL`).
* ✅ Use **Render + Vercel** deploys and environment variables only.

## CORS & Proxy

* Backend must use **centralized CORS middleware** (no per-route CORS headers).
* Allowed origins (env `CORS_ORIGINS`):
  `https://vah-frontend-final.vercel.app,http://localhost:3000`
* Frontend proxy must pass through cookies and set:

  * `x-proxy-target` (diagnostic)
  * `x-proxy-missing-origin: 1` when `BACKEND_API_ORIGIN` is unset
* Add `/api/_diag/env` route in the frontend to return `{ vercelEnv, backendOrigin, timestamp }`.

## Sessions (Critical — implement/keep)

Replace any memory session store with **PostgreSQL sessions** using `connect-pg-simple`.

**Backend session config (Express):**

```ts
// server/sessions.ts (example)
import session from 'express-session';
import pgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

const PgSession = pgSimple(session);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const sessions = session({
  name: 'sid',
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  },
});
```

**In `server/index.*`:**

```ts
import { sessions } from './sessions';
app.use(sessions); // must be registered BEFORE routes
```

## CORS (Centralized)

```ts
// server/cors.ts
import cors from 'cors';

export function makeCors() {
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.length === 0) return cb(null, true);
      cb(null, allowed.includes(origin));
    },
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });
}
```

**In `server/index.*` (before routes):**

```ts
import { makeCors } from './cors';
app.use(makeCors());
```

**Remove/guard any manual CORS headers**. If any remain, only set `Access-Control-Allow-Origin` when a valid origin exists.

## Observability & Safety Nets

* **Print routes at boot** (after all `app.use` mounts; before `listen`).
* **404 telemetry**: warn when unmatched routes are hit.
* **Legacy router** (temporary): mount missing endpoints while migrating to domain routers.

## Frontend Auth Loop Guard

* Middleware must **skip** `/api/*`, `/_next/*`, static assets.
* Only **one** `/api/auth/whoami` call at boot (single-flight guard).
* Prevent **double form submits** on login.

## Environment Variables (Render/Vercel)

**Render (backend):**

```
DATABASE_URL=postgres://...
SESSION_SECRET=<strong random>
JWT_SECRET=<strong random>
CORS_ORIGINS=https://vah-frontend-final.vercel.app,http://localhost:3000
```

**Vercel (frontend):**

```
BACKEND_API_ORIGIN=https://vah-api-staging.onrender.com
```

## Acceptance Tests (Run after changes)

1. **CORS + Login (direct to backend)**

```bash
# Preflight
curl -i -X OPTIONS 'https://vah-api-staging.onrender.com/api/auth/login' \
  -H 'origin: https://vah-frontend-final.vercel.app' \
  -H 'access-control-request-method: POST' \
  -H 'access-control-request-headers: content-type'

# Login — expect 200/401, never 500
curl -i 'https://vah-api-staging.onrender.com/api/auth/login' \
  -H 'origin: https://vah-frontend-final.vercel.app' \
  -H 'content-type: application/json' \
  --data '{"email":"admin@virtualaddresshub.co.uk","password":"AdminPass123!"}'
```

**Expect:** `access-control-allow-origin` set, `allow-credentials: true`, `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=None`.

2. **Frontend diag**

```bash
curl -s https://<preview>.vercel.app/api/_diag/env | jq
```

**Expect:** `backendOrigin === "https://vah-api-staging.onrender.com"`

3. **Proxy header check (via preview)**

* Response headers include `x-proxy-target: https://vah-api-staging.onrender.com/api/auth/login`.

4. **Mounted routes printed at boot**; investigate any `[404] METHOD /api/...` logs.

5. **Loop check**

* Visiting `/login` and submitting once triggers at most **one** `/api/auth/whoami`.

## Code Quality Gates

* No `localhost`, SQLite, or mock DB usage.
* TypeScript union responses must use type guards (`isOk`) before accessing `data` or `message`.
* Errors bubble via centralized error middleware.

---

Use this prompt for all backend/frontend edits in Cursor.
