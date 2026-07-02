import crypto from "crypto";
import { db, type AuditDbClient } from "@/lib/db";

const AUDIT_IP_SALT =
  process.env.AUDIT_IP_SALT ||
  (typeof globalThis !== "undefined" && (globalThis as { __auditIpSalt?: string }).__auditIpSalt) ||
  crypto.randomBytes(16).toString("hex");

if (typeof globalThis !== "undefined") {
  const globalState = globalThis as { __auditIpSalt?: string };
  if (!globalState.__auditIpSalt) globalState.__auditIpSalt = AUDIT_IP_SALT;
}

function normalizeIp(ip: string | undefined): string | null {
  if (!ip) return null;
  const clean = ip.trim().split(",")[0]?.trim();
  return clean || null;
}

function hashIp(ip: string | undefined): string | null {
  const clean = normalizeIp(ip);
  if (!clean) return null;
  return crypto.createHmac("sha256", AUDIT_IP_SALT).update(clean).digest("hex").slice(0, 32);
}

const SENSITIVE_KEY_RE = /(password|passwd|pwd|token|apikey|api_key|api-key|secret|jwt|session|cookie|authorization|auth_header|credit_card|creditcard|cvv|bank.?account|iban|ssn|private_key|privatekey|pem)/i;
const SENSITIVE_VALUE_RE = /(sk-[A-Za-z0-9_\-]{4,}|Bearer\s+[A-Za-z0-9_\-.]{4,}|AKIA[0-9A-Z]{16}|LS[0-9A-Za-z]{20,}|-----BEGIN\s+[A-Z0-9\s]*PRIVATE KEY)/;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_RE.test(key)) {
    if (typeof value === "string") return value.length <= 4 ? "[REDACTED]" : `[REDACTED len=${value.length}]`;
    return "[REDACTED]";
  }
  if (typeof value === "string" && SENSITIVE_VALUE_RE.test(value)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item, index) => sanitizeValue(String(index), item));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      output[nestedKey] = sanitizeValue(nestedKey, nestedValue);
    }
    return output;
  }
  return value;
}

export function sanitizeAuditMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return { value: "[non-object]" };
  const sanitized = sanitizeValue("root", raw);
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : { sanitized: true };
}

export type AdminAuditWriteParams = {
  actorUserId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown> | null;
  request?: Request;
  success?: boolean;
};

export type AdminAuditWriteResult = { ok: boolean; reason: string };

export async function writeAdminAuditLog(
  params: AdminAuditWriteParams,
  client?: AuditDbClient,
): Promise<AdminAuditWriteResult> {
  const targetDb = client ?? db;
  try {
    const { actorUserId, actorEmail, actorRole, action, targetType, targetId, metadata, request, success } = params;
    const safeEmail = typeof actorEmail === "string" && actorEmail ? actorEmail.toLowerCase().trim() : undefined;
    const ipAddress = normalizeIp(request
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined
      : undefined);
    const userAgent = request ? request.headers.get("user-agent") || undefined : undefined;

    // 保留 ipHash 兼容历史检索，同时把原始 IP 放入仅超级管理员可读取的审计元数据。
    const sanitized = sanitizeAuditMetadata({ ...(metadata || {}), ipAddress });
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
          ipHash: hashIp(ipAddress || undefined),
          userAgent: userAgent || null,
          createdAt: new Date(),
          success: typeof success === "boolean" ? success : true,
        },
      });
      return { ok: true, reason: "" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error("[admin-audit-log] write failed", { action, targetType, targetId, reason });
      return { ok: false, reason };
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[admin-audit-log] prepare failed", { reason });
    return { ok: false, reason };
  }
}

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
  GRANT_USER_MEMBERSHIP: "admin.grant_user_membership",
  REVOKE_USER_MEMBERSHIP: "admin.revoke_user_membership",
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
