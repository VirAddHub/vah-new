import { db } from '../db';

export async function cleanupExpiredTokens() {
  // Adapter converts ? -> $1 on PG. Passing the param array prevents PG syntax errors.
  await db.run('DELETE FROM invoice_token WHERE expires_at < ?', [new Date()]);
}
