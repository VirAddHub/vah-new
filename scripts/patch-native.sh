#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Rebuilding platform-native binaries (SWC, lightningcss)…"

# Rebuild SWC for both glibc and musl Linux (harmless if not needed)
npm rebuild @next/swc-linux-x64-gnu @next/swc-linux-x64-musl || true

# Rebuild lightningcss to fetch the correct *.node binary for this runner
npm rebuild lightningcss || true

echo "✅ Native binaries ready."
