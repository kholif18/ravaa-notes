/**
 * Simple in-memory rate limiter for Ravaa Drive (Phase 7.8)
 * Not suitable for multi-instance production (use Redis), but prevents brute force in single-instance dev.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Cleanup every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }, 60_000).unref?.();
}

export function rateLimit(key: string, windowMs: number, max: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (entry.count < max) {
    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: false, retryAfterMs: entry.resetAt - now };
}

export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
