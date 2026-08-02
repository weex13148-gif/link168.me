const WORKBENCH_ROUTE_MAP: Record<string, string> = {
  "/workbench": "/console",
  "/workbench/card": "/console/card",
  "/workbench/leads": "/console/leads",
  "/workbench/analytics": "/console/analytics",
  "/workbench/products": "/console/products",
  "/workbench/knowledge": "/console/knowledge",
  "/workbench/short-links": "/console/short-links",
  "/workbench/membership": "/console/membership",
  "/workbench/notifications": "/console/notifications",
  "/workbench/account": "/console/account",
  "/workbench/enterprise": "/console/enterprise",
  "/workbench/ai-service": "/console/ai-reception",
  "/workbench/ai": "/console/ai",
  "/workbench/ai/reception": "/console/ai-reception",
};

const DASHBOARD_TAB_MAP: Record<string, string> = {
  profile: "/console/card?section=content",
  links: "/console/card?section=content",
  content: "/console/card?section=content",
  appearance: "/console/card?section=style",
  style: "/console/card?section=style",
  share: "/console/card?section=publish",
  publish: "/console/card?section=publish",
  stats: "/console/analytics",
  account: "/console/account",
};

export function resolveLegacyConsoleRoute(pathname: string, tab?: string | null): string | null {
  if (pathname === "/dashboard") {
    return DASHBOARD_TAB_MAP[(tab || "").toLowerCase()] || "/console/card";
  }
  if (pathname === "/workbench/ai/customer-service" || pathname === "/workbench/ai/sales-agent") {
    return "/console/ai-reception";
  }
  const exactWorkbenchTarget = WORKBENCH_ROUTE_MAP[pathname];
  if (exactWorkbenchTarget) {
    return exactWorkbenchTarget;
  }
  if (pathname.startsWith("/workbench/ai/")) {
    return pathname.replace("/workbench/ai/", "/console/ai/");
  }
  return null;
}
