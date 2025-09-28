#!/usr/bin/env node
try {
  const os = require('os');
  console.log(`[ci-info] node=${process.version} platform=${process.platform} arch=${process.arch}`);
  console.log(`[ci-info] cwd=${process.cwd()}`);
  console.log(`[ci-info] RENDER env: ${process.env.RENDER ? 'yes' : 'no'}`);
} catch (e) {
  console.log('[ci-info] (non-fatal) error:', e?.message || e);
}