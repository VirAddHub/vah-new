const { db } = require('../db');

async function cleanupExpiredTokens() {
  // Adapter converts ? -> $1 on PG. Always pass param array.
  await db.run('DELETE FROM invoice_token WHERE expires_at < ?', [new Date()]);
}

module.exports = { cleanupExpiredTokens };
