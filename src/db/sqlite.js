const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = process.env.SQLITE_PATH || 'vah.db';
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '');
const db = new Database(DB_PATH);

function normalize(sql) { return sql.replace(/\$\d+/g, '?'); }

async function ensureSchema() { /* no-op for now */ }

async function selectOne(sql, params = []) {
    const stmt = db.prepare(normalize(sql));
    return stmt.get(...params) ?? null;
}

async function selectMany(sql, params = []) {
    const stmt = db.prepare(normalize(sql));
    return stmt.all(...params);
}

async function execute(sql, params = []) {
    const stmt = db.prepare(normalize(sql));
    const info = stmt.run(...params);
    return { rowsAffected: info.changes || 0, lastId: info.lastInsertRowid };
}

async function insertReturningId(sql, params = []) {
    const { lastId } = await execute(sql, params);
    return Number(lastId);
}

module.exports = {
    ensureSchema,
    selectOne,
    selectMany,
    execute,
    insertReturningId
};
