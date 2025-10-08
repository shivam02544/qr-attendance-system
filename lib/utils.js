/**
 * Get the current base URL for the application
 * This handles both localhost and network IP addresses
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side: use environment variable or default
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Get the current host from the request headers
 */
export function getHostFromHeaders(headers) {
  const host = headers.get('host') || headers.get('x-forwarded-host');
  const protocol = headers.get('x-forwarded-proto') || 'http';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  return getBaseUrl();
}