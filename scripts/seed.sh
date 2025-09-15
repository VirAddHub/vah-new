#!/bin/bash
set -e

echo "🌱 Seeding database for testing..."

# Ensure data directory exists
mkdir -p data

# Run migrations
echo "📦 Running migrations..."
node scripts/run-sql.cjs scripts/migrate-hardening.sql

# Seed admin user if not exists
echo "👤 Ensuring admin user exists..."
node -e "
const db = require('better-sqlite3')('./data/app.db');
const bcrypt = require('bcrypt');

// Check if admin exists
const admin = db.prepare('SELECT id FROM user WHERE email = ?').get('admin@virtualaddresshub.co.uk');

if (!admin) {
  console.log('Creating admin user...');
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare('INSERT INTO user (email, password_hash, first_name, last_name, is_admin, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run('admin@virtualaddresshub.co.uk', hash, 'Admin', 'User', 1, 'admin');
  console.log('✅ Admin user created');
} else {
  console.log('✅ Admin user already exists');
}

db.close();
"

echo "🎉 Database seeded successfully!"
