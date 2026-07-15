import { db } from "@/lib/db";
import type { ProductCardPayload } from "@/features/profile-modules";

export type ProductBindingErrorCode =
  | "PRODUCT_ID_REQUIRED"
  | "PRODUCT_NOT_OWNED_OR_INACTIVE"
  | "INVALID_PRODUCT_ORDER";

export class ProductBindingError extends Error {
  constructor(
    public readonly code: ProductBindingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProductBindingError";
  }
}

export async function hydrateOwnedActiveProductCardPayload(
  userId: string,
  payload: Record<string, unknown>,
): Promise<ProductCardPayload> {
  const productId = typeof payload.productId === "string" ? payload.productId.trim() : "";
  if (!productId) {
    throw new ProductBindingError("PRODUCT_ID_REQUIRED", "请选择一个已上架产品。");
  }

  const product = await db.product.findFirst({
    where: { id: productId, userId, isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      priceText: true,
      coverImageUrl: true,
      ctaLabel: true,
      ctaUrl: true,
    },
  });
  if (!product) {
    throw new ProductBindingError(
      "PRODUCT_NOT_OWNED_OR_INACTIVE",
      "所选产品不存在、已下架或不属于当前账户。",
    );
  }

  return {
    productId: product.id,
    name: product.name,
    ...(product.category ? { category: product.category } : {}),
    ...(product.description ? { description: product.description } : {}),
    ...(product.priceText ? { priceText: product.priceText } : {}),
    ...(product.coverImageUrl ? { coverImageUrl: product.coverImageUrl } : {}),
    ...(product.ctaLabel ? { ctaLabel: product.ctaLabel } : {}),
    ...(product.ctaUrl ? { ctaUrl: product.ctaUrl } : {}),
  };
}

export function validateCompleteProductOrder(
  requestedIds: unknown,
  ownedIds: string[],
): string[] {
  if (!Array.isArray(requestedIds) || requestedIds.some((id) => typeof id !== "string")) {
    throw new ProductBindingError("INVALID_PRODUCT_ORDER", "产品排序格式不正确。");
  }

  const normalized = requestedIds.map((id) => id.trim());
  const requestedSet = new Set(normalized);
  const ownedSet = new Set(ownedIds);
  const complete = normalized.length === ownedIds.length
    && requestedSet.size === normalized.length
    && normalized.every((id) => ownedSet.has(id));

  if (!complete) {
    throw new ProductBindingError(
      "INVALID_PRODUCT_ORDER",
      "必须提交当前账户全部产品且不能包含重复、缺失或其他账户的产品。",
    );
  }

  return normalized;
}
