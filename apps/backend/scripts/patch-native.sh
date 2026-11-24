#!/usr/bin/env bash
# Rebuilds optional platform-native packages used by the frontend toolchain (Next SWC, lightningcss).
# The API itself does not need them, so a failed rebuild is reported honestly and does not stop the
# install (security review F42: the old script printed "ready" even when every rebuild failed).
set -uo pipefail
status=0
for pkg in "@next/swc-linux-x64-gnu @next/swc-linux-x64-musl" "lightningcss"; do
  if npm rebuild $pkg >/dev/null 2>&1; then
    echo "native rebuild ok: $pkg"
  else
    echo "native rebuild skipped or failed (optional, frontend tooling only): $pkg"
    status=1
  fi
done
if [ "$status" -eq 0 ]; then echo "Native binaries rebuilt."; else echo "Some optional native rebuilds did not run; see above."; fi
exit 0
