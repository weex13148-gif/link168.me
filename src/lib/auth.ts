import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "link168_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type CurrentUser = {
  id: string;
  email: string;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const token = createToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function deleteSessionToken(token: string | undefined) {
  if (!token) return;

  await db.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function getCurrentUserByToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) return null;

  const session = await db.session.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  return session?.user ?? null;
}

export async function getCurrentUserFromRequest(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  return getCurrentUserByToken(token);
}

export async function getCurrentUserFromCookies() {
  const cookieStore = await cookies();
  return getCurrentUserByToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireUser(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { user, response: null };
}
