// src/db/index.ts
// PostgreSQL database adapter - exports PostgreSQL implementation only

// Always use PostgreSQL - no other database is supported
// eslint-disable-next-line @typescript-eslint/no-var-requires
const impl = require('./pg');

export const {
    ensureSchema,
    selectOne,
    selectMany,
    execute,
    insertReturningId,
} = impl;
