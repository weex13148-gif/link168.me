import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 旧 /api/admin 全部返回 404，真正的后台 API 在 /api/jeepwork/*

export async function GET() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}

export async function PATCH() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
}
