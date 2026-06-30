/**
 * 公开联系表单 API
 * 路径: /api/contact
 *
 * POST /api/contact — 访客提交联系信息，创建 Lead 记录
 *
 * 安全策略：
 * - 不需要登录
 * - 频率限制：同一 IP 每分钟最多 3 次
 * - 字段长度限制，防止滥用
 * - 蜜罐字段检测
 * - 重复提交检测（基于联系方式哈希）
 * - 内容安全检查
 * - 不存储敏感个人信息
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasSensitiveContent } from "@/lib/content-safety";
import { newId } from "@/lib/dashboard-data";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 50;
const MAX_CONTACT_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

// 简单内存频率限制（每次部署重置，生产环境应使用 Redis）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 3) {
    return false;
  }

  entry.count++;
  return true;
}

// 重复提交检测：基于联系方式的哈希
const recentSubmissions = new Map<string, number>(); // contactHash -> timestamp
const SUBMISSION_WINDOW_MS = 5 * 60 * 1000; // 5分钟内不允许重复提交

function getContactHash(contact: string): string {
  return crypto.createHash("sha256").update(contact.toLowerCase().trim()).digest("hex").slice(0, 16);
}

function checkDuplicateSubmission(contact: string): boolean {
  const hash = getContactHash(contact);
  const lastSubmit = recentSubmissions.get(hash);
  const now = Date.now();

  if (lastSubmit && now - lastSubmit < SUBMISSION_WINDOW_MS) {
    return false; // 重复提交
  }

  recentSubmissions.set(hash, now);
  // 定期清理过期记录
  if (recentSubmissions.size > 10000) {
    for (const [k, v] of recentSubmissions) {
      if (now - v > SUBMISSION_WINDOW_MS * 2) {
        recentSubmissions.delete(k);
      }
    }
  }

  return true;
}

/**
 * 简单的蜜罐字段检测
 * 如果提交中包含名为 website 或 url 的非空字段（爬虫会填充），则视为机器人
 */
function isHoneypotTriggered(body: Record<string, unknown>): boolean {
  const honeypotFields = ["website", "url", "homepage", "site"];
  for (const field of honeypotFields) {
    if (body[field] && typeof body[field] === "string" && (body[field] as string).trim().length > 0) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  // 频率限制
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "操作过于频繁，请稍后重试。" },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式不正确。" },
      { status: 400 }
    );
  }

  // 蜜罐检测
  if (isHoneypotTriggered(body)) {
    // 静默拒绝，但不暴露检测逻辑
    return NextResponse.json({
      success: true,
      message: "已收到你的联系请求，工作人员将尽快回复。",
    });
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_LENGTH) : "";
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, MAX_CONTACT_LENGTH) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  const sourceComponent = typeof body.sourceComponent === "string" ? body.sourceComponent.trim() : "contact_form";
  const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage.trim() : null;
  const interestedProductId = typeof body.interestedProductId === "string" ? body.interestedProductId.trim() : null;

  // 至少需要姓名或联系方式
  if (!name && !contact) {
    return NextResponse.json(
      { success: false, error: "请填写姓名或联系方式。" },
      { status: 400 }
    );
  }

  // 重复提交检测
  if (contact && !checkDuplicateSubmission(contact)) {
    return NextResponse.json(
      { success: false, error: "请勿重复提交。" },
      { status: 429 }
    );
  }

  // 内容安全检查
  const fieldsToCheck = [name, contact, message];
  for (const field of fieldsToCheck) {
    if (field && hasSensitiveContent(field).detected) {
      return NextResponse.json(
        { success: false, error: "提交内容包含受限关键词。" },
        { status: 400 }
      );
    }
  }

  // 解析联系方式（邮箱 vs 电话）
  let email: string | null = null;
  let phone: string | null = null;

  if (contact) {
    if (contact.includes("@") && contact.includes(".")) {
      email = contact;
    } else {
      // 清理电话号码（只保留数字/+）
      const cleaned = contact.replace(/[^\d+]/g, "");
      if (cleaned.length >= 7) {
        phone = cleaned;
      } else {
        email = contact; // 当作其他联系方式保存
      }
    }
  }

  // 查找目标 Profile
  if (!username) {
    return NextResponse.json(
      { success: false, error: "用户名无效。" },
      { status: 400 }
    );
  }

  let profile;
  try {
    profile = await db.profile.findUnique({
      where: { username },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "系统错误，请稍后重试。" },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "用户不存在。" },
      { status: 404 }
    );
  }

  // 验证产品 ID（如果提供了 interestedProductId，必须属于当前用户且已激活）
  // 并同时快照产品信息，防止下架/删除后历史丢失
  let validatedProductId: string | undefined = undefined;
  let productSnapshot: { name: string | null; price: string | null; category: string | null } | null = null;
  if (interestedProductId) {
    const product = await db.product.findFirst({
      where: {
        id: interestedProductId,
        userId: profile.userId,
        isActive: true,
      },
      select: { id: true, name: true, priceText: true, category: true },
    });
    if (product) {
      validatedProductId = product.id;
      productSnapshot = {
        name: product.name,
        price: product.priceText,
        category: product.category,
      };
    }
    // 产品不存在、已下架或不属于当前用户：不建立关联，静默忽略
  }

  // 创建 Lead（包含产品快照）
  try {
    await db.lead.create({
      data: {
        id: newId(),
        profileId: profile.id as string,
        name: name || null,
        email: email ?? undefined,
        phone: phone ?? undefined,
        message: message || null,
        sourceComponent,
        sourcePage: sourcePage || `/${username}`,
        status: "new",
        interestedProductId: validatedProductId,
        interestedProductName: productSnapshot?.name ?? null,
        interestedProductPrice: productSnapshot?.price ?? null,
        interestedProductCategory: productSnapshot?.category ?? null,
      } as Parameters<typeof db.lead.create>[0]["data"],
    });
  } catch (err) {
    console.error("[contact] 创建 Lead 失败:", err);
    return NextResponse.json(
      { success: false, error: "提交失败，请稍后重试。" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "已收到你的联系请求，工作人员将尽快回复。",
  });
}
