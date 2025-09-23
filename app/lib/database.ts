// app/lib/database.ts
// Frontend database utilities - synced from backend concepts

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
}

export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

export interface QueryOptions {
    timeout?: number;
    retries?: number;
}

/**
 * Frontend database client for API interactions
 */
export class DatabaseClient {
    private baseUrl: string;
    private timeout: number;

    constructor(baseUrl: string = '/api/db', timeout: number = 30000) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }

    /**
     * Execute a query through the API
     */
    async query<T = any>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<QueryResult<T>> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                signal: controller.signal,
                body: JSON.stringify({
                    sql,
                    params,
                    options,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Database query failed: ${errorText}`);
            }

            return response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Execute a query and return the first row
     */
    async get<T = any>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<T | null> {
        const result = await this.query<T>(sql, params, options);
        return result.rows[0] || null;
    }

    /**
     * Execute a query and return all rows
     */
    async all<T = any>(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<T[]> {
        const result = await this.query<T>(sql, params, options);
        return result.rows;
    }

    /**
     * Execute a query and return the number of affected rows
     */
    async run(sql: string, params: any[] = [], options: QueryOptions = {}): Promise<number> {
        const result = await this.query(sql, params, options);
        return result.rowCount;
    }

    /**
     * Execute multiple queries in a transaction
     */
    async transaction<T>(queries: Array<{ sql: string; params?: any[] }>): Promise<T[]> {
        const response = await fetch(`${this.baseUrl}/transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ queries }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Database transaction failed: ${errorText}`);
        }

        return response.json();
    }
}

/**
 * Utility functions for common database operations
 */
export class DatabaseUtils {
    /**
     * Escape a string for SQL
     */
    static escapeString(str: string): string {
        return str.replace(/'/g, "''");
    }

    /**
     * Build a WHERE clause with parameters
     */
    static buildWhereClause(conditions: Record<string, any>): { sql: string; params: any[] } {
        const clauses: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(conditions)) {
            if (value !== null && value !== undefined) {
                if (Array.isArray(value)) {
                    const placeholders = value.map(() => `$${paramIndex++}`).join(',');
                    clauses.push(`${key} IN (${placeholders})`);
                    params.push(...value);
                } else {
                    clauses.push(`${key} = $${paramIndex++}`);
                    params.push(value);
                }
            }
        }

        return {
            sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
            params,
        };
    }

    /**
     * Build an ORDER BY clause
     */
    static buildOrderClause(orderBy: string | string[], direction: 'ASC' | 'DESC' = 'ASC'): string {
        if (Array.isArray(orderBy)) {
            return `ORDER BY ${orderBy.join(', ')} ${direction}`;
        }
        return `ORDER BY ${orderBy} ${direction}`;
    }

    /**
     * Build a LIMIT clause
     */
    static buildLimitClause(limit: number, offset?: number): string {
        if (offset !== undefined) {
            return `LIMIT ${limit} OFFSET ${offset}`;
        }
        return `LIMIT ${limit}`;
    }
}

// Export singleton instance
export const db = new DatabaseClient();
export const dbUtils = DatabaseUtils;
