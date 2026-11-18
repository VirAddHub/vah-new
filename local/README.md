# Local environment (dummy data only)

Runs the API and the site on your own machine against a local Postgres. Nothing here talks to Render, Vercel,
the production database or any live provider. Every credential in `*.env.example` is a dummy.

## First run

```bash
npm ci                                     # install dependencies (Node 20 recommended)
npm run local:db                           # start Postgres 16 in Docker on 127.0.0.1:5433
npm run local:setup -- --demo-customer     # env files, database built from the migrations, dummy seed data
npm run local:start                        # API :4000, site :3000, dummy scans :4020 (Ctrl+C stops all)
npm run local:states                       # optional, second terminal: one customer per account state
```

No Docker? Any local Postgres works: create nothing by hand, just set `DATABASE_URL` in `local/backend.env`
to `postgres://<user>:<password>@127.0.0.1:<port>/vah_local` and run `npm run local:setup`.
`psql` must be on your PATH for setup.

## Dummy accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@example.test` | `Local!Admin#2026` | Log in at `/admin/login` |
| Customer | `demo.customer@example.test` | `Local!Customer#2026` | Only with `--demo-customer`. Seeded straight into the database as paid, identity not yet verified. For realistic accounts use the state accounts below |

`npm run local:states` creates these through the real API (signup, mocked Stripe and Sumsub events, admin
actions), each with dummy mail. Password for all: `Journey!Passw0rd#1`. Re-running keeps existing ones.

| Email | State |
|---|---|
| `ui.unpaid@example.test` | Signed up, not paid |
| `ui.paid@example.test` | Paid, identity not verified |
| `ui.full@example.test` | Paid and verified: full service, mail with scans |
| `ui.owners@example.test` | Paid and verified, other company owners still to verify |
| `ui.overdue@example.test` | Payment overdue (restricted) |
| `ui.ending@example.test` | Cancelled at period end, still active |
| `ui.cancelled@example.test` | Subscription ended (restricted) |
| `ui.suspended@example.test` | Suspended by admin (restricted) |
| `ui.restored@example.test` | Suspended then restored: full service |
| `ui.closed@example.test` | Closed: sign-in refused |

Restricted accounts see only a generic "mail is waiting" notice, never mail details.

## Commands

| Command | What it does |
|---|---|
| `npm run local:db` | Starts the Postgres container (`local/docker-compose.yml`) |
| `npm run local:setup` | Creates `local/backend.env` and `local/frontend.env` if missing, creates the `vah_local` database, runs the migrations, seeds plans and the admin. Safe to re-run |
| `npm run local:setup -- --reset` | Drops and recreates `vah_local` first |
| `npm run local:start` | Builds the backend if needed and starts both servers. `REBUILD=1 npm run local:start` forces a rebuild |

Logs are written to `local/logs/`.

## Safety guards (`local/guard.sh`)

The scripts refuse to run if the database host is not `localhost`/`127.0.0.1`, if the database name does not
start with `vah_local`, if a live Stripe key (`sk_live_`) is set, if `NODE_ENV=production`, or if a Postmark
token is present (local runs do not send email). `local/backend.env` and `local/frontend.env` are git-ignored.

## Known limitations

- **The database is built from the migrations** (`apps/backend/scripts/baseline/000_baseline.sql` on an empty database, then the forward migrations). The baseline is a reconstruction that has not been compared with production: see `audit/SCHEMA-ASSUMPTIONS.md`.
- **Rate limits and sign-in throttling are on** (see `audit/RATE-LIMITS.md`). Five wrong passwords lock that
  account for 15 minutes from that browser; the admin Users screen can unlock it.
- Email, Companies House, address lookup, OneDrive and Sumsub's live widget are not configured. Stripe needs
  your own **test-mode** keys in `local/backend.env` for a real checkout.

## Tests

With the app running (`npm run local:start`), from the project root:

```bash
npm run test:journey    # journey, stripe-events, admin-ops, access-control, login-throttle, rate-limits
npm test                # backend unit and integration tests (uses its own vah_unit_test database)
```

`rate-limits` runs last because it exhausts the local allowance; restart `local:start` afterwards.

All run on the migration-built database with rate limits on and no manual account activation.
They are MOCK tests: Stripe and Sumsub events are built and signed locally. A real Stripe
test-mode payment and the live Sumsub widget are separate provider-sandbox checks.
