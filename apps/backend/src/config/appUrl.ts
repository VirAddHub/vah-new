// apps/backend/src/config/appUrl.ts
// Application URL configuration helper

import { ENV } from './env';

/**
 * Get the application base URL
 * - Production: https://virtualaddresshub.co.uk
 * - Development: http://localhost:3000
 * 
 * Validates that URL starts with http:// or https://
 */
export function getAppUrl(): string {
    const url = ENV.APP_BASE_URL || 
                process.env.APP_URL || 
                (process.env.NODE_ENV === 'production' 
                    ? 'https://virtualaddresshub.co.uk' 
                    : 'http://localhost:3000');
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error(`APP_URL must start with http:// or https://, got: ${url}`);
    }
    
    return url.replace(/\/$/, ''); // Remove trailing slash
}

