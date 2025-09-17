#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash scripts/repo-tidy.sh --dry-run   # show what would be removed
#   bash scripts/repo-tidy.sh             # actually remove + stage deletions

DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

say() { printf '%s\n' "$*"; }

# Paths we want to purge from git (tracked) if present
TRACKED_PATHS=(
  # dirs
  "backups" "logs" ".history" "_archive" "-Force" "tools/mock-api"
  # files
  "app.db" "app.db-shm" "app.db-wal" "vah_corrupted.db" "vah.db.backup" "vah_backup.sql"
  "web.log"
)

# Globs for tracked files (handled via git ls-files)
TRACKED_GLOBS=(
  "*.http" "*.pid" "*.cookies.txt" "*.cookie.txt" "*.csrf.txt" "csrf-token.txt"
)

remove_tracked () {
  local path="$1"
  # --ignore-unmatch prevents errors if nothing matches
  if [[ $DRY -eq 1 ]]; then
    # show what WOULD be removed if it exists
    if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
      say "DRY: would git rm -r -f -- '$path'"
    fi
  else
    git rm -r -f --ignore-unmatch -- "$path" >/dev/null 2>&1 && say "removed (tracked): $path" || true
  fi
}

remove_tracked_by_glob () {
  local glob="$1"
  # list matching tracked files; remove them
  mapfile -t hits < <(git ls-files -- "$glob")
  if (( ${#hits[@]} )); then
    if [[ $DRY -eq 1 ]]; then
      for f in "${hits[@]}"; do say "DRY: would git rm -f -- '$f'"; done
    else
      git rm -f -- "${hits[@]}" >/dev/null 2>&1 && say "removed (tracked by glob): $glob"
    fi
  fi
}

say "== Repo tidy ($( [[ $DRY -eq 1 ]] && echo DRY-RUN || echo APPLY )) =="

# 1) remove tracked paths
for p in "${TRACKED_PATHS[@]}"; do remove_tracked "$p"; done

# 2) remove tracked by globs
for g in "${TRACKED_GLOBS[@]}"; do remove_tracked_by_glob "$g"; done

# 3) remove untracked leftovers from working tree (won't affect git history)
if [[ $DRY -eq 1 ]]; then
  say "DRY: would rm -rf backups logs .history _archive -Force tools/mock-api 2>/dev/null || true"
  say "DRY: would rm -f web.log 2>/dev/null || true"
else
  rm -rf backups logs .history _archive -Force tools/mock-api 2>/dev/null || true
  rm -f web.log 2>/dev/null || true
fi

say "== Done =="
if [[ $DRY -eq 0 ]]; then
  say "Staged deletions. Commit when ready: git commit -m 'chore: repo tidy (ignore junk, keep tests)'"
fi
