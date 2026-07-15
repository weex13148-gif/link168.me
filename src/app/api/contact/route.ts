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
 * - Lead 创建前复用公开访问状态守卫
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasSensitiveContent } from "@/lib/content-safety";
import { newId } from "@/lib/dashboard-data";
import { canShowPublicProfile, getActiveRestrictions } from "@/lib/auth";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 50;
const MAX_CONTACT_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SOURCE_COMPONENTS = new Set([
  "contact_form",
  "product_card",
  "service_card",
  "offer",
  "booking",
  "quote",
  "ai-chat",
]);

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

function stringField(body: Record<string, unknown>, key: string, maxLength: number): string {
  return typeof body[key] === "string" ? body[key].trim().slice(0, maxLength) : "";
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().slice(0, MAX_CONTACT_LENGTH);
  if (!email) return null;
  return email.includes("@") && email.includes(".") ? email : null;
}

function normalizePhone(value: string): string | null {
  const cleaned = value.replace(/[^\d+]/g, "").slice(0, 32);
  return cleaned.length >= 7 ? cleaned : null;
}

function normalizeWechat(value: string): string | null {
  const trimmed = value.trim().slice(0, MAX_CONTACT_LENGTH);
  if (!trimmed) return null;
  return trimmed.replace(/[^\w\-@.]/g, "").slice(0, MAX_CONTACT_LENGTH) || null;
}

