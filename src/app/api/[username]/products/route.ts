/**
 * 公开产品列表 API
 * 路径: /api/[username]/products
 *
 * GET /api/[username]/products — 获取指定用户的已激活产品列表
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;

  try {
    // 先通过用户名找到 Profile
    const profile = await db.profile.findFirst({
      where: {
        username: username.toLowerCase(),
        isPublic: true,
      },
      select: {
        userId: true,
        user: {
          select: {
            frozenReason: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({
        success: true,
        products: [],
      });
    }

    // 检查用户是否被冻结（frozenReason 非空表示冻结）
    if (profile.user.frozenReason) {
      return NextResponse.json({
        success: true,
        products: [],
      });
    }

    // 查询用户的产品
    const products = await db.product.findMany({
      where: {
        userId: profile.userId,
        status: "published",
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 20,
    });

    // 转换为 DTO
    const productDtos = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      priceText: p.priceText,
      coverImageUrl: p.coverImageUrl,
      ctaLabel: p.ctaLabel,
      ctaUrl: p.ctaUrl,
    }));

    return NextResponse.json({
      success: true,
      products: productDtos,
    });
  } catch (err) {
    console.error(`[products] 获取产品失败 @${username}:`, err);
    return NextResponse.json(
      { success: false, error: "获取产品列表失败。" },
      { status: 500 }
    );
  }
}
