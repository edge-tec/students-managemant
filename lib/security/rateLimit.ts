interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetTime: number;
}

/**
 * Sliding window in-memory rate limiter for brute-force protection.
 * @param key Unique identifier (e.g. IP + endpoint, or email + IP)
 * @param limit Maximum allowed requests within the window
 * @param windowMs Window duration in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryStore.set(key, newEntry);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: 0,
      resetTime: newEntry.resetTime,
    };
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      resetTime: entry.resetTime,
    };
  }

  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    retryAfterSeconds: 0,
    resetTime: entry.resetTime,
  };
}

/**
 * Resets the rate limiter for a specific key upon successful authentication.
 */
export function resetRateLimit(key: string): void {
  memoryStore.delete(key);
}

/**
 * Clean up expired entries periodically to prevent memory leaks.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();
