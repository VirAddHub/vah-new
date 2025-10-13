#!/usr/bin/env node
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log('🔗 Database URL:', DATABASE_URL.substring(0, 30) + '...');

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        name text UNIQUE NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    
    // Get applied migrations
    const { rows } = await client.query('SELECT name FROM _migrations ORDER BY applied_at');
    const applied = new Set(rows.map(r => r.name));
    console.log('📋 Applied migrations:', Array.from(applied));
    
    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.match(/^\d+_.*\.sql$/))
      .sort();
    
    console.log('📁 Available migrations:', files);
    
    // Run unapplied migrations
    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log('[SKIP]', file);
        continue;
      }
      
      console.log('[APPLY]', file);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations(name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('✅ Applied:', file);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', file, err.message);
        throw err;
      }
    }
    
    if (appliedCount === 0) {
      console.log('✅ No new migrations to apply');
    } else {
      console.log(`✅ Applied ${appliedCount} new migrations`);
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
