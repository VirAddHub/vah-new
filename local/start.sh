#!/usr/bin/env bash
# Start the API (:4000) and the site (:3000) locally with dummy configuration. Ctrl+C stops both.
source "$(dirname "${BASH_SOURCE[0]}")/guard.sh"
load_env "$LOCAL_DIR/backend.env"; guard_local
cd "$ROOT_DIR"
[ -d node_modules ] || { echo "Run: npm ci"; exit 1; }
if [ ! -f apps/backend/dist/src/server.js ] || [ "${REBUILD:-0}" = "1" ]; then
  echo "Building shared package and backend…"
  npm run build --workspace packages/shared >/dev/null
  npm run build --workspace apps/backend >/dev/null
fi
mkdir -p "$LOCAL_DIR/logs"
( cd apps/backend && exec node dist/src/server.js ) > "$LOCAL_DIR/logs/backend.log" 2>&1 &
BE=$!
( set -a; . "$LOCAL_DIR/frontend.env"; set +a; cd apps/frontend && exec npx next dev -p 3000 ) > "$LOCAL_DIR/logs/frontend.log" 2>&1 &
FE=$!
trap 'kill $BE $FE 2>/dev/null || true' EXIT INT TERM
for i in $(seq 1 30); do curl -fsS -m 2 http://127.0.0.1:4000/api/healthz >/dev/null 2>&1 && break; sleep 1; done
curl -fsS -m 2 http://127.0.0.1:4000/api/healthz >/dev/null 2>&1 && echo "API   http://localhost:4000  (log: local/logs/backend.log)" || { echo "API failed to start. See local/logs/backend.log"; exit 1; }
echo "Site  http://localhost:3000  (log: local/logs/frontend.log; first page load compiles and is slow)"
echo "Ctrl+C to stop."
wait
