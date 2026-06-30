/**
 * 链接排序批量更新 API
 * PATCH /api/dashboard/links/reorder
 *
 * 接收新的链接顺序，批量更新数据库中的 position 字段
 * 排序失败时返回明确错误提示
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile } from "@/lib/dashboard-data";

export const runtime = "nodejs";

type ReorderRequest = {
  /** 链接 ID 数组，按新顺序排列 */
  linkIds: unknown;
};

export async function PATCH(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: "请先创建个人资料。" },
      { status: 400 }
    );
  }

  let body: ReorderRequest;
  try {
    body = (await request.json()) as ReorderRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式不正确。" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.linkIds)) {
    return NextResponse.json(
      { success: false, error: "linkIds 必须是数组。" },
      { status: 400 }
    );
  }

  if (body.linkIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "没有需要排序的链接。" },
      { status: 400 }
    );
  }

  // 验证所有 ID 都是当前用户的链接
  const existingLinks = await db.link.findMany({
    where: { profileId: profile.id },
    select: { id: true, position: true },
  });

  const existingIds = new Set(existingLinks.map((l) => l.id));
  const requestedIds = body.linkIds as string[];

  // 检查是否有非法 ID（不属于当前用户的链接）
  for (const id of requestedIds) {
    if (!existingIds.has(id)) {
      return NextResponse.json(
        { success: false, error: `链接 ID 无效或不属于当前用户：${id}` },
        { status: 400 }
      );
    }
  }

  // 检查是否遗漏了链接（必须包含所有现有链接）
  if (requestedIds.length !== existingLinks.length) {
    return NextResponse.json(
      { success: false, error: `排序必须包含所有链接。当前有 ${existingLinks.length} 个链接，但提交了 ${requestedIds.length} 个。` },
      { status: 400 }
    );
  }

  // 批量更新 position
  try {
    await Promise.all(
      requestedIds.map((id, index) =>
        db.link.update({
          where: { id },
          data: { position: index },
        })
      )
    );
  } catch (err) {
    console.error("[links/reorder] 批量更新失败:", err);
    return NextResponse.json(
      { success: false, error: "排序保存失败，请稍后重试。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
