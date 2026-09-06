export function currentTeamSeatLimit(account: {
  planCode: string; status: string; graceEndsAt: Date | null;
} | null, now = Date.now()): number {
  if (!account) return 1;
  const retained = account.status === "active" || Boolean(account.graceEndsAt && account.graceEndsAt.getTime() > now);
  if (!retained) return 1;
  const limits: Record<string, number> = { free: 1, plus: 1, pro: 3, enterprise: 10, enterprise_pro: 30 };
  return limits[account.planCode] ?? 1;
}
