import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 基础校验
    if (!body.name || typeof body.value !== "number") {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    // 目前仅记录到服务端日志，后续可接入数据库或外部监控系统（如阿里云 ARMS）
    // eslint-disable-next-line no-console
    console.log("[Analytics:Vitals]", {
      name: body.name,
      value: body.value,
      rating: body.rating,
      url: body.url,
      navigationType: body.navigationType,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
}
