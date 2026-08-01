export const PLATFORM_BASE_DOMAIN = "link168.me";

const STATIC_PLATFORM_HOSTS = new Set([
  PLATFORM_BASE_DOMAIN,
  `www.${PLATFORM_BASE_DOMAIN}`,
  `app.${PLATFORM_BASE_DOMAIN}`,
  `api.${PLATFORM_BASE_DOMAIN}`,
  `admin.${PLATFORM_BASE_DOMAIN}`,
  `workbench.${PLATFORM_BASE_DOMAIN}`,
  `dashboard.${PLATFORM_BASE_DOMAIN}`,
]);

export function getConfiguredAppHost(
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
): string | null {
  if (!appUrl) return null;

  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.toLowerCase().replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

export function isPlatformHost(
  host: string,
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
): boolean {
  const normalizedHost = host.toLowerCase().trim().replace(/\.$/, "");
  if (STATIC_PLATFORM_HOSTS.has(normalizedHost)) return true;

  const configuredAppHost = getConfiguredAppHost(appUrl);
  return configuredAppHost !== null && normalizedHost === configuredAppHost;
}
