# Phase 1 on Render: database update, deploy, rollback

**Status: prepared and rehearsed locally. Not run against Render. Nothing here is run by a deploy.**
Running it, merging to `main` and deploying each need your explicit approval.

## Files

| File | What it does | Writes? |
|---|---|---|
| `2026-11-18_phase1_render_precheck.sql` | Compares the database with the 18 Nov review and lists every difference | No (read-only transaction, always rolled back) |
| `2026-11-18_phase1_render.sql` | The migration. Re-runs the pre-check, applies the change, verifies it, records it, then commits, all in one transaction | Yes |
| `2026-11-18_phase1_render_verify.sql` | Full post-migration check | No |
| `2026-11-18_phase1_render_rollback_check.sql` | Before an app rollback: shows what the previous release would read differently | No |
| `run-sql.cjs` | Runs any of the files where psql is missing (Render Shell), with the same stop-on-first-error behaviour; uses the service's `DATABASE_URL` | As the file does |
| `rehearsal/` | How the files were generated (`build_sql.py`) and tested (`rehearse.sh`, `build_render_copy.sh`, `app_smoke.mjs`) | Local only |

The four SQL files are generated from one set of checks (`rehearsal/build_sql.py`). Edit the generator,
not the SQL files.

## What changes

The change only adds or widens. Nothing is renamed or deleted, and no existing row is removed.

| Area | Change |
|---|---|
| `user` | Adds `suspended_at`, `standing_reason`, `standing_changed_at_ms` and `standing_changed_by` |
| `subscription` | Adds `paid_through_ms`, `cancel_at_period_end` and `stripe_customer_id`. Removes the check `subscription_active_requires_mandate`, which rejects every Stripe activation. |
| `webhook_log` | Adds `attempts`, `last_error`, `processed_at_ms` and `event_created_ms` |
| `invoices`, `plan_status_event` | Adds `provider_payment_id` (with a partial unique index) and the `provider_event_*` columns **next to** the GoCardless columns, which stay so the previous release keeps working |
| `invoices` period rule | `idx_invoices_user_period_unique` becomes partial (`WHERE stripe_invoice_id IS NULL`). It is built under a temporary name first, so the rule is never missing. |
| `invoices_seq` | Adds a unique index on `year`. Invoice numbering uses `ON CONFLICT (year)`; that fails today. |
| `notification` | Adds `meta` and `read_at`. `created_at` changes from a timestamp to milliseconds, which both releases write; notifications fail today. `read` becomes NOT NULL. |
| New tables | `login_throttle`, `mail_audit`, `forward_audit` and `verification_event` |
| Data | Inserts a primary business for each customer that has none (1 on 18 Nov) |
| Tracking | Records the 5 Phase 1 migrations (see "Migration tracking") |

## Safeguards

- **Stops instead of guessing.**
  - The pre-check fails, and lists every problem, if any table's columns differ from the review. That covers every column's name, type and nullability, and catches a missing or extra table.
  - It also fails if any index or constraint the change relies on is different, if a Phase 1 migration is already recorded, or if you are connected to any database other than `vah_postgres_40zq`.
  - The migration repeats the same check inside its own transaction, so it also refuses if the pre-check was skipped.
- **Errors stop psql.** Every file sets `ON_ERROR_STOP` itself, which also covers anyone who forgets `-v ON_ERROR_STOP=1`. psql then exits with code 3.
- **No false success.** The only success line, `MIGRATION COMMITTED`, prints after `COMMIT` has succeeded. Any earlier error ends psql first, and the transaction is rolled back.
- **The migration verifies itself before committing.** If the verification fails, the transaction is rolled back. The checks cover tables, column types, nullability and defaults, constraints, unique rules, indexes and data.
- **Waits are bounded.** `lock_timeout` is 5 s and `statement_timeout` is 120 s. A blocked lock fails cleanly and nothing is kept.

**Rehearsal** (`rehearsal/rehearse.sh`, on local copies built to match Render column for column), all passed, both with psql and with `RUNNER=node` (`run-sql.cjs`):

1. The pre-check passes.
2. The migration commits.
3. Verify passes.
4. A second run is refused and changes nothing.
5. The rollback check is read-only.
6. An unexpected extra column stops the pre-check, and stops the migration even when run without `-v ON_ERROR_STOP`. Nothing changed.
7. When another session holds a lock halfway through, the migration stops with a lock timeout and keeps none of the steps it had already run. No success line is printed.
8. Verify fails, and names the problem, when a unique index is missing.

