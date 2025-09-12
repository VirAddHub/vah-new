"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_path_1 = __importDefault(require("node:path"));
const DB_PATH = process.env.DATABASE_URL || process.env.DB_PATH || node_path_1.default.join(process.cwd(), "data", "app.db");
exports.db = new better_sqlite3_1.default(DB_PATH, { fileMustExist: false });
// Safety PRAGMAs
exports.db.pragma("journal_mode = WAL");
exports.db.pragma("synchronous = NORMAL");
exports.db.pragma("foreign_keys = ON");
exports.db.pragma("busy_timeout = 5000"); // back off if another writer is busy
exports.default = exports.db;
//# sourceMappingURL=db.js.map