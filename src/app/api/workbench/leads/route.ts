/**
 * Workbench Leads 列表 API
 * 路径: /api/workbench/leads
 *
 * GET /api/workbench/leads — 列出当前用户的所有线索（含产品快照、跟进记录）
 * GET /api/workbench/leads?export=true — 导出线索为 CSV
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile } from "@/lib/dashboard-data";
import { sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

// 统一状态枚举
const VALID_STATUSES = ["new", "contacted", "following", "converted", "closed"] as const;
type LeadStatus = typeof VALID_STATUSES[number];

// 旧状态映射（新系统不再使用，但历史数据可能存在）
const OLD_STATUS_MAP: Record<string, LeadStatus> = {
  qualified: "following",
  lost: "closed",
};

function normalizeStatus(status: string): LeadStatus | "unknown" {
  const lower = status.toLowerCase();
  if (VALID_STATUSES.includes(lower as LeadStatus)) {
    return lower as LeadStatus;
  }
  if (OLD_STATUS_MAP[lower]) {
    return OLD_STATUS_MAP[lower];
  }
  return "unknown";
}

/**
 * 防止 CSV 公式注入
 * 对以 =、+、-、@、\t、\r、\n 开头的字段进行转义
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // 如果以危险字符开头，转义为普通文本
  if (/^[=+\-@\t\r\n]/.test(str)) {
    return `'${str}`;
  }
  // 替换可能导致 CSV 注入的字符
  return str.replace(/"/g, '""');
}

/**
 * 生成 CSV 内容
 */
