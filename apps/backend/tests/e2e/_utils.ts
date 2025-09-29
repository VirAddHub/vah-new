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
export function api() {
  const base = process.env.E2E_BASE_URL || 'http://localhost:3001';
  return supertest(base);
}

// Health check with retry
export async function healthCheck() {
  return fetchWithRetry(() => api().get('/api/healthz'));
}
