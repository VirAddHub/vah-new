#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${SMOKE_BASE_URL:-https://vah-api-staging.onrender.com}}"
HEALTH_PATH="${SMOKE_HEALTH_PATH:-/api/healthz}"
MAX_SEC="${SMOKE_MAX_WAIT_SECONDS:-900}"     # 15m
INIT_DELAY="${SMOKE_INITIAL_DELAY_SECONDS:-120}"
BACKOFF_MAX="${SMOKE_BACKOFF_MAX_SECONDS:-15}"

echo "Smoke against: $BASE_URL"
sleep "$INIT_DELAY"

retryable() {
  local code="$1"
  [[ "$code" == "000" || "$code" == "429" || "$code" == "500" || "$code" == "502" || "$code" == "503" || "$code" == "504" ]]
}

elapsed=0; backoff=2
while (( elapsed < MAX_SEC )); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL$HEALTH_PATH" || echo 000)
  echo "health: $code (elapsed=${elapsed}s)"

  if [[ "$code" == "200" ]]; then
    echo "✅ healthy"; exit 0
  fi

  if retryable "$code"; then
    sleep "$backoff"
    elapsed=$(( elapsed + backoff ))
    backoff=$(( backoff * 2 )); (( backoff > BACKOFF_MAX )) && backoff="$BACKOFF_MAX"
  else
    echo "❌ non-retryable: $code"; exit 1
  fi
done

echo "❌ timed out waiting for healthy after ${MAX_SEC}s"
exit 1