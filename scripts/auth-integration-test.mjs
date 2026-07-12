import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const baseUrl = process.env.AUTH_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "AuthTest-2026!";
const newPassword = "AuthTest-New-2026!";

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

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
  return { response, status: response.status, body, text, cookie: cookieFrom(response) };
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

function uniqueEmail(label) {
  return `${label}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}@example.com`;
}

async function register(label) {
  const email = uniqueEmail(label);
  const result = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
      agreeTerms: true,
    }),
  });
  assert.equal(result.status, 200, `registration failed: ${JSON.stringify(result.body)}`);
  assert.equal(result.body?.success, true);
  assert.equal(
    result.body?.emailVerificationSent,
    false,
    "MAIL_ENABLED=false must not be reported as a successful verification email send",
  );
  assert.ok(result.body?.user?.id);
  assert.ok(result.body?.profile?.username);
  assert.ok(result.cookie, "registration did not set a session cookie");
  return {
    email,
    userId: result.body.user.id,
    username: result.body.profile.username,
    cookie: result.cookie,
  };
}

async function login(email, loginPassword = password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: loginPassword }),
  });
}

async function insertVerificationCode(client, userId, code) {
  const now = new Date();
  await client.query(
    `UPDATE email_verification_tokens
       SET used = true, used_at = $2
     WHERE user_id = $1 AND used = false`,
    [userId, now],
  );
  await client.query(
    `INSERT INTO email_verification_tokens
       (id, user_id, token_hash, expires_at, used, sent_at, created_at)
     VALUES ($1, $2, $3, $4, false, $5, $5)`,
    [crypto.randomUUID(), userId, hash(`${userId}:${code}`), new Date(now.getTime() + 10 * 60_000), now],
  );
}

