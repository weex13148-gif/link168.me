import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";

const baseUrl = process.env.CONSOLE_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "ConsoleTest-2026!";

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie");
  return raw ? raw.split(";", 1)[0] : "";
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, headers: response.headers, text, body, cookie: cookieFrom(response) };
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next.js server did not become ready: ${lastError || "timeout"}`);
}

async function main() {
  await waitForServer();

  const email = `console-${Date.now()}-${crypto.randomBytes(4).toString("hex")}@example.com`;
  const registration = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
      agreeTerms: true,
    }),
  });

  assert.equal(registration.status, 200, `registration failed: ${JSON.stringify(registration.body)}`);
  assert.ok(registration.cookie, "registration did not establish an authenticated session");

  const formalRoutes = [
    "/console",
    "/console/card",
    "/console/customers",
    "/console/ai",
    "/console/account",
  ];

  const formalResponses = new Map();
  for (const route of formalRoutes) {
    const result = await request(route, { cookie: registration.cookie });
    assert.equal(result.status, 200, `${route} returned ${result.status}`);
    assert.notEqual(result.headers.get("location"), "/login", `${route} redirected to login`);
    assert.doesNotMatch(result.text, /href=["']\/jeepwork(?:[\/"'])/, `${route} exposed Jeepwork in user navigation`);
    formalResponses.set(route, result);
  }

  const home = formalResponses.get("/console");
  assert.ok(home);
  for (const route of formalRoutes) {
    assert.match(home.text, new RegExp(`href=["']${route.replaceAll("/", "\\/")}["']`), `home is missing ${route}`);
  }
  assert.doesNotMatch(home.text, /href=["']\/(?:dashboard|workbench)(?:[\/"'])/, "console home still links directly to legacy user routes");

  const legacyRoutes = [
    "/dashboard",
    "/workbench/leads",
    "/workbench/ai",
    "/workbench/account",
  ];

  for (const route of legacyRoutes) {
    const result = await request(route, { cookie: registration.cookie });
    assert.equal(result.status, 200, `${route} compatibility route returned ${result.status}`);
    assert.doesNotMatch(result.text, /href=["']\/jeepwork(?:[\/"'])/, `${route} exposed Jeepwork in user navigation`);
  }

  console.log("PASS five formal Console routes render for an authenticated user");
  console.log("PASS Console home links only to approved /console sections");
  console.log("PASS legacy Dashboard and Workbench routes remain compatible");
  console.log("PASS Jeepwork is absent from ordinary user navigation");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
