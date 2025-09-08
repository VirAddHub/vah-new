#!/usr/bin/env bash
set -euo pipefail
echo "🔧 Rebuilding platform-native binaries (SWC)…"
npm rebuild @next/swc-linux-x64-gnu @next/swc-linux-x64-musl || true
echo "✅ Native binaries ready."
