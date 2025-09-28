#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:8080}"
echo "Smoke against $BASE"
curl -sSf "$BASE/healthz" >/dev/null && echo "healthz OK"
curl -sSf "$BASE/ready"   >/dev/null && echo "ready OK"
curl -sSf "$BASE/api/plans" >/dev/null && echo "plans OK"
