function dbKind(u = process.env.DATABASE_URL || '') {
    const s = String(u).trim();
    if (/^postgres(ql)?:/i.test(s)) return 'pg';
    if (/^sqlite:|^file:/i.test(s)) return 'sqlite';
    if (!s) return 'sqlite'; // default to sqlite locally
    return 'sqlite';
}
module.exports = { dbKind };
