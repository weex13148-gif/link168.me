/**
 * Link168 平台管理员权限边界定义
 *
 * 角色层级：
 *   super_admin  — 超级管理员，拥有全部后台权限
 *   admin        — 历史角色，不可登录平台后台
 *   user         — 普通用户，不可登录平台后台
 *
 * 权限矩阵：
 *                  super_admin    admin
 * 用户列表/搜索       ✓             ✗
 * 用户详情查看        ✓             ✗
 * 修改用户角色        ✓             ✗
 * 冻结/解冻用户       ✓             ✗
 * 封禁/解封用户       ✓             ✗
 * 批量冻结普通用户     ✓             ✗
 * 批量导出           ✓             ✗
 * 主页管理           ✓             ✗
 * 举报管理           ✓             ✗
 * AI 用量查看        ✓             ✗
 * 访问日志查看        ✓             ✗
 * 审计日志查看        ✓（原始IP需原因） ✗
 * 系统配置           ✓             ✗
 * 比赛展示管理        ✓             ✗
 * 数据清理（90天前）   ✓             ✗
 *
 * 自我保护规则：
 *   - 任何角色都不能修改自己的角色
 *   - 任何角色都不能删除自己
 *   - 最后一名 super_admin 不可被降级（PG advisory lock）
 *   - 系统账号（isSystem=true）不可被冻结、封禁或删除
 *
 * 高风险操作分级：
 *   WARN（警告）      — 修改用户角色、解除冻结
 *   DANGER（危险）    — 解除封禁
 *   CRITICAL（最高）  — 永久封禁（需输入 CONFIRM_BAN）
 */

export const ROLE_LABELS = {
  super_admin: "超级管理员",
  admin: "管理员",
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
    "/jeepwork/showcase",
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
  /** 需要的最低角色 */
  minRole: "super_admin";
}

export const RISK_OPERATIONS: RiskOperation[] = [
  {
    key: "change_role",
    label: "修改用户角色",
    level: "warn",
    description: "变更用户的角色身份（普通用户/管理员/超级管理员）",
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

/** 判断当前管理员是否可以执行某操作 */
export function canPerformOperation(
  currentRole: Role,
  operationKey: string,
): boolean {
  if (currentRole !== "super_admin") return false;
  const op = RISK_OPERATIONS.find((o) => o.key === operationKey);
  if (!op) return false;
  return op.minRole === "super_admin";
}

/** 获取操作对应的 ConfirmModal 危险等级 */
export function getOperationRiskLevel(operationKey: string): RiskLevel {
  const op = RISK_OPERATIONS.find((o) => o.key === operationKey);
  return op?.level ?? "warn";
}
