// src/db/sqlite.ts
// SQLite adapter using better-sqlite3
// This is a stub implementation - in production you should use PostgreSQL

type Row = any;
type Rows = any[];

// Mock database since better-sqlite3 is not installed
const mockDb = {
    data: new Map(),

    prepare(sql: string) {
        return {
            get(...params: any[]): Row | undefined {
                console.warn('[sqlite-stub] prepare.get:', sql, params);
                return undefined;
            },
            all(...params: any[]): Rows {
                console.warn('[sqlite-stub] prepare.all:', sql, params);
                return [];
            },
            run(...params: any[]): { lastInsertRowid: number; changes: number } {
                console.warn('[sqlite-stub] prepare.run:', sql, params);
                return { lastInsertRowid: 1, changes: 1 };
            }
        };
    },

    exec(sql: string): void {
        console.warn('[sqlite-stub] exec:', sql);
    }
};

export async function ensureSchema(): Promise<void> {
    console.warn('[sqlite-stub] ensureSchema - using stub implementation');
    console.warn('[sqlite-stub] IMPORTANT: Install better-sqlite3 or switch to PostgreSQL for production');
}

export async function selectOne<T = Row>(sql: string, params: any[] = []): Promise<T | null> {
    console.warn('[sqlite-stub] selectOne:', sql, params);
    const stmt = mockDb.prepare(sql);
    const row = stmt.get(...params);
    return (row as T) || null;
}

export async function selectMany<T = Row>(sql: string, params: any[] = []): Promise<T[]> {
    console.warn('[sqlite-stub] selectMany:', sql, params);
    const stmt = mockDb.prepare(sql);
    return stmt.all(...params) as T[];
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
    console.warn('[sqlite-stub] execute:', sql, params);
    const stmt = mockDb.prepare(sql);
    stmt.run(...params);
}

export async function insertReturningId(sql: string, params: any[] = []): Promise<number> {
    console.warn('[sqlite-stub] insertReturningId:', sql, params);
    const stmt = mockDb.prepare(sql);
    const result = stmt.run(...params);
    return result.lastInsertRowid;
}
