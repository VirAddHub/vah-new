// apps/backend/src/server/db-helpers.ts
// Re-export the configurable database functions
export { selectOne, selectMany, execute, insertReturningId } from "../db";

// Alias for backward compatibility
import { selectMany } from "../db";
export const many = selectMany;