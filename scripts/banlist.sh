#!/usr/bin/env bash
set -euo pipefail

PATS=(
  "/api/test/login-as-admin"
)

found=0
for pat in "${PATS[@]}"; do
  matches="$(
    { git ls-files -z 2>/dev/null || find . -type f -print0; } \
      | xargs -0 grep -nH -- "$pat" 2>/dev/null \
      | grep -v 'scripts/banlist.sh:' || true
  )"
  if [ -n "${matches}" ]; then
    echo "❌ Banned pattern found: ${pat}"
    echo "${matches}" | head -n 50
    found=1
  fi
done

if [ "${found}" -ne 0 ]; then
  echo "❌ Banned test bypass present"
  exit 1
else
  echo "✅ No banned test bypass detected"
fi
