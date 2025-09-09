export type DBClient = 'sqlite' | 'pg';
const client = (process.env.DB_CLIENT || 'sqlite') as DBClient;

let impl: any;
if (client === 'pg') impl = await import('./pg');
else impl = await import('./sqlite');

export const { ensureSchema, selectOne, selectMany, execute, insertReturningId } = impl;
