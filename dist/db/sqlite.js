"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSchema = ensureSchema;
exports.selectOne = selectOne;
exports.selectMany = selectMany;
exports.execute = execute;
exports.insertReturningId = insertReturningId;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = process.env.SQLITE_PATH || 'vah.db';
if (!fs_1.default.existsSync(DB_PATH))
    fs_1.default.writeFileSync(DB_PATH, '');
const db = new better_sqlite3_1.default(DB_PATH);
function normalize(sql) { return sql.replace(/\$\d+/g, '?'); }
async function ensureSchema() { }
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
//# sourceMappingURL=sqlite.js.map