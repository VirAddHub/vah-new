#!/usr/bin/env node
/**
 * READ-ONLY PostgreSQL table inspection utility.
 * Uses DATABASE_URL; never runs DELETE/UPDATE/INSERT.
 * Redacts sensitive column values in sample output.
 */

import { Pool } from "pg";

const TABLE_NAME_REGEX = /^[a-zA-Z0-9_]+$/;

const REDACT_PATTERNS = [
  "password",
  "token",
  "secret",
  "api_key",
  "key",
  "hash",
  "session",
  "cookie",
  "authorization",
  "raw_payload",
  "webhook",
  "mandate",
  "card",
  "iban",
  "sort_code",
  "account_number",
  "customer_id",
  "invoice_pdf",
  "pdf",
  "file_url",
  "scan_file_url",
];

function shouldRedact(key: string): boolean {
  const lower = key.toLowerCase();
  return REDACT_PATTERNS.some((p) => lower.includes(p));
}

function redactRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = shouldRedact(k) ? "[REDACTED]" : v;
  }
  return out;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function parseArgs(): {
  tablesFilter: string[] | null;
  noSamples: boolean;
  limit: number;
} {
  let tablesFilter: string[] | null = null;
  let noSamples = false;
  let limit = 5;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--tables=")) {
      const val = arg.slice("--tables=".length).trim();
      if (val) {
        tablesFilter = val.split(",").map((t) => t.trim()).filter(Boolean);
        for (const t of tablesFilter) {
          if (!TABLE_NAME_REGEX.test(t)) {
            console.error(`Invalid table name (use only [a-zA-Z0-9_]): ${t}`);
            process.exit(1);
          }
        }
      }
    } else if (arg === "--no-samples") {
      noSamples = true;
    } else if (arg.startsWith("--limit=")) {
      const n = parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 100) limit = n;
    }
  }

  return { tablesFilter, noSamples, limit };
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) {
    console.error("DATABASE_URL must be set and point to PostgreSQL.");
    process.exit(1);
  }

  const { tablesFilter, noSamples, limit } = parseArgs();

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 1,
    allowExitOnIdle: true,
  });

  try {
    // Resolve list of tables (only from information_schema; never use --tables unchecked in SQL)
    let tableNames: string[];

    if (tablesFilter && tablesFilter.length > 0) {
      const placeholders = tablesFilter.map((_, i) => `$${i + 1}`).join(", ");
      const r = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [tablesFilter]
      );
      tableNames = r.rows.map((row) => row.table_name);
      const missing = tablesFilter.filter((t) => !tableNames.includes(t));
      if (missing.length > 0) {
        console.warn("Tables not found in public schema (skipped):", missing.join(", "));
      }
    } else {
      const r = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`
      );
      tableNames = r.rows.map((row) => row.table_name);
    }

    if (tableNames.length === 0) {
      console.log("No tables to inspect.");
      return;
    }

    for (const tableName of tableNames) {
      const quoted = quoteIdent(tableName);

      console.log("\n" + "=".repeat(60));
      console.log("TABLE:", tableName);
      console.log("=".repeat(60));

      // Columns
      const colResult = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [tableName]
      );

      console.log("\nColumns:");
      for (const c of colResult.rows) {
        console.log(
          `  ${c.column_name}: ${c.data_type} ${c.is_nullable === "YES" ? "NULL" : "NOT NULL"} ${c.column_default != null ? `default ${c.column_default}` : ""}`
        );
      }

      // Primary key
      const pkResult = await pool.query<{ column_name: string }>(
        `SELECT a.attname AS column_name
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) AND a.attisdropped = false
         JOIN pg_class c ON c.oid = i.indrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisprimary`,
        [tableName]
      );
      const pkCols = pkResult.rows.map((r) => r.column_name);
      if (pkCols.length > 0) {
        console.log("\nPrimary key:", pkCols.join(", "));
      }

      // Row count
      const countResult = await pool.query<{ count: string }>(
        `SELECT count(*) AS count FROM ${quoted}`
      );
      const count = countResult.rows[0]?.count ?? "0";
      console.log("\nRow count:", count);

      // Sample rows (newest 5)
      if (!noSamples && parseInt(String(count), 10) > 0) {
        const columns = colResult.rows.map((c) => quoteIdent(c.column_name)).join(", ");
        const hasCreatedAt = colResult.rows.some((c) => c.column_name === "created_at");
        const hasId = colResult.rows.some((c) => c.column_name === "id");
        let orderBy = "";
        if (hasCreatedAt) orderBy = ` ORDER BY ${quoteIdent("created_at")} DESC`;
        else if (hasId) orderBy = ` ORDER BY ${quoteIdent("id")} DESC`;

        const sampleResult = await pool.query(
          `SELECT ${columns} FROM ${quoted}${orderBy} LIMIT $1`,
          [limit]
        );

        console.log(`\nSample rows (newest ${Math.min(sampleResult.rows.length, limit)}):`);
        for (let i = 0; i < sampleResult.rows.length; i++) {
          const raw = sampleResult.rows[i] as Record<string, unknown>;
          const redacted = redactRow(raw);
          console.log(JSON.stringify(redacted, null, 2).replace(/^/gm, "  "));
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Done (read-only).");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
