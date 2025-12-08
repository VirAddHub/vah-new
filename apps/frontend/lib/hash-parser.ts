/**
 * Safely parse blog post hash from URL
 * Handles format: #blog-post-{"slug":"test-post"}
 * Returns null if hash is invalid or cannot be parsed
 */
export function parseBlogHash(hash: string): { slug: string } | null {
  const prefix = '#blog-post-';
  
  if (!hash.startsWith(prefix)) {
    return null;
  }
  
  const encoded = hash.slice(prefix.length); // after "#blog-post-"
  
  if (!encoded) {
    return null;
  }
  
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch (err) {
    console.error('[parseBlogHash] Failed to decode blog hash, ignoring:', encoded, err);
    return null;
  }
  
  let payload: any;
  try {
    payload = JSON.parse(decoded);
  } catch (err) {
    console.error('[parseBlogHash] Failed to parse blog hash JSON, ignoring:', decoded, err);
    return null;
  }
  
  if (payload && typeof payload.slug === 'string') {
    return { slug: payload.slug };
  }
  
  return null;
}

/**
 * Safely parse any navigation hash with data
 * Handles format: #page-{"key":"value"}
 * Returns { page, data } or null if invalid
 */
export function parseNavigationHash(hash: string): { page: string; data?: any } | null {
  if (!hash || !hash.startsWith('#')) {
    return null;
  }
  
  const withoutHash = hash.slice(1);
  if (!withoutHash) {
    return null;
  }
  
  // Find the first '-' that separates page from data
  const dashIndex = withoutHash.indexOf('-');
  if (dashIndex === -1) {
    // No data, just page name
    return { page: withoutHash };
  }
  
  const page = withoutHash.slice(0, dashIndex);
  const dataString = withoutHash.slice(dashIndex + 1);
  
  if (!dataString) {
    return { page };
  }
  
  let decoded: string;
  try {
    decoded = decodeURIComponent(dataString);
  } catch (err) {
    console.error('[parseNavigationHash] Failed to decode hash data, ignoring:', dataString, err);
    return { page };
  }
  
  let data: any;
  try {
    data = JSON.parse(decoded);
  } catch (err) {
    console.error('[parseNavigationHash] Failed to parse hash JSON, ignoring:', decoded, err);
    return { page };
  }
  
  return { page, data };
}

