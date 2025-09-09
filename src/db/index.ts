export type DBClient = 'sqlite' | 'pg';
const client = (process.env.DB_CLIENT || 'sqlite') as DBClient;

let impl: any;

async function loadImpl() {
    if (client === 'pg') impl = await import('./pg');
    else impl = await import('./sqlite');
    return impl;
}

// Initialize the implementation
const implPromise = loadImpl();

export const ensureSchema = async (...args: any[]) => {
    const { ensureSchema: fn } = await implPromise;
    return fn(...args);
};

export const selectOne = async (...args: any[]) => {
    const { selectOne: fn } = await implPromise;
    return fn(...args);
};

export const selectMany = async (...args: any[]) => {
    const { selectMany: fn } = await implPromise;
    return fn(...args);
};

export const execute = async (...args: any[]) => {
    const { execute: fn } = await implPromise;
    return fn(...args);
};

export const insertReturningId = async (...args: any[]) => {
    const { insertReturningId: fn } = await implPromise;
    return fn(...args);
};
