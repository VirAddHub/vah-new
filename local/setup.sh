#!/usr/bin/env bash
# One-time (and repeatable) local setup: env files, database, provisional schema, dummy seed data.
#   npm run local:setup            keep existing data
#   npm run local:setup -- --reset drop and recreate the local database first
#   add --demo-customer            also seed a pre-activated demo customer (workaround, see README)
source "$(dirname "${BASH_SOURCE[0]}")/guard.sh"
RESET=0; DEMO=0
for a in "$@"; do case "$a" in --reset) RESET=1;; --demo-customer) DEMO=1;; esac; done

for n in backend frontend; do
  [ -f "$LOCAL_DIR/$n.env" ] || { cp "$LOCAL_DIR/$n.env.example" "$LOCAL_DIR/$n.env"; echo "Created local/$n.env from the example (dummy values)."; }
done
load_env "$LOCAL_DIR/backend.env"; guard_local

command -v psql >/dev/null || { echo "psql not found. Install the Postgres client (e.g. brew install libpq) or use Docker: docker compose -f local/docker-compose.yml up -d"; exit 1; }
ADMIN_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#/[^/?]+(\?.*)?$#/postgres#')"
DB_NAME="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
case "$DB_NAME" in vah_local|vah_local_*) ;; *) echo "REFUSING: database name '$DB_NAME' must start with vah_local."; exit 1;; esac
psql "$ADMIN_URL" -Atc "select 1" >/dev/null 2>&1 || { echo "Cannot reach Postgres at 127.0.0.1. Start it: docker compose -f local/docker-compose.yml up -d"; exit 1; }

if [ "$RESET" = 1 ]; then psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$DB_NAME\""; fi
if [ "$(psql "$ADMIN_URL" -Atc "select count(*) from pg_database where datname='$DB_NAME'")" = "0" ]; then
  psql "$ADMIN_URL" -q -c "CREATE DATABASE \"$DB_NAME\""
fi
if [ "$(psql "$DATABASE_URL" -Atc "select count(*) from information_schema.tables where table_schema='public' and table_name='user'")" = "0" ]; then
  echo "Loading PROVISIONAL schema (local/schema.provisional.sql)…"
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$LOCAL_DIR/schema.provisional.sql" >/dev/null
fi
[ -d "$ROOT_DIR/node_modules/pg" ] || { echo "Dependencies missing. Run: npm ci"; exit 1; }
( cd "$ROOT_DIR/apps/backend" && SEED_DEMO_CUSTOMER="$DEMO" node "$LOCAL_DIR/seed.cjs" )
echo "Local setup complete. Start the app with: npm run local:start"
