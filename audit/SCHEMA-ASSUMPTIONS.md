# Schema assumptions and open questions

`apps/backend/scripts/baseline/000_baseline.sql` builds fresh local and test databases. It is a
reconstruction (audit 2026-11-14), not a copy of production. The Render database has not been read.
Nothing here is applied to an existing database: the runner applies the baseline only when there is
no `user` table.

## What the baseline is made from
1. The historical migration folders, applied in the order that works (98 files applied, 13 never apply).
2. Repair scripts in `apps/backend/scripts`.
3. 35 columns the code reads or writes that no migration creates, added with the type the code's own
   writes imply. Full list with guessed types: `audit/2026-11-14/README.md`, caveat 3.
4. Two changes made on 2026-11-15: the subscription rule "active requires a mandate" became
   "active requires a Stripe subscription id"; a duplicate unique constraint on `subscription.user_id` was dropped.

The runner (`scripts/migrate-pg.cjs`) collects 67 historical files (`scripts/migrations-pg` and the
root `migrations/`); `apps/backend/migrations/` (44 files) has never been read by it. On a fresh
database all 67 are recorded as applied after the baseline.

## Open questions (closed only by reading the production schema)
| # | Question | Contained by |
|---|---|---|
| U1 | Does production match the baseline in tables, columns and types? | `--plan` mode; no production runs |
| U2 | Real types of the 35 unmigrated columns | Listed; journey test passes on the guessed types |
| U3 | Date columns written both as milliseconds and as timestamps (`user.created_at` by signup vs admin create; plan edit; GDPR export) | No type changed; affected routes listed in the checklist as schema-dependent |
| U4 | Do `notification`, `mail_audit`, `forward_audit` exist in production, and with which columns? | Migration `20261115_01` uses IF NOT EXISTS |
| U5 | Is the mandate rule present in production? | No production change in Phase 1 |
| U6 | Which migration names has production recorded? The runner would try any file it has no record of | `--plan` only |
| U7 | Production plan ids, and whether legacy tiers are active | Activation will validate by id and billing period |
| U8 | Which column records the identity-approval date (`kyc_approved_at` is written; `kyc_verified_at` stayed empty locally) | Access depends on `kyc_status` only |
| U9 | `notification` is written in two shapes (`read_at` and `meta` by most code, `read` boolean by dispatch logging) | New table carries both; to be unified |
