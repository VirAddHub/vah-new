import { Pool } from 'pg';

const conn = process.env.DATABASE_URL;
if (!conn) {
  throw new Error('Missing DATABASE_URL');
}

// Basic parsing for PGSSLMODE; default is "prefer"/off locally.
let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;
const mode = (process.env.PGSSLMODE || '').toLowerCase();
if (mode === 'require') ssl = { rejectUnauthorized: false };
if (conn.includes('sslmode=disable')) ssl = false;

export const pool = new Pool({
  connectionString: conn,
  ssl,
});