async function insertResetToken(client, userId, token) {
  const now = new Date();
  await client.query(
    `UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false`,
    [userId],
  );
  await client.query(
    `INSERT INTO password_reset_tokens
       (id, user_id, token_hash, expires_at, used, created_at)
     VALUES ($1, $2, $3, $4, false, $5)`,
    [crypto.randomUUID(), userId, hash(token), new Date(now.getTime() + 2 * 60 * 60_000), now],
  );
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  await waitForServer();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const day29 = await register("auth-day29");
    await client.query("UPDATE users SET created_at = $2 WHERE id = $1", [
      day29.userId,
      new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    ]);
    const day29Login = await login(day29.email);
    assert.equal(day29Login.status, 200, JSON.stringify(day29Login.body));
    assert.equal(day29Login.body?.success, true);
    assert.equal(
      day29Login.body?.restrictions?.items?.some((item) => item.type === "EMAIL_UNVERIFIED"),
      false,
      "29-day account was restricted too early",
    );
    console.log("PASS 29-day unverified account remains unrestricted");

    const day30 = await register("auth-day30");
    await client.query("UPDATE users SET created_at = $2 WHERE id = $1", [
      day30.userId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ]);
    const day30Login = await login(day30.email);
    assert.equal(day30Login.status, 200, JSON.stringify(day30Login.body));
    assert.equal(day30Login.body?.success, true);
    assert.equal(
      day30Login.body?.restrictions?.items?.some((item) => item.type === "EMAIL_UNVERIFIED"),
      true,
      "30-day account did not receive the email restriction",
    );
    const publicRestricted = await request(`/${day30.username}`);
    assert.equal(publicRestricted.status, 200);
    assert.match(publicRestricted.text, /该主页尚未完成邮箱验证/);
    console.log("PASS 30-day account can log in while public profile is restricted");

    const day31 = await register("auth-day31");
    await client.query("UPDATE users SET created_at = $2 WHERE id = $1", [
      day31.userId,
      new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
    ]);
    const day31Login = await login(day31.email);
    assert.equal(day31Login.status, 200, JSON.stringify(day31Login.body));
    assert.equal(
      day31Login.body?.restrictions?.items?.some((item) => item.type === "EMAIL_UNVERIFIED"),
      true,
      "over-30-day account did not remain restricted",
    );
    console.log("PASS over-30-day unverified account remains restricted");

    await client.query(
      `INSERT INTO freeze_records
         (id, user_id, type, reason, source, is_active, starts_at, created_at, updated_at)
       VALUES ($1, $2, 'ADMIN_FREEZE', 'integration-test', 'admin', true, now(), now(), now())`,
      [crypto.randomUUID(), day30.userId],
    );

    const code = "123456";
    await insertVerificationCode(client, day30.userId, code);
    const verificationResults = await Promise.all([
      request("/api/auth/verify-email/confirm", {
        method: "POST",
        cookie: day30Login.cookie,
        body: JSON.stringify({ code }),
      }),
      request("/api/auth/verify-email/confirm", {
        method: "POST",
        cookie: day30Login.cookie,
        body: JSON.stringify({ code }),
      }),
    ]);
    assert.equal(verificationResults.filter((item) => item.status === 200 && item.body?.success === true).length, 1);
    assert.equal(verificationResults.filter((item) => item.status === 400 && item.body?.success === false).length, 1);

    const verifiedUser = await client.query(
      "SELECT email_verified FROM users WHERE id = $1",
      [day30.userId],
    );
    assert.equal(verifiedUser.rows[0]?.email_verified, true);
    const activeRestrictions = await client.query(
      "SELECT type FROM freeze_records WHERE user_id = $1 AND is_active = true ORDER BY type",
      [day30.userId],
    );
    assert.deepEqual(activeRestrictions.rows.map((row) => row.type), ["ADMIN_FREEZE"]);
    const publicAdminFrozen = await request(`/${day30.username}`);
    assert.match(publicAdminFrozen.text, /管理员已暂停该主页展示/);
    console.log("PASS verification is single-use and clears only EMAIL_UNVERIFIED");

    const resetUser = await register("auth-reset");
    const resetToken = `reset-${crypto.randomBytes(20).toString("hex")}`;
    await insertResetToken(client, resetUser.userId, resetToken);
    const resetResults = await Promise.all([
      request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password: newPassword, confirmPassword: newPassword }),
      }),
      request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password: newPassword, confirmPassword: newPassword }),
      }),
    ]);
    assert.equal(resetResults.filter((item) => item.status === 200 && item.body?.success === true).length, 1);
    assert.equal(resetResults.filter((item) => item.status === 400 && item.body?.success === false).length, 1);

    const oldSession = await request("/api/auth/sessions", { method: "GET", cookie: resetUser.cookie });
    assert.equal(oldSession.status, 401, `old session remained active: ${JSON.stringify(oldSession.body)}`);
    const oldPasswordLogin = await login(resetUser.email, password);
    assert.equal(oldPasswordLogin.status, 401);
    const newPasswordLogin = await login(resetUser.email, newPassword);
    assert.equal(newPasswordLogin.status, 200, JSON.stringify(newPasswordLogin.body));
    assert.equal(newPasswordLogin.body?.success, true);
    console.log("PASS password reset is single-use and revokes old sessions");

    const sessionFailureUser = await register("auth-session-failure-login");
    const recoveryEmail = uniqueEmail("auth-session-failure-register");
    await client.query("ALTER TABLE sessions RENAME TO sessions_unavailable");
    try {
      const failedLogin = await login(sessionFailureUser.email);
      assert.equal(failedLogin.status, 503, JSON.stringify(failedLogin.body));
      assert.equal(failedLogin.body?.errorCode, "SESSION_CREATE_FAILED");

      const failedRegistration = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: recoveryEmail,
          password,
          confirmPassword: password,
          agreeTerms: true,
        }),
      });
      assert.equal(failedRegistration.status, 503, JSON.stringify(failedRegistration.body));
      assert.equal(failedRegistration.body?.errorCode, "SESSION_CREATE_FAILED");
      assert.equal(failedRegistration.body?.redirectTo, "/login");

      const audit = await client.query(
        "SELECT count(*)::int AS count FROM login_attempts WHERE email = $1 AND success = true",
        [sessionFailureUser.email],
      );
      assert.equal(audit.rows[0]?.count, 0, "session creation failure was recorded as a successful login");
    } finally {
      await client.query("ALTER TABLE sessions_unavailable RENAME TO sessions");
    }

    const recoveredLogin = await login(recoveryEmail);
    assert.equal(recoveredLogin.status, 200, JSON.stringify(recoveredLogin.body));
    assert.equal(recoveredLogin.body?.success, true);
    console.log("PASS session failures do not create fake success and registration remains recoverable");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
