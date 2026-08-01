import crypto from "crypto";
import { db } from "@/lib/db";

// V2-003: Username 90 天保留期与惰性释放
// 规则：
//   1. 统一小写规范化（normalizeUsername）
//   2. 禁止与保留词（系统保留，如 admin, root, link168）
//   3. CURRENT: 他人当前使用 → 不可注册
//   4. RESERVED_90_DAYS 未到期 → 不可注册
//   5. RESERVED_90_DAYS 已到期 → 事务中释放为可用
//   6. PERMANENTLY_RESERVED: 永远不可注册
//   7. 依赖 Postgres UniqueIndex 防止并发冲突
//
// 保留词：大小写不敏感匹配
const RESERVED_WORDS = new Set([
  "admin", "root", "system", "link168", "link-168", "link_168",
  "support", "help", "contact", "official", "ceo", "owner",
  "www", "api", "dashboard", "auth", "login", "register", "signup", "signin",
  "test", "demo", "trial", "temp", "tmp", "debug",
  "home", "about", "privacy", "terms", "tos", "privacy-policy",
  "porn", "xxx", "sex", "nude", "pornhub", "onlyfans",
  "drug", "cocaine", "heroin", "meth",
  "hate", "nazi", "kkk", "isis",
  "gamble", "casino", "slot", "poker", "bet", "betting",
  "scam", "fraud", "hack", "hacker",
  "weapon", "gun", "bomb",
]);

const STATUS_CURRENT = "CURRENT";
const STATUS_RESERVED_90_DAYS = "RESERVED_90_DAYS";
const STATUS_PERMANENTLY_RESERVED = "PERMANENTLY_RESERVED";

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 32;

