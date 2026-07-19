import {
  parseCatalogItemKind,
  type CatalogItemKind,
} from "@/domains/catalog/catalog-item";
import type {
  CreateCatalogRecordInput,
  UpdateCatalogRecordPatch,
} from "@/domains/catalog/catalog-repository";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import { DomainError } from "@/shared/domain-error";

const MAX_NAME_LENGTH = 80;
const MAX_CATEGORY_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 400;
const MAX_PRICE_LENGTH = 80;
const MAX_CTA_LABEL_LENGTH = 40;

export type CreateCatalogItemInput = Readonly<{
  kind: unknown;
  name: unknown;
  category?: unknown;
  description?: unknown;
  priceText?: unknown;
  coverAssetId?: unknown;
  legacyCoverUrl?: unknown;
  ctaLabel?: unknown;
  ctaUrl?: unknown;
  allowAiRecommendation?: unknown;
}>;

export type UpdateCatalogItemInput = Readonly<
  Partial<{
    kind: unknown;
    name: unknown;
    category: unknown;
    description: unknown;
    priceText: unknown;
    coverAssetId: unknown;
    ctaLabel: unknown;
    ctaUrl: unknown;
    allowAiRecommendation: unknown;
  }>
>;

function requiredText(value: unknown, maxLength: number, errorMessage: string): string {
  if (typeof value !== "string") {
    throw new DomainError("VALIDATION_ERROR", errorMessage);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainError("VALIDATION_ERROR", errorMessage);
  }
  if (normalized.length > maxLength) {
    throw new DomainError("VALIDATION_ERROR", "CATALOG_TEXT_TOO_LONG", {
      maxLength,
    });
  }
  return normalized;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_TEXT");
  }
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new DomainError("VALIDATION_ERROR", "CATALOG_TEXT_TOO_LONG", {
      maxLength,
    });
  }
  return normalized;
}

function optionalAssetId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_COVER_ASSET_ID");
  }
  const normalized = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_COVER_ASSET_ID");
  }
  return normalized;
}

function normalizeAiRecommendationFlag(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "boolean") {
    throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_AI_RECOMMENDATION_FLAG");
  }
  return value;
}

export function normalizeCatalogCtaUrl(value: unknown): string | null {
  const text = optionalText(value, 2048);
  if (!text) return null;
  const sanitized = sanitizePublicUrl(text);
  if (!sanitized.safe || !sanitized.url) {
    throw new DomainError("VALIDATION_ERROR", "CATALOG_CTA_URL_UNSAFE");
  }
  return sanitized.url;
}

function parseKind(value: unknown): CatalogItemKind {
  const parsed = parseCatalogItemKind(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

export function normalizeCreateCatalogItem(
  input: CreateCatalogItemInput,
  sortOrder: number,
): CreateCatalogRecordInput {
  return Object.freeze({
    kind: parseKind(input.kind),
    status: "draft",
    name: requiredText(input.name, MAX_NAME_LENGTH, "CATALOG_ITEM_NAME_REQUIRED"),
    category: optionalText(input.category, MAX_CATEGORY_LENGTH),
    description: optionalText(input.description, MAX_DESCRIPTION_LENGTH),
    priceText: optionalText(input.priceText, MAX_PRICE_LENGTH),
    coverAssetId: optionalAssetId(input.coverAssetId),
    legacyCoverUrl: null,
    ctaLabel: optionalText(input.ctaLabel, MAX_CTA_LABEL_LENGTH),
    ctaUrl: normalizeCatalogCtaUrl(input.ctaUrl),
    sortOrder,
    allowAiRecommendation: normalizeAiRecommendationFlag(input.allowAiRecommendation),
  });
}

export function normalizeUpdateCatalogItem(
  input: UpdateCatalogItemInput,
): UpdateCatalogRecordPatch {
  const patch: Record<string, unknown> = {};
  const has = (key: keyof UpdateCatalogItemInput) =>
    Object.prototype.hasOwnProperty.call(input, key);

  if (has("kind")) patch.kind = parseKind(input.kind);
  if (has("name")) {
    patch.name = requiredText(input.name, MAX_NAME_LENGTH, "CATALOG_ITEM_NAME_REQUIRED");
  }
  if (has("category")) patch.category = optionalText(input.category, MAX_CATEGORY_LENGTH);
  if (has("description")) patch.description = optionalText(input.description, MAX_DESCRIPTION_LENGTH);
  if (has("priceText")) patch.priceText = optionalText(input.priceText, MAX_PRICE_LENGTH);
  if (has("coverAssetId")) patch.coverAssetId = optionalAssetId(input.coverAssetId);
  if (has("ctaLabel")) patch.ctaLabel = optionalText(input.ctaLabel, MAX_CTA_LABEL_LENGTH);
  if (has("ctaUrl")) patch.ctaUrl = normalizeCatalogCtaUrl(input.ctaUrl);
  if (has("allowAiRecommendation")) {
    if (typeof input.allowAiRecommendation !== "boolean") {
      throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_AI_RECOMMENDATION_FLAG");
    }
    patch.allowAiRecommendation = input.allowAiRecommendation;
  }

  return Object.freeze(patch) as UpdateCatalogRecordPatch;
}
