import fs from "fs";
import path from "path";
import { Client } from "pg";

function log(msg: string) {
  console.log(`[migrate-sql] ${msg}`);
}

async function main() {
  const MIGRATIONS_DIR = process.argv[2] || "apps/backend/migrations";
  const fromArg = process.argv.find(a => a.startsWith("--from="))?.split("=")[1];
  const toArg = process.argv.find(a => a.startsWith("--to="))?.split("=")[1];
  const dryRun = process.argv.includes("--dry-run");
  const single = process.argv.find(a => a.startsWith("--file="))?.split("=")[1];

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const dir = path.resolve(MIGRATIONS_DIR);
  if (!fs.existsSync(dir)) {
    console.error(`Migrations dir not found: ${dir}`);
    process.exit(1);
  }

  let files = (single
    ? [single]
    : fs.readdirSync(dir)
        .filter(f => f.endsWith(".sql"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  ).map(f => (path.isAbsolute(f) ? f : path.join(dir, f)));

  if (fromArg || toArg) {
    files = files.filter(fp => {
      const base = path.basename(fp);
      const num = parseInt(base.split("_")[0], 10);
      if (Number.isNaN(num)) return false;
      if (fromArg && num < parseInt(fromArg, 10)) return false;
      if (toArg && num > parseInt(toArg, 10)) return false;
      return true;
    });
  }

  if (!files.length) {
    log("No migration files selected.");
    return;
  }

  log(`Selected ${files.length} file(s):`);
  files.forEach(f => log(" - " + path.basename(f)));

  if (dryRun) {
    log("Dry-run complete (no DB changes).");
    return;
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("BEGIN;");
    for (const file of files) {
      const sql = fs.readFileSync(file, "utf8");
      log(`Running ${path.basename(file)} ...`);
      await client.query(sql);
      log(`OK: ${path.basename(file)}`);
    }
    await client.query("COMMIT;");
    log("All migrations committed.");
  } catch (err: any) {
    await client.query("ROLLBACK;");
    console.error("Migration failed. Rolled back.");
    console.error(err?.stack || err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
