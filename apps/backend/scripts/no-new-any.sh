#!/usr/bin/env bash
set -euo pipefail

# Fail if NEW `any` is introduced.
# - Locally: checks staged diff (pre-commit friendly)
# - In CI/build: checks the latest commit diff vs its parent
# This does not block existing legacy `any` already in the repo.

DIFF=""

STAGED="$(git diff --cached -U0 -- '*.ts' '*.tsx' 2>/dev/null || true)"
if [ -n "${STAGED}" ]; then
  DIFF="${STAGED}"
else
  # If we have a parent commit, check what's new in the latest commit.
  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    DIFF="$(git diff -U0 HEAD~1..HEAD -- '*.ts' '*.tsx' 2>/dev/null || true)"
  fi
fi
if [ -z "${DIFF}" ]; then exit 0; fi

# Only look at added lines (exclude diff headers), and ignore "+//" comment-only lines.
ADDED="$(
  printf '%s\n' "${DIFF}" \
    | grep -E '^\+' \
    | grep -vE '^\+\+\+' \
    | grep -vE '^\+\\s*//' \
    || true
)"

if [ -z "${ADDED}" ]; then
  exit 0
fi

found=0

# Matches ": any" (including ": any;" / ": any," / ": any)") and "as any".
if printf '%s\n' "${ADDED}" | grep -nE '\:\s*any\b' >/dev/null 2>&1; then
  echo "❌ New ': any' detected in staged diff:"
  printf '%s\n' "${ADDED}" | grep -nE '\:\s*any\b' | head -n 50
  found=1
fi

if printf '%s\n' "${ADDED}" | grep -nE '\bas\s+any\b' >/dev/null 2>&1; then
  echo "❌ New 'as any' detected in staged diff:"
  printf '%s\n' "${ADDED}" | grep -nE '\bas\s+any\b' | head -n 50
  found=1
fi

if [ "${found}" -ne 0 ]; then
  echo "Fix: use 'unknown' + narrowing, or real types (Pool, Express.User, etc.)."
  exit 1
fi

echo "✅ No new any/as any introduced"


