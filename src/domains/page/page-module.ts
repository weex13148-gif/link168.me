export const PAGE_MODULE_SCHEMA_VERSION = 1 as const;

export type CatalogModuleType = "product-card" | "service-card";

export type PageModule = Readonly<{
  id: string;
  profileId: string;
  type: string;
  position: number;
  isActive: boolean;
  catalogItemId: string | null;
  schemaVersion: number;
  presentation: Readonly<Record<string, unknown>>;
}>;

export function isCatalogModuleType(value: unknown): value is CatalogModuleType {
  return value === "product-card" || value === "service-card";
}
