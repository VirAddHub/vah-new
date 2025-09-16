// scripts/lib/db-path.cjs
const path = require('path');
const fs = require('fs');

function resolveDbPath() {
  const envUrl =
    process.env.DATABASE_URL ||
    process.env.DB_PATH ||
    process.env.SQLITE_PATH ||
    'vah.db';

  let p = envUrl;
  if (p.startsWith('file:')) p = p.replace(/^file:/, '');
  if (p.startsWith('sqlite:')) p = p.replace(/^sqlite:/, '');

  if (!path.isAbsolute(p)) p = path.join(process.cwd(), p);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

module.exports = { resolveDbPath };
