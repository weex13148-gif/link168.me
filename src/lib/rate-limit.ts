import "server-only";

// 分布式 / 内存限流适配层（滑动窗口）
// 策略：
//   1) 若环境变量 RATE_LIMIT_STORE=redis 且有 REDIS_URL / UPSTASH_REDIS_REST_URL，则走分布式存储
//   2) 否则回退到进程内 Map；多实例部署时，可能被单独打爆但不会影响业务
// 注意：当前默认未安装 ioredis / @upstash/redis，需要时请在 package.json 中增加依赖。
// 目标覆盖：注册 / 登录 / 找回密码 / AI / 短链 / 后台登录
//
// P0 修复：统一 bypass 规则：必须同时满足 NODE_ENV !== "production" 且 AUTH_RATE_LIMIT_BYPASS === "true"
// 不再仅凭 NODE_ENV 自动绕过。

import crypto from "crypto";

export type RateLimitStoreKind = "memory" | "redis-generic" | "upstash-rest";

export type RateLimitConfig = {
  key: string;
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  passed: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
};

// P0: 统一 bypass 判断函数。
// 必须同时满足：NODE_ENV !== "production" 且 AUTH_RATE_LIMIT_BYPASS === "true"
// 不得仅凭 NODE_ENV 自动绕过。
export function shouldBypassRateLimit(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_RATE_LIMIT_BYPASS === "true";
}

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

// ---- 内存实现 ----
const memoryStore = new Map<string, number[]>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const staleCutoff = 10 * 60 * 1000;
    for (const [k, v] of Array.from(memoryStore.entries())) {
      const filtered = v.filter((ts) => now - ts < staleCutoff);
      if (filtered.length === 0) memoryStore.delete(k);
      else memoryStore.set(k, filtered);
    }
  }, 60 * 1000).unref?.();
}

function memoryRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutOff = now - windowMs;
  const bucket = (memoryStore.get(key) || []).filter((ts) => ts > cutOff);
  if (bucket.length >= max) {
    const oldest = bucket[0];
    return { passed: false, remaining: 0, limit: max, resetMs: Math.max(1000, oldest + windowMs - now) };
  }
  bucket.push(now);
  memoryStore.set(key, bucket);
  return { passed: true, remaining: Math.max(0, max - bucket.length), limit: max, resetMs: bucket[0] ? Math.max(1000, bucket[0] + windowMs - now) : 1000 };
}

// ---- Redis / Upstash 适配层 ----
// 设计目标：使用 Redis ZSET 实现滑动窗口；key = "rl:" + sha256(key)
// 若安装失败或超时，自动降级到 memory 实现，避免阻塞业务流程。

function keyHash(key: string): string {
  return "rl:" + crypto.createHash("sha256").update(key).digest("hex");
}

let redisClient: {
  eval: (script: string, keys: string[], args: (string | number)[]) => Promise<unknown>;
} | null = null;
let redisInitErrorLogged = false;

async function getRedisClient() {
  if (redisClient) return redisClient;
  const store = (process.env.RATE_LIMIT_STORE || "").toLowerCase();
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (store !== "redis-generic" && store !== "upstash-rest") return null;
  if (!redisUrl) return null;

  try {
    if (store === "upstash-rest") {
      const upstashMod = await import(/* @vite-ignore */ "@upstash/redis");
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!token) return null;
      const client = new upstashMod.Redis({ url: redisUrl, token });
      redisClient = {
        eval: async (script, keys, args) => {
          return client.eval(script, keys, args);
        },
      };
      return redisClient;
    }

    // redis-generic：需要 ioredis 或兼容 API
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const ioredisMod = require("ioredis");
    const RedisLib = ioredisMod.default || ioredisMod.Redis || ioredisMod;
    const client = new RedisLib(redisUrl, { enableReadyCheck: true, maxRetriesPerRequest: 1, connectTimeout: 2000 });
    redisClient = {
      eval: async (script, keys, args) => {
        return client.eval(script, keys.length, ...keys, ...args);
      },
    };
    return redisClient;
  } catch (err) {
    if (!redisInitErrorLogged) {
      redisInitErrorLogged = true;
      // eslint-disable-next-line no-console
      console.warn("[rate-limit] Redis init failed, fallback to memory store", err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string" ? (err as { message: string }).message : String(err));
    }
    return null;
  }
}

// Redis 滑动窗口脚本：返回 { remaining, oldest } 或 { blocked: true, resetMs }
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[3])
local cutoff = nowMs - windowMs

redis.call("ZREMRANGEBYSCORE", key, "-inf", cutoff)
local count = redis.call("ZCARD", key)
if count >= max then
    local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")[2]
    return {1, tonumber(oldest or nowMs), count}
end
redis.call("ZADD", key, nowMs, nowMs .. "-" .. math.random(1000000))
redis.call("PEXPIRE", key, windowMs)
return {0, nowMs, count + 1}
`;

async function redisRateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const storeKey = keyHash(key);
    const now = Date.now();
    const raw = (await client.eval(RATE_LIMIT_SCRIPT, [storeKey], [max, windowMs, now])) as
      | [number, number, number]
      | null
      | undefined;
    if (!raw) return null;
    const [blocked, oldestTs, _count] = raw;
    if (blocked === 1) {
      return { passed: false, remaining: 0, limit: max, resetMs: Math.max(1000, oldestTs + windowMs - now) };
    }
    return { passed: true, remaining: Math.max(0, max - _count), limit: max, resetMs: windowMs };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[rate-limit] redis rate limit failed, fallback to memory:", err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string" ? (err as { message: string }).message : String(err));
    return null;
  }
}

// ---- 统一入口 ----
export async function rateLimit(request: Request, key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  if (shouldBypassRateLimit()) {
    return { passed: true, remaining: Infinity, limit: Infinity, resetMs: 0 };
  }
  const ip = getClientIp(request);
  const storeKey = `${key}:${ip}`;
  const redisResult = await redisRateLimit(storeKey, max, windowMs);
  if (redisResult) return redisResult;
  return memoryRateLimit(storeKey, max, windowMs);
}

export function rateLimitByKey(fullKey: string, max: number, windowMs: number): Promise<RateLimitResult> {
  if (shouldBypassRateLimit()) {
    return Promise.resolve({ passed: true, remaining: Infinity, limit: Infinity, resetMs: 0 });
  }
  return redisRateLimit(fullKey, max, windowMs).then((res) => res || memoryRateLimit(fullKey, max, windowMs));
}

export function currentStoreKind(): RateLimitStoreKind {
  const store = (process.env.RATE_LIMIT_STORE || "").toLowerCase();
  if (store === "upstash-rest") return "upstash-rest";
  if (store === "redis-generic") return "redis-generic";
  return "memory";
}
