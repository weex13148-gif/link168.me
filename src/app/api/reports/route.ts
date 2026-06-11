import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const reportTypes = new Set(["诈骗", "赌博", "色情", "侵权", "黑灰产", "违法违规", "其他"]);
const maxScreenshotSize = 2 * 1024 * 1024;
const allowedScreenshotTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const formData = await request.formData();
  const reportUrl = readString(formData.get("reportUrl"));
  const reportType = readString(formData.get("reportType"));
  const reportReason = readString(formData.get("reportReason"));
  const contact = readString(formData.get("contact"));
  const image = formData.get("image");

  if (!reportUrl) {
    return NextResponse.json({ success: false, error: "被举报链接不能为空。" }, { status: 400 });
  }

  if (!reportTypes.has(reportType)) {
    return NextResponse.json({ success: false, error: "请选择有效的举报类型。" }, { status: 400 });
  }

  if (!reportReason) {
    return NextResponse.json({ success: false, error: "举报说明不能为空。" }, { status: 400 });
  }

  let imageUrl: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (image.size > maxScreenshotSize) {
      return NextResponse.json({ success: false, error: "Screenshot must be 2MB or smaller." }, { status: 400 });
    }

    const ext = allowedScreenshotTypes.get(image.type);
    if (!ext) {
      return NextResponse.json({ success: false, error: "Screenshot must be JPEG, PNG, or WebP." }, { status: 400 });
    }

    const fileName = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "reports");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), Buffer.from(await image.arrayBuffer()));
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
