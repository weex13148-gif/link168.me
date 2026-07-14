"use server";

import { db } from "@/lib/db";

export type HostValidationResult = {
  valid: boolean;
  workspaceId: string | null;
  host: string;
  error?: string;
};

const ALLOWED_PLATFORM_HOSTS = new Set([
  "link168.me",
  "www.link168.me",
  "localhost",
  "127.0.0.1",
]);

const LOCALHOST_PATTERN = /^localhost(:\d+)?$/;
const IPV4_LOCAL_PATTERN = /^127\.\d+\.\d+\.\d+(:\d+)?$/;

function isLocalHost(host: string): boolean {
  return LOCALHOST_PATTERN.test(host) || IPV4_LOCAL_PATTERN.test(host);
}

function getNormalizedHost(requestHost: string | null | undefined): string {
  if (!requestHost) return "";
  const host = requestHost.trim().toLowerCase();
  const portIndex = host.lastIndexOf(":");
  if (portIndex > host.lastIndexOf("]")) {
    return host.slice(0, portIndex);
  }
  return host;
}

export async function validateHostForWorkspace(
  requestHost: string | null | undefined,
  workspaceId: string,
): Promise<HostValidationResult> {
  const normalizedHost = getNormalizedHost(requestHost);

  if (!normalizedHost) {
    return {
      valid: false,
      workspaceId: null,
      host: "",
      error: "请求缺少 Host 头，无法验证访问权限。",
    };
  }

  if (isLocalHost(normalizedHost)) {
    return {
      valid: true,
      workspaceId,
      host: normalizedHost,
    };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, slug: true },
  });

  if (!workspace) {
    return {
      valid: false,
      workspaceId: null,
      host: normalizedHost,
      error: "工作空间不存在。",
    };
  }

  const expectedHosts = [
    `${workspace.slug}.link168.me`,
  ];

  const isValid = expectedHosts.includes(normalizedHost);

  return {
    valid: isValid,
    workspaceId: isValid ? workspaceId : null,
    host: normalizedHost,
    error: isValid ? undefined : `访问域名 ${normalizedHost} 未绑定到该工作空间。`,
  };
}

export async function resolveWorkspaceByHost(
  requestHost: string | null | undefined,
): Promise<HostValidationResult> {
  const normalizedHost = getNormalizedHost(requestHost);

  if (!normalizedHost) {
    return {
      valid: false,
      workspaceId: null,
      host: "",
      error: "请求缺少 Host 头，无法解析工作空间。",
    };
  }

  if (isLocalHost(normalizedHost)) {
    return {
      valid: false,
      workspaceId: null,
      host: normalizedHost,
      error: "本地环境不支持通过 Host 解析工作空间。",
    };
  }

  if (ALLOWED_PLATFORM_HOSTS.has(normalizedHost)) {
    return {
      valid: false,
      workspaceId: null,
      host: normalizedHost,
      error: "平台主域名不支持工作空间解析。",
    };
  }

  const parts = normalizedHost.split(".");
  if (parts.length < 3) {
    return {
      valid: false,
      workspaceId: null,
      host: normalizedHost,
      error: "域名格式不正确。",
    };
  }

  const slug = parts[0];
  const workspace = await db.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return {
      valid: false,
      workspaceId: null,
      host: normalizedHost,
      error: "该域名未绑定到任何工作空间。",
    };
  }

  return {
    valid: true,
    workspaceId: workspace.id,
    host: normalizedHost,
  };
}

export function isPlatformHost(host: string | null | undefined): boolean {
  const normalized = getNormalizedHost(host);
  if (!normalized) return false;
  if (ALLOWED_PLATFORM_HOSTS.has(normalized)) return true;
  if (isLocalHost(normalized)) return true;
  return normalized.endsWith(".link168.me") && normalized.split(".").length >= 3;
}

export function buildWorkspacePublicUrl(host: string, workspaceId: string): string {
  const normalized = getNormalizedHost(host);
  if (!normalized) return "";
  return `https://${normalized}/__w/${workspaceId}`;
}

export function buildWorkspaceCanonicalUrl(host: string, workspaceId: string): string {
  const normalized = getNormalizedHost(host);
  if (!normalized) return "";
  return `https://${normalized}`;
}