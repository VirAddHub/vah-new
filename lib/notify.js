function getDb() {
  const { db } = require("./db");
  return db;
}

function notify({ userId, type, title, body = "", meta = null }) {
  const db = getDb();
  const now = Date.now();
  db.prepare(`
    INSERT INTO notification (user_id, type, title, body, meta, created_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(userId, String(type), String(title), String(body || ""), meta ? JSON.stringify(meta).slice(0, 50000) : null, now);
}

function unreadCount(userId) {
  const db = getDb();
  const r = db.prepare(`SELECT COUNT(*) AS c FROM notification WHERE user_id = ? AND read_at IS NULL`).get(userId);
  return r?.c || 0;
}

module.exports = { notify, unreadCount };
