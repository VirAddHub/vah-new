/**
 * Barrel exports for common utilities
 * 
 * Usage:
 *   import { api, formatDate, isEmail, useAsync } from '@/lib';
 */

export { default as api } from './http';
export type { ApiResponse, ApiOk, ApiError } from './http';

export { formatDate, formatDateTime, formatDateShort, formatRelativeTime } from './date';

export {
    isEmail,
    isStrongPassword,
    isUKPhone,
    validateRequired,
    validateEmail,
    validatePassword,
    validatePhone,
} from './validators';

export { isAuthenticatedClientHint, checkAdminStatus } from './auth';

// Re-export useAsync hook (if you want it here, or import directly from hooks/)
// export { useAsync } from '../hooks/useAsync';
