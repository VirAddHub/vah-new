// src/db/index.ts
// Works in CommonJS build (dist) and avoids top-level await.

// Choose impl once based on env
const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

let impl: any;
// Use require so TS compiles to CJS cleanly
// eslint-disable-next-line @typescript-eslint/no-var-requires
impl = client === 'pg' ? require('./pg') : require('./sqlite');

export const {
    ensureSchema,
    selectOne,
    selectMany,
    execute,
    insertReturningId,
} = impl;
