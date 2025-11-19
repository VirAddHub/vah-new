# Database migrations

- SQL files in this directory are picked up by `apps/backend/scripts/migrate-pg.cjs`.
- When migrations are run, the runner records progress in the `migrations` table (legacy `_migrations` entries are synchronised automatically).
- For environments where migrations 025 and 026 were applied manually (e.g. production on 2025‑11‑19), run [`manual_ch_migration_backfill.sql`](./manual_ch_migration_backfill.sql) once to backfill the bookkeeping table.

```bash
psql "$DATABASE_URL" -f migrations/manual_ch_migration_backfill.sql
```

Do **not** run that helper on fresh databases; those migrations should be executed normally via the runner.

