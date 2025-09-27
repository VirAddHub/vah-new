import path from 'node:path';
import fs from 'node:fs';

export function resolveDbPath(input?: string) {
  // Postgres-only mode - return DATABASE_URL or default
  return input || process.env.DATABASE_URL || 'postgres://localhost/vah';
}
