# Phase 1 on Render: database update, then deploy

The Render database (`vah-postgres`, "My Workspace") is shaped differently from the database the tests
use. Deploying the Phase 1 code before this update breaks sign-in, the dashboard access check, mail
import and Stripe activation. `2026-11-18_phase1_render.sql` brings it to the shape the code needs.
It supersedes `2026-11-15_gocardless_removal.sql` (its renames are included; nothing is dropped).

**Review (18 Nov 2026, read-only: structure and counts only).** 46 tables. The missing pieces are 4
tables (`login_throttle`, `mail_audit`, `forward_audit`, `verification_event`) and columns on `user`,
`subscription` and `webhook_log`. `notification` needs `meta` and `read_at`, and its `created_at` has
to change from a timestamp to milliseconds. `invoices_seq` has no unique key on `year`. The old
mandate check on `subscription` blocks every Stripe activation. All the affected tables are empty
except `user`, `subscription` and `business`. The data is dummy: the site has not launched.

**Rehearsal.** A local copy reshaped to match Render column for column (only `blog_posts`, which the
code does not use differently, was left as it is) failed with the current code: access checks, mail
import (`column "suspended_at" does not exist`), Stripe activation and sign-out all returned errors. After
this script: journey 30/30 (+1 pending: real Stripe checkout), Stripe events 17/17, admin 12/12, access
control 8/8, sign-in throttling 10/10. The server log showed no missing table or column errors.

## Steps

1. **Back up.** In the Render dashboard, open `vah-postgres` → *Recovery* (or *Backups*) and make a
   backup/export, or note the current time for point-in-time recovery. Keep it until the deploy is confirmed.
2. **Connect** with the PSQL command from the database's *Connect* menu (your own credentials; do not
   paste them anywhere else).
3. **Run** `\i 2026-11-18_phase1_render.sql` (or paste the file). Check that PART 1's numbers match the
   expected line; PART 2 runs in one transaction; PART 3 must print `true` for every key.
   Run it **once**. A second run stops at the first rename and changes nothing.
4. **Environment (Render API service `vah-api-staging`):** `BFF_SHARED_SECRET` is new. Set the same
   value on Render and on the website host (Vercel). Without it, every visitor is counted as the
   website's server for rate limits and sign-in throttling. Optional: `METRICS_TOKEN`, `SCAN_DIRECT_HOSTS`.
5. **Deploy:** fast-forward `main`. Render auto-deploys `vah-api-staging` and `vah-onedrive-worker` from `main`.
6. **Check:** `/api/healthz` returns 200; sign in as admin; open Admin → Users; sign in as a test
   customer and open the dashboard.

## Rollback

Redeploy the previous commit on Render (`b33b5ff8`), then run PART 4 of the SQL file. Restore the
backup only if something else went wrong.

## Not covered (needs your setup, not a schema change)

Stripe keys, webhook endpoint and price IDs (see the Stripe checklist). Until they are set, checkout is
unavailable. The 6 dummy subscriptions that were active through GoCardless now show "Payment needed".
