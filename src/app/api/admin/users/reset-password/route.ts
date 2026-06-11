import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  email?: unknown;
  password?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  const unauthorized = requireAdminAction(request, "reset-password");
  if (unauthorized) {
    return unauthorized;
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as ResetPasswordRequest;
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "Valid email is required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
  }

  await db.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  return NextResponse.json({ success: true });
}
