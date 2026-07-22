import type { ServerConfig } from "../config.js";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private ipBuckets = new Map<string, Bucket>();
  private userBuckets = new Map<string, Bucket>();

  constructor(
    private perIpLimit: number,
    private perUserLimit: number
  ) {}

  check(ip: string, userId: string | null, now = Date.now()): RateLimitResult {
    const ipResult = this.consume(this.ipBuckets, ip || "unknown", this.perIpLimit, now);
    if (!ipResult.allowed) return ipResult;
    if (userId) {
      return this.consume(this.userBuckets, userId, this.perUserLimit, now);
    }
    return { allowed: true };
  }

  private consume(map: Map<string, Bucket>, key: string, limit: number, now: number): RateLimitResult {
    const windowMs = 60_000;
    let bucket = map.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      map.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }
    return { allowed: true };
  }

  clear(): void {
    this.ipBuckets.clear();
    this.userBuckets.clear();
  }
}

let defaultLimiter: RateLimiter | null = null;

export function getRateLimiter(config: ServerConfig): RateLimiter {
  defaultLimiter ??= new RateLimiter(config.rateLimitPerIp, config.rateLimitPerUser);
  return defaultLimiter;
}

export function resetRateLimiterForTests(): void {
  defaultLimiter = null;
}

export function clientIpFromHeaders(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}

export function userIdFromHeaders(headers: Record<string, string | string[] | undefined>): string | null {
  const raw = headers["x-estimate-user-id"];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim().slice(0, 128);
  return trimmed || null;
}
