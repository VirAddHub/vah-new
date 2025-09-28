# Local Postgres on 5433 (Homebrew)

1) Ensure Homebrew Postgres 16 is on port 5433 (see script output):
   ```powershell
   pwsh apps/backend/scripts/local-pg-5433.ps1
   ```

2) Set your local env (already ignored by git):
   ```
   apps/backend/.env -> DATABASE_URL=postgresql://libanadan@localhost:5433/test
   ```

3) Build backend:
   ```bash
   npm run -w apps/backend build
   ```

4) Run backend:
   ```powershell
   pwsh apps/backend/scripts/run-local.ps1
   ```

5) Smoke test in another terminal:
   ```bash
   bash apps/backend/scripts/smoke.sh http://localhost:8080
   ```

## Troubleshooting

If PostgreSQL won't start on port 5433:

1. Stop any existing PostgreSQL services:
   ```bash
   brew services stop postgresql@14
   brew services stop postgresql@16
   ```

2. Configure PostgreSQL to use port 5433:
   ```bash
   # Edit the config file
   nano /opt/homebrew/var/postgresql@16/postgresql.conf
   
   # Add or change this line:
   port = 5433
   ```

3. Remove any stale PID files:
   ```bash
   rm -f /opt/homebrew/var/postgresql@16/postmaster.pid
   ```

4. Start PostgreSQL:
   ```bash
   brew services start postgresql@16
   ```

5. Verify it's running on port 5433:
   ```bash
   lsof -i :5433
   ```
