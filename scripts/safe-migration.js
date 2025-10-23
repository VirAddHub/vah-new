#!/usr/bin/env node

/**
 * Safe Database Migration Script
 * Ensures migrations don't break live data or cause downtime
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(config);

// Migration tracking table
const MIGRATION_TABLE = 'schema_migrations';

// Safe migration patterns
const SAFE_PATTERNS = [
  /^CREATE TABLE/,
  /^CREATE INDEX/,
  /^CREATE UNIQUE INDEX/,
  /^ALTER TABLE.*ADD COLUMN/,
  /^ALTER TABLE.*ADD CONSTRAINT/,
  /^CREATE OR REPLACE VIEW/,
  /^CREATE OR REPLACE FUNCTION/,
];

const UNSAFE_PATTERNS = [
  /^DROP TABLE/,
  /^DROP COLUMN/,
  /^DROP INDEX/,
  /^ALTER TABLE.*DROP/,
  /^TRUNCATE/,
  /^DELETE FROM/,
  /^UPDATE.*SET.*WHERE/,
];

class SafeMigration {
  constructor() {
    this.migrations = [];
    this.currentVersion = null;
  }

  async init() {
    await this.createMigrationTable();
    await this.loadCurrentVersion();
  }

  async createMigrationTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(255),
        rollback_sql TEXT
      )
    `;
    
    await pool.query(query);
  }

  async loadCurrentVersion() {
    const query = `SELECT version FROM ${MIGRATION_TABLE} ORDER BY applied_at DESC LIMIT 1`;
    const result = await pool.query(query);
    this.currentVersion = result.rows[0]?.version || '0';
  }

  async loadMigrations() {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.split('_')[0];
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      this.migrations.push({
        version,
        filename: file,
        content,
        checksum: this.calculateChecksum(content)
      });
    }
  }

  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  validateMigration(content) {
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const upperLine = line.toUpperCase().trim();
      
      // Check for unsafe patterns
      for (const pattern of UNSAFE_PATTERNS) {
        if (pattern.test(upperLine)) {
          throw new Error(`Unsafe migration detected: ${line}`);
        }
      }
      
      // Check for safe patterns
      const isSafe = SAFE_PATTERNS.some(pattern => pattern.test(upperLine));
      if (!isSafe && upperLine.startsWith('ALTER TABLE')) {
        throw new Error(`Potentially unsafe ALTER TABLE detected: ${line}`);
      }
    }
    
    return true;
  }

  async runMigration(migration) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate migration
      this.validateMigration(migration.content);
      
      // Check if already applied
      const checkQuery = `SELECT version FROM ${MIGRATION_TABLE} WHERE version = $1`;
      const checkResult = await client.query(checkQuery, [migration.version]);
      
      if (checkResult.rows.length > 0) {
        console.log(`Migration ${migration.version} already applied, skipping`);
        return;
      }
      
      // Run migration
      console.log(`Applying migration ${migration.version}: ${migration.filename}`);
      await client.query(migration.content);
      
      // Record migration
      const recordQuery = `
        INSERT INTO ${MIGRATION_TABLE} (version, filename, checksum)
        VALUES ($1, $2, $3)
      `;
      await client.query(recordQuery, [migration.version, migration.filename, migration.checksum]);
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${migration.version} applied successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration ${migration.version} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(version) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get migration record
      const query = `SELECT * FROM ${MIGRATION_TABLE} WHERE version = $1`;
      const result = await client.query(query, [version]);
      
      if (result.rows.length === 0) {
        throw new Error(`Migration ${version} not found`);
      }
      
      const migration = result.rows[0];
      
      // If rollback SQL exists, run it
      if (migration.rollback_sql) {
        console.log(`Rolling back migration ${version}`);
        await client.query(migration.rollback_sql);
      } else {
        console.log(`No rollback SQL for migration ${version}, manual intervention required`);
      }
      
      // Remove migration record
      await client.query(`DELETE FROM ${MIGRATION_TABLE} WHERE version = $1`, [version]);
      
      await client.query('COMMIT');
      console.log(`✅ Migration ${version} rolled back successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Rollback of migration ${version} failed:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async runAll() {
    await this.init();
    await this.loadMigrations();
    
    const pendingMigrations = this.migrations.filter(m => m.version > this.currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  }

  async rollback(version) {
    await this.init();
    await this.rollbackMigration(version);
  }

  async status() {
    await this.init();
    await this.loadMigrations();
    
    const query = `SELECT * FROM ${MIGRATION_TABLE} ORDER BY applied_at DESC`;
    const result = await pool.query(query);
    
    console.log('\nMigration Status:');
    console.log('==================');
    
    for (const migration of this.migrations) {
      const applied = result.rows.find(row => row.version === migration.version);
      const status = applied ? '✅ Applied' : '⏳ Pending';
      const date = applied ? applied.applied_at : 'N/A';
      
      console.log(`${status} ${migration.version} - ${migration.filename} (${date})`);
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const migration = new SafeMigration();
  
  try {
    switch (command) {
      case 'migrate':
        await migration.runAll();
        break;
      case 'rollback':
        const version = process.argv[3];
        if (!version) {
          console.error('Usage: node safe-migration.js rollback <version>');
          process.exit(1);
        }
        await migration.rollback(version);
        break;
      case 'status':
        await migration.status();
        break;
      default:
        console.log('Usage: node safe-migration.js {migrate|rollback|status}');
        console.log('  migrate          - Run all pending migrations');
        console.log('  rollback <ver>   - Rollback specific migration');
        console.log('  status           - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = SafeMigration;
