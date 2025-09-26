const { Pool } = require('pg');
const { BOOTSTRAP_SQL } = require('./schema');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : undefined,
});

async function withClient(fn) {
    const c = await pool.connect();
    try {
        return await fn(c);
    } finally {
        c.release();
    }
}

async function ensureSchema() {
    await withClient(async c => {
        await c.query('BEGIN');
        try {
            await c.query(BOOTSTRAP_SQL);
            await c.query('COMMIT');
            console.log('✅ PG schema ensured');
        } catch (e) {
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
    if (!rows[0] || typeof rows[0].id === 'undefined') {
        throw new Error('insertReturningId: add `RETURNING id` to INSERT when using PG');
    }
    return Number(rows[0].id);
}

module.exports = {
    ensureSchema,
    selectOne,
    selectMany,
    execute,
    insertReturningId
};
