import { NextResponse } from "next/server";

const ADMIN_SECRET_HEADER = "x-admin-secret";
const MIN_ADMIN_SECRET_LENGTH = 32;

export function isAdminSecretConfigured() {
  const adminSecret = process.env.ADMIN_SECRET;

  return typeof adminSecret === "string" && adminSecret.length >= MIN_ADMIN_SECRET_LENGTH;
}

export function isAdminRequest(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  const providedSecret = request.headers.get(ADMIN_SECRET_HEADER);

  if (!isAdminSecretConfigured() || !providedSecret || !adminSecret) {
    return false;
  }

  if (providedSecret.length !== adminSecret.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < adminSecret.length; index += 1) {
    mismatch |= adminSecret.charCodeAt(index) ^ providedSecret.charCodeAt(index);
  }

  return mismatch === 0;
}

export function requireAdmin(request: Request) {
  if (!isAdminSecretConfigured()) {
    return NextResponse.json({ success: false, error: "ADMIN_SECRET is not configured." }, { status: 500 });
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export function requireAdminAction(request: Request, action: string) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  if (request.headers.get("x-admin-action") !== action) {
    return NextResponse.json({ success: false, error: "Admin action confirmation is required." }, { status: 403 });
  }

  return null;
}
