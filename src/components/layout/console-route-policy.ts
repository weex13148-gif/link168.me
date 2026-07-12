export type ConsoleSectionKey = "home" | "card" | "customers" | "ai" | "account";

export type ConsoleSectionRoute = {
  key: ConsoleSectionKey;
  label: string;
  href: string;
  legacyExact?: string[];
  legacyPrefixes?: string[];
};

export const CONSOLE_SECTION_ROUTES: ConsoleSectionRoute[] = [
  {
    key: "home",
    label: "首页",
    href: "/console",
    legacyExact: ["/workbench"],
  },
  {
    key: "card",
    label: "名片",
    href: "/console/card",
    legacyPrefixes: [
      "/dashboard",
      "/workbench/card",
      "/workbench/products",
      "/workbench/short-links",
      "/workbench/analytics",
    ],
  },
  {
    key: "customers",
    label: "客户",
    href: "/console/customers",
    legacyPrefixes: ["/workbench/leads"],
  },
  {
    key: "ai",
    label: "AI",
    href: "/console/ai",
    legacyPrefixes: ["/workbench/ai", "/workbench/ai-service", "/workbench/knowledge"],
  },
  {
    key: "account",
    label: "我的",
    href: "/console/account",
    legacyPrefixes: [
      "/workbench/account",
      "/workbench/membership",
      "/workbench/enterprise",
      "/workbench/notifications",
    ],
  },
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isConsoleSectionActive(
  pathname: string | null | undefined,
  section: ConsoleSectionRoute,
): boolean {
  if (!pathname) return false;

  if (section.key === "home" && pathname === "/console") return true;
  if (section.key !== "home" && matchesPrefix(pathname, section.href)) return true;
  if (section.legacyExact?.includes(pathname)) return true;
  return section.legacyPrefixes?.some((prefix) => matchesPrefix(pathname, prefix)) ?? false;
}

export function getConsoleSectionKey(pathname: string | null | undefined): ConsoleSectionKey | null {
  if (!pathname) return null;
  return CONSOLE_SECTION_ROUTES.find((section) => isConsoleSectionActive(pathname, section))?.key ?? null;
}
