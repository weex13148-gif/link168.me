/**
 * Link168 平台管理员权限边界定义
 *
 * 角色层级：
 *   super_admin  — 超级管理员，拥有全部平台后台权限
 *   admin        — 历史兼容角色，不可登录平台后台，只允许迁移
 *   user         — 普通用户，不可登录平台后台
 *
 * 平台级权限只授予 super_admin。历史 admin 数据继续保留，避免破坏旧记录，
 * 但不得新建或重新分配；迁移目标只能是 user 或 super_admin。
 *
 * 自我保护规则：
 *   - 任何角色都不能修改自己的角色
 *   - 任何角色都不能删除自己
 *   - 最后一名 super_admin 不可被降级（PG advisory lock）
 *   - 系统账号（isSystem=true）不可被冻结、封禁或删除
 */

export const ROLE_LABELS = {
  super_admin: "超级管理员",
  admin: "历史管理员",
  user: "普通用户",
} as const;

export type Role = keyof typeof ROLE_LABELS;

/** 各角色可访问的路由（前端导航过滤） */
export const ROLE_ROUTE_ACCESS: Record<Role, string[]> = {
  super_admin: [
    "/jeepwork",
    "/jeepwork/users",
    "/jeepwork/profiles",
    "/jeepwork/reports",
    "/jeepwork/ai-usage",
    "/jeepwork/logs",
    "/jeepwork/settings/api",
    "/jeepwork/governance",
    "/jeepwork/roles",
    "/jeepwork/audit",
  ],
  admin: [],
  user: [],
};

/** 高风险操作定义 */
export type RiskLevel = "warn" | "danger" | "critical";

export interface RiskOperation {
  key: string;
  label: string;
  level: RiskLevel;
  description: string;
  minRole: "super_admin";
}

export const RISK_OPERATIONS: RiskOperation[] = [
  {
    key: "change_role",
    label: "修改用户角色",
    level: "warn",
    description: "在普通用户与超级管理员之间变更角色，或迁移历史管理员账号",
    minRole: "super_admin",
  },
  {
    key: "freeze_user",
    label: "冻结用户",
    level: "warn",
    description: "临时冻结用户，主页不可见，可设置过期时间",
    minRole: "super_admin",
  },
  {
    key: "unfreeze_user",
    label: "解除冻结",
    level: "warn",
    description: "解除对用户的临时冻结状态",
    minRole: "super_admin",
  },
  {
    key: "ban_user",
    label: "永久封禁",
    level: "critical",
    description: "永久禁止用户登录，用户名永久保留，需输入 CONFIRM_BAN 确认",
    minRole: "super_admin",
  },
  {
    key: "unban_user",
    label: "解除封禁",
    level: "danger",
    description: "解除对用户的永久封禁，恢复登录能力",
    minRole: "super_admin",
  },
  {
    key: "batch_freeze",
    label: "批量冻结普通用户",
    level: "warn",
    description: "同时冻结多名普通用户，主页全部不可见",
    minRole: "super_admin",
  },
  {
    key: "data_cleanup",
    label: "数据清理（90天前）",
    level: "danger",
    description: "删除 90 天前的会话、日志等历史数据，不可撤销",
    minRole: "super_admin",
  },
];

export function canPerformOperation(currentRole: Role, operationKey: string): boolean {
  if (currentRole !== "super_admin") return false;
  const operation = RISK_OPERATIONS.find((item) => item.key === operationKey);
  if (!operation) return false;
  return operation.minRole === "super_admin";
}

export function getOperationRiskLevel(operationKey: string): RiskLevel {
  const operation = RISK_OPERATIONS.find((item) => item.key === operationKey);
  return operation?.level ?? "warn";
}
