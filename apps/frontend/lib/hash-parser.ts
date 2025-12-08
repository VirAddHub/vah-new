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
 * Handles format: #page-{"key":"value"} or #blog-post-{"slug":"test"}
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
  
  // Check for blog-post first (special case with hyphen in page name)
  if (hash.startsWith('#blog-post-')) {
    const blogData = parseBlogHash(hash);
    if (blogData) {
      return { page: 'blog-post', data: blogData };
    }
    // If blog hash parsing fails, fall through to general parsing
  }
  
  // Find where JSON data starts (look for '{' or '[')
  // The data part starts with JSON, so we need to find the last '-' before the JSON
  // But since page names can have hyphens, we look for the JSON start instead
  let jsonStartIndex = -1;
  for (let i = 0; i < withoutHash.length; i++) {
    if (withoutHash[i] === '{' || withoutHash[i] === '[') {
      jsonStartIndex = i;
      break;
    }
  }
  
  if (jsonStartIndex === -1) {
    // No JSON data, just page name
    return { page: withoutHash };
  }
  
  // Find the last '-' before the JSON start
  const pageEndIndex = withoutHash.lastIndexOf('-', jsonStartIndex - 1);
  if (pageEndIndex === -1) {
    // No dash before JSON, treat entire string as page
    return { page: withoutHash };
  }
  
  const page = withoutHash.slice(0, pageEndIndex);
  const dataString = withoutHash.slice(pageEndIndex + 1);
  
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

