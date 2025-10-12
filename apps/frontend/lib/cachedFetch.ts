/**
 * Cached fetch utility for request coalescing
 * Prevents duplicate requests and provides intelligent caching
 */

interface CacheEntry {
  promise: Promise<Response>;
  timestamp: number;
  ttl: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 2 * 60 * 1000; // 2 minutes

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const headers = options?.headers ? JSON.stringify(options.headers) : '';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${headers}:${body}`;
  }

  async fetch(url: string, options?: RequestInit, ttl?: number): Promise<Response> {
    const key = this.generateKey(url, options);
    const now = Date.now();
    const cacheTTL = ttl || this.defaultTTL;

    // Check if we have a valid cached request
    const existing = this.cache.get(key);
    if (existing && !this.isExpired(existing)) {
      // Return a clone of the cached response
      const response = await existing.promise;
      return response.clone();
    }

    // Create new request
    const promise = fetch(url, {
      ...options,
      // Add cache control headers for GET requests
      ...(options?.method === 'GET' || !options?.method ? {
        headers: {
          ...options?.headers,
          'Cache-Control': 'max-age=300', // 5 minutes
        },
      } : {}),
    });

    // Cache the promise
    this.cache.set(key, {
      promise,
      timestamp: now,
      ttl: cacheTTL,
    });

    // Clean up expired entries
    this.cleanup();

    // Handle errors by removing from cache
    promise.catch(() => {
      this.cache.delete(key);
    });

    return promise;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const requestCache = new RequestCache();

/**
 * Cached fetch function that coalesces duplicate requests
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param ttl - Time to live in milliseconds (default: 2 minutes)
 * @returns Promise<Response>
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl?: number
): Promise<Response> {
  return requestCache.fetch(url, options, ttl);
}

/**
 * Clear the request cache (useful for testing or memory management)
 */
export function clearRequestCache(): void {
  requestCache.clear();
}

/**
 * Get cache size for monitoring
 */
export function getCacheSize(): number {
  return requestCache.size();
}

// Export for testing
export { RequestCache };