function generateCSV(leads: Array<{
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  message: string | null;
  source_component: string | null;
  status: string;
  created_at: string;
  interested_product_name: string | null;
  interested_product_price: string | null;
}>, exportFields: {
  name: string;
  email: string;
  phone: string;
  wechat: string;
  message: string;
  source: string;
  status: string;
  product: string;
  created_at: string;
}): string {
  const headers = Object.values(exportFields);
  const rows = leads.map((lead) => [
    escapeCSVField(lead.name),
    escapeCSVField(lead.email),
    escapeCSVField(lead.phone),
    escapeCSVField(lead.wechat),
    escapeCSVField(lead.message?.slice(0, 200)), // 限制消息长度
    escapeCSVField(lead.source_component),
    escapeCSVField(lead.status),
    escapeCSVField(lead.interested_product_name ? `${lead.interested_product_name}${lead.interested_product_price ? ` (${lead.interested_product_price})` : ""}` : ""),
    escapeCSVField(lead.created_at),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return "\ufeff" + csvContent; // BOM for Excel compatibility
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: "请先创建个人资料。" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)));
  const skip = (page - 1) * pageSize;

  // 搜索功能：支持姓名、邮箱、电话、微信搜索
  const searchQuery = searchParams.get("search")?.trim();
  const search = searchQuery
    ? {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" as const } },
          { email: { contains: searchQuery, mode: "insensitive" as const } },
          { phone: { contains: searchQuery, mode: "insensitive" as const } },
          { wechat: { contains: searchQuery, mode: "insensitive" as const } },
        ],
      }
    : {};

  // 日期范围筛选
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const dateRange = dateFrom || dateTo
    ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
        },
      }
    : {};

  // 来源筛选
  const sourceFilter = searchParams.get("source");
  const sourceFilterClause = sourceFilter
    ? { sourceComponent: sourceFilter }
    : {};

  // 构建状态过滤（支持新旧状态）
  let normalizedFilter: string | undefined;
  if (statusFilter) {
    const normalized = normalizeStatus(statusFilter);
    if (normalized !== "unknown") {
      normalizedFilter = normalized;
    }
  }

  const where = {
    profileId: profile.id,
    ...(normalizedFilter ? { status: normalizedFilter } : {}),
    ...search,
    ...dateRange,
    ...sourceFilterClause,
  };

  // 检查是否为导出请求
  const isExport = searchParams.get("export") === "true";

  // 导出限制：最多 10000 条
  const exportLimit = Math.min(10000, pageSize);

  if (isExport) {
    // 导出模式：返回 CSV 文件
    const exportLeads = await db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: exportLimit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        wechat: true,
        message: true,
        sourceComponent: true,
        status: true,
        createdAt: true,
        interestedProductName: true,
        interestedProductPrice: true,
      },
    });

    const csvData = exportLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      wechat: lead.wechat,
      message: lead.message,
      source_component: lead.sourceComponent,
      status: lead.status,
      created_at: lead.createdAt.toISOString(),
      interested_product_name: lead.interestedProductName,
      interested_product_price: lead.interestedProductPrice,
    }));

    const csvContent = generateCSV(csvData, {
      name: "姓名",
      email: "邮箱",
      phone: "电话",
      wechat: "微信",
      message: "留言",
      source: "来源",
      status: "状态",
      product: "咨询产品",
      created_at: "创建时间",
    });

    const today = new Date().toISOString().split("T")[0];
    const filename = `leads_export_${today}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // 正常列表请求
  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        interestedProduct: {
          select: {
            id: true,
            name: true,
            category: true,
            priceText: true,
            isActive: true,
          },
        },
        followUps: {
          orderBy: { createdAt: "desc" },
          take: 5, // 列表页只展示最新5条
        },
      },
    }),
    db.lead.count({ where }),
  ]);

  // 统计（使用新状态）
  const stats = {
    total,
    new: await db.lead.count({ where: { profileId: profile.id, status: "new" } }),
    contacted: await db.lead.count({ where: { profileId: profile.id, status: "contacted" } }),
    following: await db.lead.count({ where: { profileId: profile.id, status: "following" } }),
    converted: await db.lead.count({ where: { profileId: profile.id, status: "converted" } }),
    closed: await db.lead.count({ where: { profileId: profile.id, status: "closed" } }),
    // 统计可能存在的旧状态数据（仅计数，不计入主统计）
    legacyQualified: await db.lead.count({ where: { profileId: profile.id, status: "qualified" } }),
    legacyLost: await db.lead.count({ where: { profileId: profile.id, status: "lost" } }),
  };

  // DTO 转换
  const leadsDto = leads.map((lead) => ({
    id: lead.id,
    profile_id: lead.profileId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source_component: lead.sourceComponent,
    source_page: lead.sourcePage,
    status: lead.status,
    handler_note: lead.handlerNote,
    handled_at: lead.handledAt ? lead.handledAt.toISOString() : null,
    wechat: lead.wechat,
    interested_product_id: lead.interestedProductId,
    interested_product_name: lead.interestedProductName,
    interested_product_price: lead.interestedProductPrice,
    interested_product_category: lead.interestedProductCategory,
    conversation_id: lead.conversationId,
    notes: lead.notes, // 旧版备注，标记为历史
    is_legacy_note: !!lead.notes,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
    interested_product: lead.interestedProduct
      ? {
          id: lead.interestedProduct.id,
          name: lead.interestedProduct.name,
          category: lead.interestedProduct.category,
          price_text: lead.interestedProduct.priceText,
          is_active: lead.interestedProduct.isActive,
        }
      : null,
    // 产品快照状态判断
    product_snapshot_status: lead.interestedProduct
      ? (lead.interestedProduct.isActive ? "active" : "inactive")
      : lead.interestedProductId
        ? "deleted"
        : "none",
    follow_ups: lead.followUps.map((fu) => ({
      id: fu.id,
      content: fu.content,
      previous_status: fu.previousStatus,
      new_status: fu.newStatus,
      created_by_type: fu.createdByType,
      created_at: fu.createdAt.toISOString(),
    })),
    follow_ups_count: 0, // 前端需要单独请求详情获取完整数量
  }));

  return NextResponse.json({
    success: true,
    leads: leadsDto,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    stats,
    valid_statuses: VALID_STATUSES,
  });
}