**Limit:** the copy is exact for columns (every table matches Render's fingerprint). Indexes and constraints
were matched for the objects the change touches. Others on Render were not inventoried, but the change
does not touch them, and the pre-check fails if any it depends on differ.

## Compatibility (tested locally)

| Release | Database | Result |
|---|---|---|
| Phase 1 | Migrated copy | Journey 30/30 (+1 pending: real Stripe checkout), Stripe events 17/17, admin 12/12, access control 8/8, sign-in throttling 10/10. Smoke: 40 requests, 0 server errors. No missing-column or type errors in the log. |
| Phase 1 | Unmigrated copy | Fails: access checks, mail import, Stripe activation and sign-out all return errors |
| Previous release `b33b5ff8` (live today) | Unmigrated copy | Smoke: 31 requests, 7 server errors that exist today: notifications ×2, admin user detail ×4, mail dispatch ×1 |
| Previous release | Migrated copy | Same 31 requests: 5 server errors, all of them already failing before. Notifications now work. **No new failures.** |
| Previous release | Migrated copy **after Phase 1 had written data** (all 10 account states, Stripe events, suspensions, sign-in locks) | Same 5 errors that exist today. Sign-in and mail access shown per state below. |

The 5 remaining errors are in the previous release's code: it asks for columns that do not exist on Render,
and passes millisecond values to a timestamp column. Phase 1 fixes both.

## Deploy steps (each needs your go-ahead)

Use psql 13 or newer (the server is PostgreSQL 18). Keep the connection string out of shell history and out
of chat:

```bash
read -rs VAH_DB_URL && export VAH_DB_URL     # paste the External Database URL from Render > vah-postgres > Info; nothing is shown
cd apps/backend/scripts/pending-production
```

1. **Pre-check** (read-only):
   `psql -X -v ON_ERROR_STOP=1 "$VAH_DB_URL" -f 2026-11-18_phase1_render_precheck.sql; echo "exit: $?"`
   Continue only if you see `PRECHECK PASSED` and `exit: 0`. Otherwise stop and send me the output. It lists
   table and index names only, no data or credentials.
2. **Backup** (see "Backup and recovery"): create an export and note the time.
3. **Migrate**: `psql -X -v ON_ERROR_STOP=1 "$VAH_DB_URL" -f 2026-11-18_phase1_render.sql; echo "exit: $?"`
   Success means `MIGRATION COMMITTED` and `exit: 0`. Any other exit code means nothing was changed. Do not
   re-run it; send me the output. Don't add `-1` or `--single-transaction`, because the file manages its own
   transaction. Don't paste the file into a GUI tool, because it relies on psql settings.
4. **Verify**: `psql -X -v ON_ERROR_STOP=1 "$VAH_DB_URL" -f 2026-11-18_phase1_render_verify.sql; echo "exit: $?"` should give `VERIFY PASSED` and `exit: 0`.
5. **Environment**: set `BFF_SHARED_SECRET` to the same value on the Render API service and on the website
   host. Stripe price IDs: the code reads `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID`, the
   names you set. The older names are still accepted as a fallback.
6. **Deploy** (only with your approval): fast-forward `main`. Render auto-deploys `vah-api-staging` and
   `vah-onedrive-worker` from `main`.
7. **After deploy**: `/api/healthz` returns 200. Sign in as admin and open Users, then a user's details. Sign in
   as a test customer and open the dashboard.

## Backup and recovery

`vah-postgres` is on a paid instance type (`basic_256mb`), which has point-in-time recovery and exports.
From Render's documentation (https://render.com/docs/postgresql-backups):

**Before migrating:**
1. Render Dashboard → `vah-postgres` → **Recovery** → **Create export**. Wait until it is listed, then download
   it (a `.dir.tar.gz`; Render keeps exports for 7 days). Keep your copy until Phase 1 is confirmed.
2. Write down the current time in UTC. This is the point-in-time recovery target.
   Point-in-time recovery reaches back 3 days on a Hobby workspace and 7 on Pro. You can't restore to
   the last 10 minutes.

**To recover (point-in-time; best for recent data):**
1. Recovery page → **Point-in-Time Recovery** → **Restore Database**.
2. Enter a new name (for example `vah-postgres-restored`) and the noted time. Choose **Copy Existing Settings**, then **Start Recovery**.
3. Wait until the new instance shows **Available**. The original database is left untouched.
4. Check it: connect with the new instance's PSQL command and run `2026-11-18_phase1_render_precheck.sql`.
   It should print `PRECHECK PASSED`, which means it is back to the pre-migration shape.
5. **Connect the app:** on both `vah-api-staging` and `vah-onedrive-worker`, open Environment and replace
   `DATABASE_URL` with the restored instance's **Internal Database URL**. Save; each service redeploys. If
   `DATABASE_URL` comes from an environment group, change it there once.
6. Redeploy the matching code. That is the previous release `b33b5ff8` if the restore is to before the migration.
7. Once everything works, suspend or delete the old instance. A recovery instance is billed like any database.

**To recover from the export instead** (older data, more manual): create a new empty database. Extract the
archive with `tar -zxvf <file>.dir.tar.gz`. Then run
`pg_restore --dbname="<new external URL>" --verbose --clean --if-exists --no-owner --no-privileges --format=directory <dir>`
with client tools matching PostgreSQL 18. Then do steps 5–7 above. Never restore with `--clean` into a database that holds data you need.

**What a restore loses:** anything written after the restore point. That includes signups, payments and
webhook events, mail imported by the OneDrive worker, admin actions and audit rows. Prefer the app
rollback below, which keeps all data.

## Rollback

**App rollback (preferred; keeps every record).** In Render, redeploy the previous deploy (`b33b5ff8`) of
`vah-api-staging` and `vah-onedrive-worker`. **No database change is needed.** The migration only adds and
widens, and the previous release was tested on the migrated database (see "Compatibility"). Nothing is
dropped, so no audit records, subscriptions or other rows written after the deploy are lost. Run
`2026-11-18_phase1_render_rollback_check.sql` first to see how many records fall into the cases below.

**Where the previous release reads Phase 1 data differently** (tested on the migrated copy after Phase 1 had written data):

| Data written by Phase 1 | Previous release |
|---|---|
| Paid customer whose identity is not verified yet | **Shows their mail** (its old rule). Phase 1 hides it until verification. |
| Suspended or closed by an admin | Refuses sign-in (tested). Doesn't show the reason. Its admin screens don't clear `suspended_at`, so if Phase 1 is deployed again an account restored by the previous release would still be suspended. |
| Stripe-only subscription (`active`, no GoCardless mandate) | Its GoCardless billing screens and jobs don't know about Stripe. These customers can see mail. |
| `past_due` or cancel-at-period-end subscription | Ignores the paid-through date and the end-of-period flag |
| Sign-in locks in `login_throttle` | Ignored. It uses `user.locked_until`, which Phase 1 no longer sets, so locked accounts become usable. |
| Stripe invoices | It reads only `gocardless_payment_id`. Because the period rule is now partial, its internal invoice job could create a second invoice for a period that already has a Stripe invoice. |
| Subscriptions | With the mandate check gone, its Stripe code could write `active` without a mandate (the database rejected that before) |

**Not used anymore:** the earlier draft's database rollback (renames back, dropping the new tables). It
could drop audit records and other data written after the deploy, so it has been removed. If the database
itself must go back, restore it (see "Backup and recovery") and accept the loss listed there.

## Migration tracking

Render's `migrations` table does not match the repository's history. It has no rows for 103–106 or 111–130,
although their columns are present. **Never run the migration runner (`npm run migrate`) against Render.**

| Recorded by this change | Its required changes, as created on Render by this change | Checked by |
|---|---|---|
| `20261115_01_notification_and_audit_tables.sql` | `notification` with the same columns, types, nullability and defaults as the repository migration (converted from Render's table rather than created), both of its indexes, `mail_audit` + index, `forward_audit` + index | column specs and index definitions |
| `20261115_02_backfill_primary_business.sql` | No live customer without a business | data check |
| `20261115_03_stripe_entitlement.sql` | 3 `subscription` columns, 4 `webhook_log` columns, 3 standing columns on `user`. The unique rule on `invoices.stripe_invoice_id` already exists on Render as `idx_invoices_stripe_invoice_id`, with exactly the definition the migration creates under the name `invoices_stripe_invoice_id_unique`, so no second, duplicate index is added. | column specs; exact index definition |
| `20261115_04_invoice_period_unique_for_internal_only.sql` | `idx_invoices_user_period_unique` with `WHERE (stripe_invoice_id IS NULL)` | exact index definition |
| `20261117_01_login_throttle.sql` | `login_throttle` (primary key on `key`) + index | column specs; index definitions |

The rows are inserted only after the verification inside the transaction has passed. Verify then checks
that each is recorded exactly once.

On the rehearsal copy, the columns these five migrations create match the database the test suites use
exactly (names, types, nullability and defaults).

**Deliberately not recorded:**
- **`131_fix_activity_status.sql`:** a data clean-up, the same SQL Render ran on 2 Oct 2025 as `017_fix_activity_status.sql`. Rows created since then were not re-checked, so it is not marked as done.
- **`132_time_ms_invoice_token_fixed.sql`, `133_time_ms_webhook_export_address_fixed.sql`:** renumbered copies of 103/105. Render has their columns, but whether its `*_ts` columns are generated columns, as the migrations define them, was not checked.

## Not covered

- Stripe (keys, webhook endpoint, checkout): next task. Until then, checkout is unavailable.
- The dummy subscriptions that were active through GoCardless will show "Payment needed" (access rules), because they have no Stripe subscription.
- The empty GoCardless columns and tables stay, and can be removed in a later, separate change.
