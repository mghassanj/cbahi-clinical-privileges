/**
 * Simple in-memory rate limiter for API routes
 *
 * For production at scale, consider using Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  });
}, 60000); // Clean up every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 100, windowMs: 60000 }
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, config.limit - entry.count);

  return {
    success: entry.count <= config.limit,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };
}

/**
 * Rate limit configurations for different API types
 */
export const RATE_LIMITS = {
  // Standard API calls
  api: { limit: 100, windowMs: 60000 }, // 100 requests per minute

  // Authentication endpoints (stricter)
  auth: { limit: 10, windowMs: 60000 }, // 10 requests per minute

  // File uploads (stricter)
  upload: { limit: 20, windowMs: 60000 }, // 20 uploads per minute

  // Admin endpoints
  admin: { limit: 50, windowMs: 60000 }, // 50 requests per minute

  // Sync operations (very strict)
  sync: { limit: 5, windowMs: 300000 }, // 5 syncs per 5 minutes
};
