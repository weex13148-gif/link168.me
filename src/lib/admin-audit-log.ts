import crypto from "crypto";
import { db, type AuditDbClient } from "@/lib/db";

// admin_audit_logs 辅助函数
// 目标：记录后台的关键写操作，脱敏敏感字段
// 写入原则：
//   - 不记录真实密码 / 完整 API Key / 敏感个人信息
//   - metadata 中的敏感字段必须显式删除或替换为占位值
//   - ip 仅记录 hash（salt 使用进程随机盐）
//   - 审计失败：写 server log 并返回失败状态，但不阻塞主操作
//
// 改进：不再静默吞掉审计失败；返回 { ok: boolean, reason: string }，
// 供主流程在响应中追加 audit_warning 字段（fail-open + 可见告警）。
//
// P0 修复：支持传入 Prisma transaction client，使业务写入与审计日志可在同一事务中执行。
// 调用方在 $transaction 回调内传入 tx client；事务失败时审计日志一并回滚。

const AUDIT_IP_SALT =
  process.env.AUDIT_IP_SALT ||
  (typeof globalThis !== "undefined" && (globalThis as { __auditIpSalt?: string }).__auditIpSalt) ||
  crypto.randomBytes(16).toString("hex");

if (typeof globalThis !== "undefined") {
  const g = globalThis as { __auditIpSalt?: string };
  if (!g.__auditIpSalt) g.__auditIpSalt = AUDIT_IP_SALT;
}

function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const clean = ip.trim().split(",")[0]?.trim();
  if (!clean) return null;
  return crypto.createHmac("sha256", AUDIT_IP_SALT).update(clean).digest("hex").slice(0, 32);
}

// 递归删除 / 替换敏感字段（用于 metadata 脱敏）
// 规则：字段名匹配以下模式之一时替换为 [REDACTED]；
//       即便 key 出现在嵌套对象中也会被递归替换。
const SENSITIVE_KEY_RE = /(password|passwd|pwd|token|apikey|api_key|api-key|secret|jwt|session|cookie|authorization|auth_header|credit_card|creditcard|cvv|bank.?account|iban|ssn|private_key|privatekey|pem)/i;

const SENSITIVE_VALUE_RE = /(sk-[A-Za-z0-9_\-]{4,}|Bearer\s+[A-Za-z0-9_\-.]{4,}|AKIA[0-9A-Z]{16}|LS[0-9A-Za-z]{20,}|-----BEGIN\s+[A-Z0-9\s]*PRIVATE KEY)/;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_RE.test(key)) {
    if (typeof value === "string") {
      if (value.length <= 4) return "[REDACTED]";
      return `[REDACTED len=${value.length}]`;
    }
    if (Array.isArray(value)) return "[REDACTED]";
    if (value && typeof value === "object") return "[REDACTED]";
    return "[REDACTED]";
  }
  if (typeof value === "string" && SENSITIVE_VALUE_RE.test(value)) {
    return "[REDACTED]";
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value)) return value.map((item, idx) => sanitizeValue(String(idx), item));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(k, v);
    }
    return out;
  }
  return value;
}

export function sanitizeAuditMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return { value: "[non-object]" };
  const sanitized = sanitizeValue("root", raw);
  if (sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>;
  }
  return { sanitized: true };
}

export type AdminAuditWriteParams = {
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  // 注意：metadata 在写入前会自动脱敏；调用方仍然建议仅写入必要字段
  metadata?: Record<string, unknown> | null;
  request?: Request;
  success?: boolean;
};

export type AdminAuditWriteResult = { ok: boolean; reason: string };

// P0: 接受可选的 Prisma transaction client。
// 调用方在 $transaction 回调内传入 tx client，使审计日志与业务写入在同一事务中。
// 事务失败时审计日志一并回滚。
export async function writeAdminAuditLog(
  params: AdminAuditWriteParams,
  client?: AuditDbClient,
): Promise<AdminAuditWriteResult> {
  const targetDb = client ?? db;
  try {
    const { actorUserId, actorEmail, actorRole, action, targetType, targetId, metadata, request, success } = params;
    const safeEmail = typeof actorEmail === "string" && actorEmail ? actorEmail.toLowerCase().trim() : undefined;
    const ipRaw = request
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined
      : undefined;
    const ipHash = hashIp(ipRaw);
    const userAgent = request ? request.headers.get("user-agent") || undefined : undefined;
    const sanitized = sanitizeAuditMetadata(metadata);
    const metadataRaw = sanitized ? JSON.stringify(sanitized) : null;

    if (!process.env.DATABASE_URL) {
      const reason = "DATABASE_URL missing — audit log skipped";
      console.warn("[admin-audit-log]", reason, { action, targetType, targetId });
      return { ok: false, reason };
    }

    try {
      await targetDb.adminAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          actorUserId: actorUserId || null,
          actorEmail: safeEmail || null,
          actorRole: actorRole || null,
          action,
          targetType: targetType || null,
          targetId: targetId || null,
          metadataRaw,
          ipHash,
          userAgent: userAgent || null,
          createdAt: new Date(),
          success: typeof success === "boolean" ? success : true,
        },
      });
      return { ok: true, reason: "" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error("[admin-audit-log] write failed", { action, targetType, targetId, reason });
      return { ok: false, reason };
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[admin-audit-log] prepare failed", { reason });
    return { ok: false, reason };
  }
}

// 常用 action 常量（集中管理，避免手写出错）
export const AUDIT_ACTION = {
  UPDATE_USER_ROLE: "admin.update_user_role",
  RESET_USER_PASSWORD: "admin.reset_user_password",
  UPDATE_PROFILE_VISIBILITY: "admin.update_profile_visibility",
  UPDATE_SYSTEM_CONFIG: "admin.update_system_config",
  PROCESS_REPORT: "admin.process_report",
  DELETE_REPORT: "admin.delete_report",
  LOGIN_SUCCESS: "admin.login_success",
  LOGIN_FAILED: "admin.login_failed",
  FREEZE_USER: "admin.freeze_user",
  UNFREEZE_USER: "admin.unfreeze_user",
  BAN_USER: "admin.ban_user",
  UNBAN_USER: "admin.unban_user",
  UPLOAD_COMPETITION_FILE: "admin.upload_competition_file",
  DOWNLOAD_COMPETITION_FILE: "admin.download_competition_file",
  REPLACE_COMPETITION_FILE: "admin.replace_competition_file",
  DELETE_COMPETITION_FILE: "admin.delete_competition_file",
  UPDATE_COMPETITION_FILE: "admin.update_competition_file",
  SET_MAIN_COMPETITION_FILE: "admin.set_main_competition_file",
  UPDATE_SHOWCASE_CONTENT: "admin.update_showcase_content",
  UPDATE_SHOWCASE_SEQUENCE: "admin.update_showcase_sequence",
  UPDATE_SHOWCASE_AI_CONFIG: "admin.update_showcase_ai_config",
  PUBLISH_SHOWCASE_PROMPT: "admin.publish_showcase_prompt",
  RUN_SHOWCASE_AI_DEBUG: "admin.run_showcase_ai_debug",
  TOGGLE_SHOWCASE_DEMO: "admin.toggle_showcase_demo",
} as const;
