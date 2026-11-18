#!/usr/bin/env bash
# Builds a local database shaped like the Render database (as reviewed on 18 Nov 2026), with dummy data.
# Usage: build_render_copy.sh <target_db>   (needs the local vah_local database from `npm run local:setup`)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="${PGBASE:-postgres://postgres@127.0.0.1:5433}"
DB="${1:?target database name}"; case "$DB" in vah_local_*) ;; *) echo "target must start with vah_local_"; exit 1;; esac
psql -q "$BASE/postgres" -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB"
pg_dump -s "$BASE/vah_local" | psql -q -v ON_ERROR_STOP=1 "$BASE/$DB" >/dev/null
psql -q -v ON_ERROR_STOP=1 "$BASE/$DB" -f "$HERE/render_shape.sql" >/dev/null 2>&1
psql -q -v ON_ERROR_STOP=1 "$BASE/$DB" -f "$HERE/seed_render_like.sql" >/dev/null
echo "built $DB"
