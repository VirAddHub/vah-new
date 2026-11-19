#!/usr/bin/env bash
# Builds a local database with exactly the Render database's schema (render_schema.sql, read from its catalogs
# on 18 Nov 2026), plus dummy data. Usage: build_render_copy.sh <target_db>
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="${PGBASE:-postgres://postgres@127.0.0.1:5433}"
DB="${1:?target database name}"; case "$DB" in vah_local_*) ;; *) echo "target must start with vah_local_"; exit 1;; esac
psql -q "$BASE/postgres" -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
psql -q -X -v ON_ERROR_STOP=1 "$BASE/$DB" -f "$HERE/render_schema.sql" >/dev/null
psql -q -v ON_ERROR_STOP=1 "$BASE/$DB" -f "$HERE/seed_render_like.sql" >/dev/null
echo "built $DB"
