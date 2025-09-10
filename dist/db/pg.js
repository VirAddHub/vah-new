"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSchema = ensureSchema;
exports.selectOne = selectOne;
exports.selectMany = selectMany;
exports.execute = execute;
exports.insertReturningId = insertReturningId;
const pg_1 = require("pg");
const schema_1 = require("./schema");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : undefined,
});
async function withClient(fn) {
    const c = await pool.connect();
    try {
        return await fn(c);
    }
    finally {
        c.release();
    }
}
async function ensureSchema() {
    await withClient(async (c) => {
        await c.query('BEGIN');
        try {
            await c.query(schema_1.BOOTSTRAP_SQL);
            await c.query('COMMIT');
            console.log('✅ PG schema ensured');
        }
        catch (e) {
            await c.query('ROLLBACK');
            console.error('❌ PG bootstrap failed', e);
            throw e;
        }
    });
}
async function selectOne(sql, params = []) {
    const { rows } = await withClient(c => c.query(sql, params));
    return rows[0] ?? null;
}
async function selectMany(sql, params = []) {
    const { rows } = await withClient(c => c.query(sql, params));
    return rows;
}
async function execute(sql, params = []) {
    const { rowCount } = await withClient(c => c.query(sql, params));
    return { rowsAffected: rowCount || 0 };
}
async function insertReturningId(sql, params = []) {
    const { rows } = await withClient(c => c.query(sql, params));
    if (!rows[0] || typeof rows[0].id === 'undefined')
        throw new Error('insertReturningId: add `RETURNING id` to INSERT when using PG');
    return Number(rows[0].id);
}
//# sourceMappingURL=pg.js.map