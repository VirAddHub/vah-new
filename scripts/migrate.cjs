#!/usr/bin/env node
// scripts/migrate.cjs - Run database migrations
const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];

try {
  if (command === 'rollback') {
    console.log('❌ Rollback not supported with SQLite migration system');
    process.exit(1);
  } else {
    console.log('Running SQLite migrations...');
    // Use the SQLite migration system
    execSync('node scripts/migrate-sqlite.cjs', { stdio: 'inherit' });
  }

  console.log('✅ Migration completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
