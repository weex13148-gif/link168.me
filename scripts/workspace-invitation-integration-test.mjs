import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const baseUrl = process.env.WORKSPACE_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "WorkspaceTest-2026!";

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
  return { status: response.status, body, text, cookie: cookieFrom(response), headers: response.headers };
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
    body: JSON.stringify({ email, password, confirmPassword: password, agreeTerms: true }),
  });
  assert.equal(result.status, 200, `registration failed: ${JSON.stringify(result.body)}`);
  assert.ok(result.cookie);
  return { email, userId: result.body.user.id, cookie: result.cookie };
}

async function createWorkspace(owner, label) {
  const result = await request("/api/workspaces", {
    method: "POST",
    cookie: owner.cookie,
    body: JSON.stringify({
      name: `Workspace ${label}`,
      slug: `ws-${label}-${crypto.randomBytes(3).toString("hex")}`,
      workspaceType: "enterprise",
    }),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body?.success, true);
  return result.body.workspace;
}

async function insertInvitation(client, { workspaceId, email, role, invitedByUserId, token, expiresAt }) {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO workspace_invitations
      (id, workspace_id, email, role, token_hash, status, expires_at, invited_by_user_id, delivered_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, now(), now(), now())`,
    [id, workspaceId, email.toLowerCase(), role, hash(token), expiresAt, invitedByUserId],
  );
  return id;
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  await waitForServer();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const owner = await register("workspace-owner");
    const invitee = await register("workspace-invitee");
    const outsider = await register("workspace-outsider");
    const futureMemberEmail = uniqueEmail("workspace-unregistered");
    const workspace = await createWorkspace(owner, "primary");

    const failedDelivery = await request(`/api/workspaces/${workspace.id}/invitations`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ email: futureMemberEmail, role: "member" }),
    });
    assert.equal(failedDelivery.status, 502, JSON.stringify(failedDelivery.body));
    assert.equal(failedDelivery.body?.success, false);
    assert.equal(failedDelivery.body?.code, "SMTP_NOT_CONFIGURED");

    const failedRow = await client.query(
      `SELECT status, delivery_error_code FROM workspace_invitations
       WHERE workspace_id = $1 AND email = $2 ORDER BY created_at DESC LIMIT 1`,
      [workspace.id, futureMemberEmail.toLowerCase()],
    );
    assert.equal(failedRow.rows[0]?.status, "delivery_failed");
    assert.equal(failedRow.rows[0]?.delivery_error_code, "SMTP_NOT_CONFIGURED");
    const prematureMember = await client.query(
      `SELECT count(*)::int AS count FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 AND u.email = $2 AND wm.status = 'active'`,
      [workspace.id, futureMemberEmail.toLowerCase()],
    );
    assert.equal(prematureMember.rows[0]?.count, 0);
    console.log("PASS mail failure is explicit and does not create active membership");

    const token = `workspace-${crypto.randomBytes(32).toString("base64url")}`;
    const invitationId = await insertInvitation(client, {
      workspaceId: workspace.id,
      email: invitee.email,
      role: "member",
      invitedByUserId: owner.userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const beforeAccept = await request(`/api/workspaces/${workspace.id}`, { cookie: invitee.cookie });
    assert.equal(beforeAccept.status, 403, JSON.stringify(beforeAccept.body));
    assert.notEqual(beforeAccept.body?.success, true);
    console.log("PASS pending invitation grants no workspace access");

    const outsiderPreview = await request(`/api/workspace-invitations/${encodeURIComponent(token)}`, {
      cookie: outsider.cookie,
    });
    assert.equal(outsiderPreview.status, 200, JSON.stringify(outsiderPreview.body));
    assert.equal(outsiderPreview.body?.invitation?.matchesCurrentEmail, false);

    const wrongEmailAccept = await request(`/api/workspace-invitations/${encodeURIComponent(token)}`, {
      method: "POST",
      cookie: outsider.cookie,
    });
    assert.equal(wrongEmailAccept.status, 403, JSON.stringify(wrongEmailAccept.body));
    assert.equal(wrongEmailAccept.body?.code, "INVITATION_EMAIL_MISMATCH");
    console.log("PASS invitation can only be accepted by the invited email");

    const concurrentAccepts = await Promise.all([
      request(`/api/workspace-invitations/${encodeURIComponent(token)}`, { method: "POST", cookie: invitee.cookie }),
      request(`/api/workspace-invitations/${encodeURIComponent(token)}`, { method: "POST", cookie: invitee.cookie }),
    ]);
    assert.equal(concurrentAccepts.filter((item) => item.status === 200 && item.body?.success === true).length, 1);
    assert.equal(concurrentAccepts.filter((item) => item.status === 409 && item.body?.success === false).length, 1);

    const acceptedInvitation = await client.query(
      `SELECT status, accepted_by_user_id, accepted_at FROM workspace_invitations WHERE id = $1`,
      [invitationId],
    );
    assert.equal(acceptedInvitation.rows[0]?.status, "accepted");
    assert.equal(acceptedInvitation.rows[0]?.accepted_by_user_id, invitee.userId);
    assert.ok(acceptedInvitation.rows[0]?.accepted_at);

    const acceptedMembership = await client.query(
      `SELECT role, status, joined_at FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspace.id, invitee.userId],
    );
    assert.equal(acceptedMembership.rowCount, 1);
    assert.equal(acceptedMembership.rows[0]?.role, "member");
    assert.equal(acceptedMembership.rows[0]?.status, "active");
    assert.ok(acceptedMembership.rows[0]?.joined_at);

    const afterAccept = await request(`/api/workspaces/${workspace.id}`, { cookie: invitee.cookie });
    assert.equal(afterAccept.status, 200, JSON.stringify(afterAccept.body));
    assert.equal(afterAccept.body?.workspace?.myRole, "member");
    console.log("PASS invitation acceptance is atomic, single-use, and activates exactly one membership");

    const promote = await request(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({
        memberId: acceptedMembership.rows[0]?.id,
        action: "update_role",
        role: "admin",
      }),
    });
    if (promote.status !== 200) {
      const memberRow = await client.query(
        `SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
        [workspace.id, invitee.userId],
      );
      const retryPromote = await request(`/api/workspaces/${workspace.id}/members`, {
        method: "PATCH",
        cookie: owner.cookie,
        body: JSON.stringify({ memberId: memberRow.rows[0].id, action: "update_role", role: "admin" }),
      });
      assert.equal(retryPromote.status, 200, JSON.stringify(retryPromote.body));
    }

    const adminInviteAdmin = await request(`/api/workspaces/${workspace.id}/invitations`, {
      method: "POST",
      cookie: invitee.cookie,
      body: JSON.stringify({ email: uniqueEmail("workspace-admin-target"), role: "admin" }),
    });
    assert.equal(adminInviteAdmin.status, 403, JSON.stringify(adminInviteAdmin.body));
    assert.equal(adminInviteAdmin.body?.code, "WORKSPACE_ROLE_NOT_GRANTABLE");
    console.log("PASS admins cannot invite or grant other admins");

    const secondWorkspace = await createWorkspace(outsider, "secondary");
    const secondToken = `workspace-${crypto.randomBytes(32).toString("base64url")}`;
    const secondInvitationId = await insertInvitation(client, {
      workspaceId: secondWorkspace.id,
      email: futureMemberEmail,
      role: "viewer",
      invitedByUserId: outsider.userId,
      token: secondToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const crossWorkspaceRevoke = await request(`/api/workspaces/${workspace.id}/invitations`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ invitationId: secondInvitationId, action: "revoke" }),
    });
    assert.equal(crossWorkspaceRevoke.status, 404, JSON.stringify(crossWorkspaceRevoke.body));

    const untouched = await client.query("SELECT status FROM workspace_invitations WHERE id = $1", [secondInvitationId]);
    assert.equal(untouched.rows[0]?.status, "pending");
    console.log("PASS invitation operations are isolated by workspaceId");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
