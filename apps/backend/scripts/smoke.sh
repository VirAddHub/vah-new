#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:8080}"
curl -sSf "$BASE/healthz" >/dev/null && echo "healthz OK"
curl -sSf "$BASE/ready"   >/dev/null && echo "ready OK"