#!/usr/bin/env bash
set -euo pipefail
echo "🔧 Rebuilding platform-native binaries (SWC, lightningcss)…"
npm rebuild @next/swc-linux-x64-gnu @next/swc-linux-x64-musl || true
npm rebuild lightningcss || true
echo "✅ Native binaries ready."
