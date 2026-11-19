#!/usr/bin/env bash
# Safety guard, sourced by the local scripts. Refuses to run against anything that is not local or test-mode.
set -euo pipefail
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$LOCAL_DIR/.." && pwd)"

load_env() { # $1 = env file
  [ -f "$1" ] || { echo "Missing $1. Run: npm run local:setup"; exit 1; }
  set -a; # shellcheck disable=SC1090
  . "$1"; set +a
}

guard_local() {
  local url="${DATABASE_URL:-}"
  local host; host="$(printf '%s' "$url" | sed -E 's#^[a-z]+://([^@/]*@)?([^:/?]+).*#\2#')"
  case "$host" in
    localhost|127.0.0.1) ;;
    *) echo "REFUSING: DATABASE_URL host is '$host'. Local scripts only run against localhost."; exit 1 ;;
  esac
  case "${STRIPE_SECRET_KEY:-}" in
    sk_live_*|rk_live_*) echo "REFUSING: a live Stripe key is set. Use a test-mode key (sk_test_...)."; exit 1 ;;
  esac
  if [ "${NODE_ENV:-development}" = "production" ]; then echo "REFUSING: NODE_ENV=production."; exit 1; fi
  if [ -n "${POSTMARK_TOKEN:-}${POSTMARK_SERVER_TOKEN:-}${POSTMARK_API_TOKEN:-}" ] && [ "${ALLOW_LOCAL_EMAIL:-0}" != "1" ]; then
    echo "REFUSING: a Postmark token is set. Local runs do not send email (set ALLOW_LOCAL_EMAIL=1 only for a sandbox server)."; exit 1
  fi
  # Stop dotenv from picking up any stray .env file: point it at our file explicitly.
  export DOTENV_CONFIG_PATH="$LOCAL_DIR/backend.env"
}
