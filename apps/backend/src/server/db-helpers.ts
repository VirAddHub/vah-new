// apps/backend/src/server/db-helpers.ts
// Re-export the configurable database functions
export { selectOne, selectMany, execute, insertReturningId } from "../db";

// Alias for backward compatibility
import { selectMany } from "../db";
export const many = selectMany;

import { getPool } from "./db";

/**
 * Paginated query helper for SWR frontend
 * @param query - SQL query (without LIMIT/OFFSET)
 * @param params - Query parameters
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated response with items, total, page, pageSize
 */
export async function selectPaged<T = any>(
    query: string,
    params: any[] = [],
    page = 1,
    pageSize = 20
): Promise<{ items: T[]; total: number; page: number; pageSize: number }> {
    const pool = getPool();
    const offset = (page - 1) * pageSize;

    // Get paginated items
    const itemsResult = await pool.query(
        `${query} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
    );

    // Get total count - extract the base query for counting
    // Remove ORDER BY clause for count query (it's not needed and can cause issues)
    const countQuery = query.split(/ORDER BY/i)[0].trim();

    // Check if query has FROM clause to determine if it's a subquery
    const hasFrom = /FROM/i.test(countQuery);

    let totalResult;
    if (hasFrom) {
        // Regular query - count directly
        totalResult = await pool.query(
            `SELECT COUNT(*) as count FROM (${countQuery}) AS count_query`,
            params
        );
    } else {
        // Simple query - count directly
        totalResult = await pool.query(
            `SELECT COUNT(*) as count ${countQuery}`,
            params
        );
    }

    return {
        items: itemsResult.rows,
        total: parseInt(totalResult.rows[0]?.count || '0'),
        page,
        pageSize,
    };
}