import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

const reportTypes = new Set(["诈骗", "赌博", "色情", "侵权", "黑灰产", "违法违规", "其他"]);
const maxScreenshotSize = 2 * 1024 * 1024;
const allowedScreenshotTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const MAX_REPORT_URL_LENGTH = 2048;
const MAX_REPORT_REASON_LENGTH = 1000;
const MAX_CONTACT_LENGTH = 200;

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidReportUrl(value: string) {
  if (!value || value.length > MAX_REPORT_URL_LENGTH) return false;
  try {
    const url = new URL(value, "https://link168.me");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  const rl = rateLimit(request, "reports:create", 5, 30 * 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `提交过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "提交内容格式不正确。" }, { status: 400 });
  }

  const reportUrl = readString(formData.get("reportUrl"));
  const reportType = readString(formData.get("reportType"));
  const reportReason = sanitizePublicText(readString(formData.get("reportReason"))) || "";
  const contact = sanitizePublicText(readString(formData.get("contact"))) || "";
  const image = formData.get("image");

  if (!isValidReportUrl(reportUrl)) {
    return NextResponse.json({ success: false, error: "请输入有效的被举报链接。" }, { status: 400 });
  }

  if (!reportTypes.has(reportType)) {
    return NextResponse.json({ success: false, error: "请选择有效的举报类型。" }, { status: 400 });
  }

  if (!reportReason || reportReason.length > MAX_REPORT_REASON_LENGTH) {
    return NextResponse.json(
      { success: false, error: `举报说明不能为空且不能超过 ${MAX_REPORT_REASON_LENGTH} 字。` },
      { status: 400 },
    );
  }

  if (contact.length > MAX_CONTACT_LENGTH) {
    return NextResponse.json({ success: false, error: `联系方式不能超过 ${MAX_CONTACT_LENGTH} 字。` }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    if (image.size > maxScreenshotSize) {
      return NextResponse.json({ success: false, error: "截图不能超过 2MB。" }, { status: 400 });
    }

    const ext = allowedScreenshotTypes.get(image.type);
    if (!ext) {
      return NextResponse.json({ success: false, error: "截图仅支持 JPEG、PNG 或 WebP。" }, { status: 400 });
    }

    const fileName = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "reports");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(await image.arrayBuffer()), { flag: "wx" });
    imageUrl = `/uploads/reports/${fileName}`;
  }

  await db.report.create({
    data: {
      id: uuidv4(),
      reportUrl,
      reportType,
      reportReason,
      contact: contact || null,
      imageUrl,
      status: "待处理",
    },
  });

  return NextResponse.json({ success: true, message: "举报已提交，管理员将在审核后处理。" });
}
