# Local environment (dummy data only)

Runs the API and the site on your own machine against a local Postgres. Nothing here talks to Render, Vercel,
the production database or any live provider. Every credential in `*.env.example` is a dummy.

## First run

```bash
npm ci                                     # install dependencies (Node 20 recommended)
npm run local:db                           # start Postgres 16 in Docker on 127.0.0.1:5433
npm run local:setup -- --demo-customer     # env files, database built from the migrations, dummy seed data
npm run local:start                        # API on :4000, site on :3000 (Ctrl+C stops both)
```

No Docker? Any local Postgres works: create nothing by hand, just set `DATABASE_URL` in `local/backend.env`
to `postgres://<user>:<password>@127.0.0.1:<port>/vah_local` and run `npm run local:setup`.
`psql` must be on your PATH for setup.

## Dummy accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@example.test` | `Local!Admin#2026` | Log in at `/admin/login` |
| Customer | `demo.customer@example.test` | `Local!Customer#2026` | Only with `--demo-customer`. **Activated directly in the database**: a workaround, because the app cannot yet activate an account after payment (Phase 1 fixes this) |

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

## Known limitations at the end of Phase 0

- **The database is built from the migrations** (`apps/backend/scripts/baseline/000_baseline.sql` on an empty database, then the forward migrations). The baseline is a reconstruction that has not been compared with production: see `audit/SCHEMA-ASSUMPTIONS.md`.
- **Rate limits are on.** The current limits are tight (30 auth requests per 15 minutes per IP, 200 per user);
  heavy clicking can hit them. Uncomment `DISABLE_RATE_LIMIT=1` in `local/backend.env` if needed, and note that
  any result obtained that way is provisional.
- Email, Companies House, address lookup, OneDrive and Sumsub's live widget are not configured. Stripe needs
  your own **test-mode** keys in `local/backend.env` for a real checkout.

## Tests

With the app running (`npm run local:start`), from the project root:

```bash
node apps/backend/tests/journey/journey.mjs        # the customer journey, signup to admin dispatch
node apps/backend/tests/journey/stripe-events.mjs  # duplicates, retries, ordering, renewal, cancellation
node apps/backend/tests/journey/rate-limits.mjs    # run last: exhausts the failed-login allowance
```

All run on the migration-built database with rate limits on and no manual account activation.
They are MOCK tests: Stripe and Sumsub events are built and signed locally. A real Stripe
test-mode payment and the live Sumsub widget are separate provider-sandbox checks.
