"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertReturningId = exports.execute = exports.selectMany = exports.selectOne = exports.ensureSchema = void 0;
const client = (process.env.DB_CLIENT || 'sqlite');
let impl;
async function loadImpl() {
    if (client === 'pg')
        impl = await Promise.resolve().then(() => __importStar(require('./pg')));
    else
        impl = await Promise.resolve().then(() => __importStar(require('./sqlite')));
    return impl;
}
// Initialize the implementation
const implPromise = loadImpl();
const ensureSchema = async (...args) => {
    const { ensureSchema: fn } = await implPromise;
    return fn(...args);
};
exports.ensureSchema = ensureSchema;
const selectOne = async (...args) => {
    const { selectOne: fn } = await implPromise;
    return fn(...args);
};
exports.selectOne = selectOne;
const selectMany = async (...args) => {
    const { selectMany: fn } = await implPromise;
    return fn(...args);
};
exports.selectMany = selectMany;
const execute = async (...args) => {
    const { execute: fn } = await implPromise;
    return fn(...args);
};
exports.execute = execute;
const insertReturningId = async (...args) => {
    const { insertReturningId: fn } = await implPromise;
    return fn(...args);
};
exports.insertReturningId = insertReturningId;
//# sourceMappingURL=index.js.map