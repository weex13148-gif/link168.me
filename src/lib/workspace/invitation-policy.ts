import crypto from "node:crypto";
import type { WorkspaceRole } from "@/lib/workspace";

export const WORKSPACE_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeWorkspaceInvitationEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

export function hashWorkspaceInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getWorkspaceInvitationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + WORKSPACE_INVITATION_TTL_MS);
}

export function isWorkspaceInvitationExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function canGrantWorkspaceRole(actorRole: WorkspaceRole | string | null, targetRole: WorkspaceRole | string): boolean {
  if (targetRole === "owner") return false;
  if (actorRole === "owner") return ["admin", "member", "viewer"].includes(targetRole);
  if (actorRole === "admin") return ["member", "viewer"].includes(targetRole);
  return false;
}

export function canManageWorkspaceRole(actorRole: WorkspaceRole | string | null, targetRole: WorkspaceRole | string): boolean {
  if (targetRole === "owner") return false;
  if (actorRole === "owner") return ["admin", "member", "viewer"].includes(targetRole);
  if (actorRole === "admin") return ["member", "viewer"].includes(targetRole);
  return false;
}
