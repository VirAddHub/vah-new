// E2E test utilities
import supertest from 'supertest';

// Retry helper for flaky network requests
export async function fetchWithRetry(
  requestFn: () => Promise<any>,
  maxRetries = 5,
  backoffMs = 250
): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Retry on 502, ECONNRESET, or timeout errors
      const shouldRetry = 
        error.status === 502 ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT');
      
      if (!shouldRetry || attempt === maxRetries) {
        throw error;
      }
      
      console.log(`E2E retry ${attempt}/${maxRetries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      backoffMs *= 1.5; // exponential backoff
    }
  }
  
  throw lastError;
}

// API client that uses environment variable for base URL
// E2E_BASE_URL must be set (e.g., https://vah-api-staging.onrender.com)
export function api() {
  const base = process.env.E2E_BASE_URL;
  if (!base) {
    throw new Error('E2E_BASE_URL environment variable is required. Set it to your Render staging API URL.');
  }
  return supertest(base);
}

// Health check with retry
export async function healthCheck() {
  return fetchWithRetry(() => api().get('/api/healthz'));
}
