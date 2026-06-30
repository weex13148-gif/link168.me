/**
 * 权限和隐私检查工具库
 * 确保原始 IP 等敏感信息只对超级管理员可见
 */

/**
 * 用户角色类型
 */
export type UserRole = "superadmin" | "admin" | "user" | "guest";

/**
 * 检查用户是否有权查看原始访问数据
 * 规则：只有超级管理员可以查看原始 IP
 */
export function canViewRawIP(role: UserRole): boolean {
  return role === "superadmin";
}

/**
 * 检查用户是否有权查看访问日志明细
 * 规则：只有超级管理员可以查看详细的访问日志
 */
export function canViewAccessLogs(role: UserRole): boolean {
  return role === "superadmin";
}

/**
 * 检查用户是否有权执行数据清理任务
 * 规则：只有超级管理员可以执行数据清理
 */
export function canExecuteDataCleanup(role: UserRole): boolean {
  return role === "superadmin";
}

/**
 * 检查用户是否有权查看数据保留状态
 * 规则：只有超级管理员可以查看数据保留状态
 */
export function canViewDataRetention(role: UserRole): boolean {
  return role === "superadmin";
}

/**
 * 过滤响应中的敏感字段
 * 用于在返回给普通用户的数据中移除原始 IP 等敏感信息
 */
export function filterSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  role: UserRole
): T {
  if (canViewRawIP(role)) {
    return data; // 管理员返回完整数据
  }

  // 移除敏感字段
  const sanitized = { ...data };
  const sensitiveFields = ["ip", "ipHash", "rawIp", "ipAddress", "clientIp"];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete (sanitized as Record<string, unknown>)[field];
    }
  }

  return sanitized;
}

/**
 * 创建安全的分析响应
 * 自动过滤普通用户不应看到的敏感信息
 */
export function createSafeAnalyticsResponse<T extends Record<string, unknown>>(
  data: T,
  role: UserRole
): T {
  // 过滤敏感字段
  const filtered = filterSensitiveFields(data, role);

  // 添加隐私标记（可选，用于前端提示）
  if (!canViewRawIP(role)) {
    return {
      ...filtered,
      _privacyNote: "原始IP信息已隐藏，仅超级管理员可查看",
    } as T;
  }

  return filtered;
}

/**
 * 验证用户是否有权访问指定资源
 * 用于防止通过修改 URL 参数进行越权访问
 */
export function canAccessResource(
  resourceOwnerId: string,
  currentUserId: string,
  role: UserRole
): boolean {
  // 超级管理员可以访问所有资源
  if (role === "superadmin") {
    return true;
  }

  // 普通用户只能访问自己的资源
  return resourceOwnerId === currentUserId;
}

/**
 * 日志操作类型枚举
 */
export type AuditLogAction =
  | "view_raw_ip"
  | "view_access_logs"
  | "execute_cleanup"
  | "export_data"
  | "view_data_retention";

/**
 * 检查是否需要记录审计日志
 * 敏感操作需要记录
 */
export function requiresAuditLog(action: AuditLogAction): boolean {
  const auditableActions: AuditLogAction[] = [
    "view_raw_ip",
    "view_access_logs",
    "execute_cleanup",
    "export_data",
    "view_data_retention",
  ];
  return auditableActions.includes(action);
}
