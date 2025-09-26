function dbKind(u = process.env.DATABASE_URL || '') {
    const s = String(u).trim();
    if (/^postgres(ql)?:/i.test(s)) return 'pg';
    if (/^sqlite:|^file:/i.test(s)) return 'sqlite';
    if (!s) {
        console.error('[db-kind] DATABASE_URL is required for PostgreSQL-only mode');
        process.exit(1);
    }
    return 'sqlite';
}
module.exports = { dbKind };