function buildMessage(body: Record<string, unknown>, baseMessage: string, sourceComponent: string): string {
  const preferredDate = stringField(body, "preferredDate", 30);
  const preferredTime = stringField(body, "preferredTime", 30);
  const productName = stringField(body, "productName", 80);
  const serviceName = stringField(body, "serviceName", 80);
  const offerTitle = stringField(body, "offerTitle", 80);
  const couponCode = stringField(body, "couponCode", 80);
  const componentTitle = stringField(body, "componentTitle", 100);

  if (sourceComponent === "booking") {
    const lines = [
      productName || serviceName ? `预约项目：${productName || serviceName}` : "",
      preferredDate ? `预约日期：${preferredDate}` : "",
      preferredTime ? `预约时间：${preferredTime}` : "",
      baseMessage ? `备注：${baseMessage}` : "",
    ].filter(Boolean);
    return lines.join("\n").slice(0, MAX_MESSAGE_LENGTH);
  }

  if (sourceComponent === "quote") {
    const lines = [
      componentTitle || offerTitle ? `报价咨询：${componentTitle || offerTitle}` : "",
      couponCode ? `优惠码：${couponCode}` : "",
      baseMessage ? `需求说明：${baseMessage}` : "",
    ].filter(Boolean);
    return lines.join("\n").slice(0, MAX_MESSAGE_LENGTH);
  }

  if (sourceComponent === "contact_form") {
    const lines = [
      componentTitle ? `来源表单：${componentTitle}` : "",
      baseMessage ? `留言：${baseMessage}` : "",
    ].filter(Boolean);
    return lines.join("\n").slice(0, MAX_MESSAGE_LENGTH);
  }

  if (sourceComponent === "product_card" && productName && !baseMessage) {
    return `产品咨询：${productName}`.slice(0, MAX_MESSAGE_LENGTH);
  }

  if (sourceComponent === "service_card" && serviceName && !baseMessage) {
    return `服务咨询：${serviceName}`.slice(0, MAX_MESSAGE_LENGTH);
  }

  if (sourceComponent === "offer" && offerTitle && !baseMessage) {
    return `优惠咨询：${offerTitle}`.slice(0, MAX_MESSAGE_LENGTH);
  }

  return baseMessage;
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
    return NextResponse.json(
      { success: false, error: "提交内容无效。" },
      { status: 400 },
    );
  }

  const profileId = stringField(body, "profileId", 80);
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME_LENGTH) : "";
  const contact = stringField(body, "contact", MAX_CONTACT_LENGTH);
  const rawPhone = stringField(body, "phone", MAX_CONTACT_LENGTH);
  const rawEmail = stringField(body, "email", MAX_CONTACT_LENGTH);
  const rawWechat = stringField(body, "wechat", MAX_CONTACT_LENGTH);
  const rawMessage = stringField(body, "message", MAX_MESSAGE_LENGTH);
  const requestedSource = stringField(body, "sourceComponent", 50);
  if (requestedSource && !VALID_SOURCE_COMPONENTS.has(requestedSource)) {
    return NextResponse.json({ success: false, error: "来源组件无效。" }, { status: 400 });
  }
  const sourceComponent = requestedSource || "contact_form";
  const message = buildMessage(body, rawMessage, sourceComponent);
  const requestedSourcePage = stringField(body, "sourcePage", 200);
  const sourcePage = requestedSourcePage.startsWith("/") && !requestedSourcePage.startsWith("//")
    ? requestedSourcePage
    : null;
  const interestedProductId = stringField(body, "interestedProductId", 80) || null;

  if (!name) {
    return NextResponse.json(
      { success: false, error: "请填写姓名。" },
      { status: 400 }
    );
  }
  if (!contact && !rawPhone && !rawEmail && !rawWechat) {
    return NextResponse.json(
      { success: false, error: "请至少填写一种联系方式。" },
      { status: 400 }
    );
  }

  // 重复提交检测
  const duplicateKey = [rawPhone, rawEmail, rawWechat, contact].find(Boolean) || "";
  if (duplicateKey && !checkDuplicateSubmission(duplicateKey)) {
    return NextResponse.json(
      { success: false, error: "请勿重复提交。" },
      { status: 429 }
    );
  }

  // 内容安全检查
  const fieldsToCheck = [name, contact, rawPhone, rawEmail, rawWechat, message];
  for (const field of fieldsToCheck) {
    if (field && hasSensitiveContent(field).detected) {
      return NextResponse.json(
        { success: false, error: "提交内容包含受限关键词。" },
        { status: 400 }
      );
    }
  }

  let email: string | null = normalizeEmail(rawEmail);
  let phone: string | null = normalizePhone(rawPhone);
  let wechat: string | null = normalizeWechat(rawWechat);

  if (contact) {
    if (!email && contact.includes("@") && contact.includes(".")) {
      email = normalizeEmail(contact);
    } else {
      const parsedPhone = normalizePhone(contact);
      if (!phone && parsedPhone) {
        phone = parsedPhone;
      } else if (!wechat) {
        wechat = normalizeWechat(contact);
      }
    }
  }

  if (!email && !phone && !wechat) {
    return NextResponse.json(
      { success: false, error: "请填写有效的邮箱、电话或微信号。" },
      { status: 400 },
    );
  }

  // 查找目标 Profile
  if (!profileId && !username) {
    return NextResponse.json(
      { success: false, error: "主页标识无效。" },
      { status: 400 }
    );
  }
  if (profileId && !UUID_PATTERN.test(profileId)) {
    return NextResponse.json({ success: false, error: "主页标识无效。" }, { status: 400 });
  }

  let profile;
  try {
    profile = await db.profile.findUnique({
      where: profileId ? { id: profileId } : { username },
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
  if (username && profile.username !== username) {
    return NextResponse.json({ success: false, error: "主页不存在。" }, { status: 404 });
  }

  // ===== 公开访问状态守卫 =====
  // 未公开或受限主页不得继续接收公开 Lead
  if (!profile.isPublic) {
    return NextResponse.json(
      { success: false, error: "该主页未公开，无法提交联系信息。" },
      { status: 403 }
    );
  }

  try {
    const restrictions = await getActiveRestrictions(profile.userId);
    const visibility = canShowPublicProfile(restrictions);
    if (!visibility.ok) {
      return NextResponse.json(
        { success: false, error: "该主页暂时无法接收联系信息。" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "系统错误，请稍后重试。" },
      { status: 503 }
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
  const leadId = newId();
  try {
    await db.lead.create({
      data: {
        id: leadId,
        profileId: profile.id as string,
        name,
        email: email ?? undefined,
        phone: phone ?? undefined,
        wechat: wechat ?? undefined,
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
    leadId,
    message: "已收到你的联系请求，工作人员将尽快回复。",
  });
}
