cat > scripts/banlist.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

# Banned patterns (regex). Keep this list explicit.
PATS=(
  "/api/test/login-as-admin"
  "login_test_admin_bypass"
  "login_test_admin_rescue"
  "/api/test/elevate"
  "/api/test/login"
)

found=0

# Prefer git-tracked files; fall back to find.
file_list() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files -z
  else
    find . -type f \
      -not -path "./node_modules/*" \
      -not -path "./.git/*" \
      -not -path "./.history/*" \
      -not -path "./tests/*" \
      -not -path "./logs/*" \
      -not -path "./coverage/*" \
      -not -path "./dist/*" \
      -not -path "./build/*" \
      -not -path "./tmp/*" \
      -not -path "./scripts/banlist.sh" \
      -print0
  fi
}

for pat in "${PATS[@]}"; do
  matches="$(
    file_list \
    | xargs -0 grep -nH -E -I -- "$pat" 2>/dev/null \
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
BASH

chmod +x scripts/banlist.sh
