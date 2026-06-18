// 简易内存限流器（sliding-window，单进程可用）
// 在多进程部署时建议替换为 Redis / Upstash / rate-limit-redis
// 当前规则：同 IP + key 在 windowMs 时间内最多 max 次请求

type Bucket = { timestamps: number[] };
const store = new Map<string, Bucket>();

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export type RateLimitResult = {
  passed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
};

function rateLimitInternal(storeKey: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = store.get(storeKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    store.set(storeKey, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  const remaining = Math.max(0, max - bucket.timestamps.length - 1);
  if (bucket.timestamps.length >= max) {
    const oldest = bucket.timestamps[0];
    return {
      passed: false,
      remaining: 0,
      limit: max,
      resetMs: Math.max(1000, oldest + windowMs - now),
    };
  }

  bucket.timestamps.push(now);
  const oldest = bucket.timestamps[0];
  return {
    passed: true,
    remaining,
    limit: max,
    resetMs: oldest + windowMs - now,
  };
}

export function rateLimit(request: Request, key: string, max: number, windowMs: number): RateLimitResult {
  const ip = getClientIp(request);
  const storeKey = `${key}:${ip}`;
  return rateLimitInternal(storeKey, max, windowMs);
}

export function rateLimitByKey(fullKey: string, max: number, windowMs: number): RateLimitResult {
  return rateLimitInternal(fullKey, max, windowMs);
}

// 定时清理（每 60 秒删除 10 分钟前的数据）
const CLEANUP_INTERVAL_MS = 60 * 1000;
const STALE_BUCKET_MS = 10 * 60 * 1000;

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store.entries()) {
      const filtered = bucket.timestamps.filter((t) => t > now - STALE_BUCKET_MS);
      if (filtered.length === 0) {
        store.delete(key);
      } else {
        bucket.timestamps = filtered;
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}
