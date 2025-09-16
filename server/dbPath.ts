import path from 'node:path';
import fs from 'node:fs';

export function resolveDbPath(input?: string) {
  let p = input || 'vah.db';

  // Strip URL-ish schemes that can sneak in from env
  if (p.startsWith('file:')) p = p.replace(/^file:/, '');
  if (p.startsWith('sqlite:')) p = p.replace(/^sqlite:/, '');

  if (!path.isAbsolute(p)) p = path.join(process.cwd(), p);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}
