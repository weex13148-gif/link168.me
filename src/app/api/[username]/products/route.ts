/**
 * 公开产品列表 API
 * 路径: /api/[username]/products
 *
 * 个人公开名片只展示个人产品。企业归属产品必须由企业主页或企业授权页面展示。
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWorkspaceOwnedResourceIds } from "@/lib/workspace/resources";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;

  try {
    const profile = await db.profile.findFirst({
      where: { username: username.toLowerCase(), isPublic: true },
      select: {
        userId: true,
        user: { select: { frozenReason: true } },
      },
    });

    if (!profile || profile.user.frozenReason) {
      return NextResponse.json({ success: true, products: [] });
    }

    const enterpriseProductIds = await getWorkspaceOwnedResourceIds("product");
    const products = await db.product.findMany({
      where: {
        userId: profile.userId,
        isActive: true,
        ...(enterpriseProductIds.length > 0 ? { id: { notIn: enterpriseProductIds } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 20,
    });

    return NextResponse.json({
      success: true,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        priceText: product.priceText,
        coverImageUrl: product.coverImageUrl,
        ctaLabel: product.ctaLabel,
        ctaUrl: product.ctaUrl,
      })),
    });
  } catch (error) {
    console.error(`[products] 获取产品失败 @${username}:`, error);
    return NextResponse.json({ success: false, error: "获取产品列表失败。" }, { status: 500 });
  }
}
