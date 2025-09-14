# SQLite → Postgres Migration Plan (Neon)

1. **Schema parity**
   - Export CREATE TABLE statements from SQLite.
   - Convert types to Postgres equivalents.

2. **Provision Neon**
   - Create database + user, note connection string.

3. **Data export/import**
   - `sqlite3 vah.db .dump > dump.sql`
   - Clean pragma / autoincrement specifics.
   - `psql $DATABASE_URL -f cleaned.sql`

4. **App config**
   - Add `DATABASE_URL` env.
   - Swap better-sqlite3 for pg client in `server/db.js`.
   - Keep identical DAO APIs.

5. **Cutover**
   - Read-only window, final sync, deploy, monitor.
