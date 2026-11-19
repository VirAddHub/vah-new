# VirtualAddressHub

UK virtual business address and mail-handling service: public website, customer dashboard and admin.
npm workspaces monorepo (Node 20).

## Repository map

| Path | What lives there |
|---|---|
| `apps/frontend/` | Website, customer dashboard and admin (Next.js 15, App Router) |
| `apps/frontend/app/` | Pages and routes. `(public)` and `(marketing)` public pages, `signup/` and `login/`, `(dashboard)` customer area, `admin/` admin area, `api/bff/` server-side proxy to the backend |
| `apps/frontend/components/` | UI. `ui/` shared primitives, `dashboard/` customer screens, `admin/` admin screens, `signup/` the three-step signup |
| `apps/frontend/lib/`, `hooks/` | API client, access state (`useAccess`), server helpers |
| `apps/backend/` | API (Express 5, TypeScript, PostgreSQL) |
| `apps/backend/src/server/routes/` | HTTP routes; `src/server/services/access.ts` decides what each customer may use |
| `apps/backend/src/tests/` | Unit and integration tests (vitest) |
| `apps/backend/tests/journey/` | End-to-end suites run against a local API (customer journey, Stripe events, admin, access control, sign-in throttling, rate limits) |
| `apps/backend/tests/e2e/` | Staging checks run by CI (`.github/workflows/*e2e*.yml`) |
| `apps/backend/migrations/`, `scripts/` | Historical SQL migrations and operational scripts (kept for reference; check before reuse) |
| `packages/shared/` | Types and helpers shared by frontend and backend |
| `local/` | Local setup: dummy env files, database bootstrap, `start.sh`, dummy scan server |
| `audit/` | Audit checklist, decisions, route coverage, legacy test triage, evidence |
| `.github/workflows/` | CI (security scan, e2e against staging, deploy hooks) |

Root `*.sql` files are old manual database scripts; they are not run by the app.

## Run locally

Needs Node 20 and Docker (local PostgreSQL); details in `local/README.md`. Uses dummy configuration only; Stripe, Sumsub and Postmark are mocked or disabled.

```bash
npm ci
npm run local:db                          # create the local database
npm run local:setup -- --demo-customer    # apply schema, create admin and demo customer
npm run local:start                       # API :4000, site :3000, dummy scans :4020
npm run local:states                      # optional: one customer per account state (second terminal)
```

Accounts are listed in `local/README.md`.

## Test

```bash
npm test                                  # backend unit and integration tests (vitest)
npm run test:journey                      # end-to-end suites; needs local:start running
npm test --workspace apps/frontend        # frontend unit tests (vitest)
npm run build                             # shared, backend and frontend production builds
npx tsc --noEmit -p apps/frontend         # frontend type check
```

## Secrets safety

- Never commit real `DATABASE_URL` values or API keys.
- Local secrets live in `apps/backend/.env` (gitignored); the dummy files in `local/` contain no real credentials.
- Render uses dashboard environment variables. Use the internal database URL on Render.
