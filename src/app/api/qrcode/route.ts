/**
 * QRCode 下载 API
 * GET /api/qrcode?url=...
 * 返回 PNG 格式的 QRCode 图片
 *
 * 依赖：react-qr-code（已安装，前端渲染用）
 * 原理：服务端用 SVG 生成 QR，不依赖 canvas 原生库
 */
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import type { QRCodeToFileStreamOptions } from "qrcode";

export const runtime = "nodejs";

/**
 * GET /api/qrcode?url=https://example.com&size=300&dark=000000&light=ffffff&filename=myqr
 *
 * Query params:
 * - url (required): 要编码的 URL
 * - size (optional): 图片像素尺寸，默认 300
 * - dark (optional): 前景色（hex，不含#），默认 000000
 * - light (optional): 背景色（hex，不含#），默认 ffffff
 * - margin (optional): 边距块数，默认 4
 * - filename (optional): 下载文件名（不含扩展名），默认 qrcode
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const url = searchParams.get("url");
  if (!url || url.trim().length === 0) {
    return NextResponse.json(
      { error: "缺少 url 参数" },
      { status: 400 }
    );
  }

  // 协议白名单校验
  const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "不支持的 URL 协议" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "无效的 URL 格式" },
      { status: 400 }
    );
  }

  const size = Math.min(
    parseInt(searchParams.get("size") || "300", 10),
    1024
  );
  const dark = searchParams.get("dark")?.replace("#", "") || "000000";
  const light = searchParams.get("light")?.replace("#", "") || "ffffff";
  const margin = Math.min(
    parseInt(searchParams.get("margin") || "4", 10),
    10
  );
  const filename = searchParams.get("filename") || "qrcode";

  const options: QRCodeToFileStreamOptions = {
    type: "png",
    width: size,
    margin,
    color: {
      dark: `#${dark}`,
      light: `#${light}`,
    },
    errorCorrectionLevel: "M",
  };

  try {
    // 生成 PNG buffer
    const buffer = await QRCode.toBuffer(url, options);

    // Convert Node Buffer to Uint8Array for NextResponse
    const uint8 = new Uint8Array(buffer);
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.png"; filename*=UTF-8''${encodeURIComponent(filename)}.png`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[qrcode] 生成失败:", err);
    return NextResponse.json(
      { error: "QRCode 生成失败" },
      { status: 500 }
    );
  }
}
