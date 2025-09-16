// lib/migrate.ts - Simple migration system
import { Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Migration {
  id: string;
  name: string;
  up: (db: Database) => void;
  down?: (db: Database) => void;
}

// Ensure migrations table exists
function ensureMigrationsTable(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// Get applied migrations
function getAppliedMigrations(db: Database): string[] {
  const rows = db.prepare('SELECT id FROM migrations ORDER BY applied_at').all() as { id: string }[];
  return rows.map(row => row.id);
}

// Apply a migration
function applyMigration(db: Database, migration: Migration) {
  const tx = db.transaction(() => {
    migration.up(db);
    db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)')
      .run(migration.id, migration.name);
  });
  tx();
}

// Rollback a migration
function rollbackMigration(db: Database, migration: Migration) {
  if (!migration.down) {
    throw new Error(`Migration ${migration.id} does not support rollback`);
  }
  
  const tx = db.transaction(() => {
    migration.down!(db);
    db.prepare('DELETE FROM migrations WHERE id = ?').run(migration.id);
  });
  tx();
}

// Define migrations
const migrations: Migration[] = [
  {
    id: '001_add_session_columns',
    name: 'Add session_token and session_created_at columns to user table',
    up: (db) => {
      // Check if columns exist before adding
      const hasSessionToken = db.prepare(
        "SELECT 1 FROM pragma_table_info('user') WHERE name='session_token'"
      ).get();
      
      if (!hasSessionToken) {
        db.exec('ALTER TABLE user ADD COLUMN session_token TEXT');
      }
      
      const hasSessionCreatedAt = db.prepare(
        "SELECT 1 FROM pragma_table_info('user') WHERE name='session_created_at'"
      ).get();
      
      if (!hasSessionCreatedAt) {
        db.exec('ALTER TABLE user ADD COLUMN session_created_at TEXT');
      }
    },
    down: (db) => {
      // Note: SQLite doesn't support DROP COLUMN, so we can't truly rollback
      console.warn('Cannot rollback column additions in SQLite');
    }
  },
  {
    id: '002_add_password_hash_column',
    name: 'Add password_hash column to user table',
    up: (db) => {
      const hasPasswordHash = db.prepare(
        "SELECT 1 FROM pragma_table_info('user') WHERE name='password_hash'"
      ).get();
      
      if (!hasPasswordHash) {
        db.exec('ALTER TABLE user ADD COLUMN password_hash TEXT');
      }
    },
    down: (db) => {
      console.warn('Cannot rollback column additions in SQLite');
    }
  },
  {
    id: '003_add_audit_log_table',
    name: 'Add audit_log table for tracking user actions',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES user(id)
        )
      `);
    },
    down: (db) => {
      db.exec('DROP TABLE IF EXISTS audit_log');
    }
  },
  {
    id: '004_add_webhook_log_table',
    name: 'Add webhook_log table for tracking webhook events',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS webhook_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          webhook_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL,
          response TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    },
    down: (db) => {
      db.exec('DROP TABLE IF EXISTS webhook_log');
    }
  }
];

// Run migrations
export function runMigrations(db: Database) {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrations(db);
  
  console.log(`Found ${applied.length} applied migrations`);
  
  for (const migration of migrations) {
    if (!applied.includes(migration.id)) {
      console.log(`Applying migration: ${migration.name}`);
      applyMigration(db, migration);
    }
  }
  
  console.log('All migrations applied successfully');
}

// Rollback migrations
export function rollbackMigrations(db: Database, count: number = 1) {
  ensureMigrationsTable(db);
  const applied = getAppliedMigrations(db);
  
  for (let i = 0; i < count && applied.length > 0; i++) {
    const migrationId = applied.pop()!;
    const migration = migrations.find(m => m.id === migrationId);
    
    if (migration) {
      console.log(`Rolling back migration: ${migration.name}`);
      rollbackMigration(db, migration);
    }
  }
}
