// src/lib/query-cache.ts
// Database query caching for performance optimization

import { getPool } from '../db';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class QueryCache {
    private cache = new Map<string, CacheEntry<any>>();
    private readonly DEFAULT_TTL = 30000; // 30 seconds

    set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Generate cache key from query and parameters
    generateKey(query: string, params: any[] = []): string {
        const normalizedQuery = query.replace(/\s+/g, ' ').trim();
        const paramsStr = params.map(p => String(p)).join('|');
        return `${normalizedQuery}:${paramsStr}`;
    }

    // Cached query execution
    async query<T = any>(
        query: string, 
        params: any[] = [], 
        ttl: number = this.DEFAULT_TTL
    ): Promise<T[]> {
        const key = this.generateKey(query, params);
        
        // Check cache first
        const cached = this.get<T[]>(key);
        if (cached) {
            console.log(`[QueryCache] Cache hit for: ${key.substring(0, 50)}...`);
            return cached;
        }

        // Execute query
        console.log(`[QueryCache] Cache miss, executing: ${query.substring(0, 50)}...`);
        const pool = getPool();
        const result = await pool.query(query, params);
        
        // Cache result
        this.set(key, result.rows, ttl);
        
        return result.rows as T[];
    }

    // Invalidate cache patterns
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    // Invalidate user-specific cache
    invalidateUser(userId: number): void {
        this.invalidatePattern(`user_id.*${userId}`);
        this.invalidatePattern(`user.*${userId}`);
    }

    // Invalidate mail-specific cache
    invalidateMail(mailId?: number): void {
        if (mailId) {
            this.invalidatePattern(`mail_item.*${mailId}`);
        } else {
            this.invalidatePattern('mail_item');
        }
    }

    // Get cache stats
    getStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
export const queryCache = new QueryCache();

// Helper functions for common cached queries
export async function cachedUserQuery<T = any>(
    query: string, 
    params: any[] = [], 
    ttl: number = 30000
): Promise<T[]> {
    return queryCache.query<T>(query, params, ttl);
}

export async function cachedMailQuery<T = any>(
    query: string, 
    params: any[] = [], 
    ttl: number = 15000
): Promise<T[]> {
    return queryCache.query<T>(query, params, ttl);
}

export async function cachedAdminQuery<T = any>(
    query: string, 
    params: any[] = [], 
    ttl: number = 60000
): Promise<T[]> {
    return queryCache.query<T>(query, params, ttl);
}

// Cache invalidation helpers
export function invalidateUserCache(userId: number): void {
    queryCache.invalidateUser(userId);
}

export function invalidateMailCache(mailId?: number): void {
    queryCache.invalidateMail(mailId);
}

export function invalidateAdminCache(): void {
    queryCache.invalidatePattern('admin');
    queryCache.invalidatePattern('stats');
}
