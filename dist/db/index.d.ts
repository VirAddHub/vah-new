export type DBClient = 'sqlite' | 'pg';
export declare const ensureSchema: (...args: any[]) => Promise<any>;
export declare const selectOne: (...args: any[]) => Promise<any>;
export declare const selectMany: (...args: any[]) => Promise<any>;
export declare const execute: (...args: any[]) => Promise<any>;
export declare const insertReturningId: (...args: any[]) => Promise<any>;