function normalizeUsername(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function isValidFormat(normalized: string): boolean {
  if (!normalized) return false;
  if (normalized.length < MIN_USERNAME_LENGTH || normalized.length > MAX_USERNAME_LENGTH) return false;
  if (/^[-_]/.test(normalized) || /[-_]$/.test(normalized)) return false;
  return true;
}

function isReservedWord(normalized: string): boolean {
  return RESERVED_WORDS.has(normalized);
}

// 保留期（天数）：首次设置不计入保留；用户主动变更后旧 username 保留 90 天
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// 可用性检查（惰性释放：RESERVED_90_DAYS 已到期时在事务中释放并允许新用户占用）
export type UsernameAvailability = {
  available: boolean;
  reason: string;
  normalized: string;
};

export async function checkUsernameAvailability(
  raw: string,
  requestingUserId?: string,
): Promise<UsernameAvailability> {
  const normalized = normalizeUsername(raw);
  if (!normalized) return { available: false, reason: "username_required", normalized: "" };
  if (!isValidFormat(normalized)) return { available: false, reason: "username_invalid_format", normalized };
  if (isReservedWord(normalized)) return { available: false, reason: "username_reserved_word", normalized };

  const now = new Date();
  const registry = await db.usernameRegistry.findUnique({
    where: { normalizedUsername: normalized },
  });

  if (!registry) return { available: true, reason: "available", normalized };

  // 已经是当前用户自己的 → 允许（但需要通过变更接口修改）
  if (requestingUserId && registry.userId === requestingUserId && registry.status === STATUS_CURRENT) {
    return { available: true, reason: "own_username", normalized };
  }

  if (registry.status === STATUS_PERMANENTLY_RESERVED) {
    return { available: false, reason: "username_permanently_reserved", normalized };
  }

  if (registry.status === STATUS_CURRENT) {
    return { available: false, reason: "username_taken", normalized };
  }

  if (registry.status === STATUS_RESERVED_90_DAYS) {
    // 保留期未到期 → 不可注册
    if (registry.reservedUntil && registry.reservedUntil > now) {
      return { available: false, reason: "username_reserved_90_days", normalized };
    }
    // 保留期已到期 → 判定为可注册（由 assignUsername 事务中真正释放）
    return { available: true, reason: "reserved_expired", normalized };
  }

  return { available: false, reason: "username_unavailable", normalized };
}

// 分配 username：首次设置或变更；变更时将旧 username 标记为 RESERVED_90_DAYS
export async function assignUsername(
  userId: string,
  newRawUsername: string,
): Promise<{ success: boolean; error?: string; username?: string; isInitialSet?: boolean }> {
  const newNormalized = normalizeUsername(newRawUsername);
  if (!newNormalized) return { success: false, error: "username_required" };
  if (!isValidFormat(newNormalized)) return { success: false, error: "username_invalid_format" };
  if (isReservedWord(newNormalized)) return { success: false, error: "username_reserved_word" };

  const now = new Date();

  try {
    return await db.$transaction(async (tx) => {
      // 1. 查询当前用户现有 profile 与 registry
      const existingProfile = await tx.profile.findUnique({
        where: { userId },
        select: { id: true, username: true },
      });

      const currentRegistry = existingProfile
        ? await tx.usernameRegistry.findUnique({
            where: { normalizedUsername: existingProfile.username.toLowerCase() },
          })
        : null;

      // 2. 如果目标 username 已存在 registry：根据状态判断
      const targetRegistry = await tx.usernameRegistry.findUnique({
        where: { normalizedUsername: newNormalized },
      });

      if (targetRegistry) {
        if (targetRegistry.status === STATUS_PERMANENTLY_RESERVED) {
          return { success: false, error: "username_permanently_reserved" };
        }
        if (targetRegistry.status === STATUS_CURRENT && targetRegistry.userId !== userId) {
          return { success: false, error: "username_taken" };
        }
        if (targetRegistry.status === STATUS_RESERVED_90_DAYS && targetRegistry.userId !== userId) {
          if (targetRegistry.reservedUntil && targetRegistry.reservedUntil > now) {
            return { success: false, error: "username_reserved_90_days" };
          }
          // 保留期已到期 → 事务中释放并允许新用户占用
          await tx.usernameRegistry.update({
            where: { normalizedUsername: newNormalized },
            data: { status: STATUS_CURRENT, userId, reservedUntil: null, reason: "reclaimed_after_90_days", updatedAt: now },
          });
        } else if (targetRegistry.status === STATUS_CURRENT && targetRegistry.userId === userId) {
          // 相同 username，无需变更
          return { success: true, username: newNormalized };
        } else {
          // 其他情况：更新为当前用户占用
          await tx.usernameRegistry.update({
            where: { normalizedUsername: newNormalized },
            data: { status: STATUS_CURRENT, userId, reservedUntil: null, reason: "user_assigned", updatedAt: now },
          });
        }
      } else {
        // 目标 username 尚未在 registry → 创建
        await tx.usernameRegistry.create({
          data: {
            id: crypto.randomUUID(),
            normalizedUsername: newNormalized,
            displayUsername: newRawUsername.trim(),
            userId,
            status: STATUS_CURRENT,
            reason: existingProfile ? "user_changed" : "initial_set",
            reservedUntil: null,
          },
        });
      }

      // 3. 旧 username 处理：变更时标记为 RESERVED_90_DAYS（首次设置不处理旧）
      const isInitialSet = !existingProfile;
      if (!isInitialSet && currentRegistry && currentRegistry.normalizedUsername !== newNormalized) {
        await tx.usernameRegistry.update({
          where: { id: currentRegistry.id },
          data: {
            status: STATUS_RESERVED_90_DAYS,
            userId: null,
            reservedUntil: new Date(now.getTime() + NINETY_DAYS_MS),
            reason: "user_changed",
            updatedAt: now,
          },
        });
        // 历史记录
        await tx.usernameHistory.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            username: existingProfile!.username,
            normalizedUsername: currentRegistry.normalizedUsername,
            replacedBy: newNormalized,
            reservedUntil: new Date(now.getTime() + NINETY_DAYS_MS),
          },
        });
      }

      // 4. 创建或更新 profile
      const finalUsername = newNormalized;
      let profile;
      if (existingProfile) {
        profile = await tx.profile.update({
          where: { userId },
          data: { username: finalUsername, updatedAt: now },
        });
      } else {
        profile = await tx.profile.upsert({
          where: { userId },
          create: {
            id: crypto.randomUUID(),
            userId,
            username: finalUsername,
            displayName: null,
            bio: null,
            theme: "Link168 草木默认",
            language: "zh",
            customTheme: null,
            isPublic: false,
          },
          update: { username: finalUsername, updatedAt: now },
        });
      }

      return { success: true, username: profile.username, isInitialSet };
    });
  } catch {
    // 唯一索引冲突等错误
    return { success: false, error: "username_concurrent_conflict" };
  }
}

// 导出常量供 API 层使用
export {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  STATUS_CURRENT,
  STATUS_RESERVED_90_DAYS,
  STATUS_PERMANENTLY_RESERVED,
  normalizeUsername,
};
