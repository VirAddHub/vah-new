#!/usr/bin/env node
/* eslint-disable no-console */
import { spawnSync } from 'node:child_process';

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return res.status ?? 1;
}

function which(bin) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' });
  return res.status === 0;
}

function main() {
  console.log('[secret-scan] starting…');

  // Prefer local gitleaks if present
  if (which('gitleaks')) {
    console.log('[secret-scan] using local gitleaks');
    const code = run('gitleaks', ['detect', '--no-banner', '--redact']);
    process.exit(code);
  }

  // Fallback to docker if available
  if (which('docker')) {
    console.log('[secret-scan] using docker gitleaks');
    const code = run('docker', [
      'run', '--rm', '-v', `${process.cwd()}:/repo`,
      'zricethezav/gitleaks:latest', 'detect',
      '-s', '/repo', '--redact'
    ]);
    process.exit(code);
  }

  console.warn('[secret-scan] gitleaks not found (local or docker). Skipping scan.');
  process.exit(0);
}

main();
