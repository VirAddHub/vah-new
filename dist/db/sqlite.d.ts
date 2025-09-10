export declare function ensureSchema(): Promise<void>;
export declare function selectOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
export declare function selectMany<T = any>(sql: string, params?: any[]): Promise<T[]>;
export declare function execute(sql: string, params?: any[]): Promise<{
    rowsAffected: number;
    lastId?: number;
}>;
export declare function insertReturningId(sql: string, params?: any[]): Promise<number>;
