import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ProductBindingError,
  validateCompleteProductOrder,
} from "@/lib/products/binding";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: { productIds?: unknown };
  try {
    body = await request.json() as { productIds?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const ownedProducts = await db.product.findMany({
    where: { userId: user.id },
    select: { id: true },
  });

  let productIds: string[];
  try {
    productIds = validateCompleteProductOrder(body.productIds, ownedProducts.map((product) => product.id));
  } catch (error) {
    if (error instanceof ProductBindingError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    await db.$transaction(async (tx) => {
      for (const [sortOrder, id] of productIds.entries()) {
        const updated = await tx.product.updateMany({
          where: { id, userId: user.id },
          data: { sortOrder },
        });
        if (updated.count !== 1) throw new Error("Product order changed during update");
      }
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "产品排序保存失败，请刷新后重试。" },
      { status: 409 },
    );
  }

  await revalidatePublicProfileByUser(user.id);
  return NextResponse.json({ success: true, productIds });
}
