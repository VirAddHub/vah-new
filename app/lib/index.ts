// app/lib/index.ts
// Central export file for all synced backend utilities

// Core utilities
export * from './api';
export * from './urls';
export * from './validation';
export * from './logger';
export * from './env';

// Services
export * from './certificate';
export * from './invoice';

// Middleware and utilities
export * from './middleware';
export * from './audit';
export * from './database';
export * from './storage';

// Existing utilities
export * from './address-finder';
export * from './companies-house';
export * from './pingApi';

// Re-export commonly used utilities for convenience
export { apiClient as api } from './api';
export { authManager, csrfManager, rateLimiter } from './middleware';
export { storage, fileUtils } from './storage';
export { db, dbUtils } from './database';
export { log, warn, crit, clientError, apiError, devLog } from './logger';
