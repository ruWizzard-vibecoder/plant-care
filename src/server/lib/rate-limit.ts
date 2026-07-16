/**
 * In-memory sliding window rate limiter.
 * Designed for single-instance deployment (Docker container).
 * Supports tier-based configs for future subscription plans.
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// Store: key → array of request timestamps
const store = new Map<string, number[]>();

// Cleanup stale entries every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store) {
      const fresh = timestamps.filter((t) => now - t < 3_600_000);
      if (fresh.length === 0) {
        store.delete(key);
      } else {
        store.set(key, fresh);
      }
    }
  }, 60_000).unref?.();
}

export function checkRateLimit(
  userId: string,
  routeKey: string,
  config: RateLimitConfig,
): RateLimitResult {
  const key = `${userId}:${routeKey}`;
  const now = Date.now();
  const { windowMs, maxRequests } = config;

  const timestamps = store.get(key) ?? [];
  const windowStart = now - windowMs;
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= maxRequests) {
    const oldestInWindow = recent[0];
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: oldestInWindow + windowMs,
    };
  }

  recent.push(now);
  store.set(key, recent);

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - recent.length,
    resetAt: recent[0] + windowMs,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(retryAfterSec, 1)),
        ...rateLimitHeaders(result),
      },
    },
  );
}
