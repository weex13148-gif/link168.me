import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

type RegisterRequest = {
  email?: unknown;
  password?: unknown;
  agreeTerms?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  let body: RegisterRequest;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  try {
    body = (await request.json()) as RegisterRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const agreeTerms = body.agreeTerms === true;

  if (!agreeTerms) {
    return NextResponse.json({ success: false, error: "请先同意用户协议和隐私政策。" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "Valid email is required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await db.user.create({
      data: {
        id: uuidv4(),
        email,
        passwordHash,
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ success: false, error: "Email already registered." }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: "Register failed." }, { status: 500 });
  }
}
