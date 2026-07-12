import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const baseUrl = process.env.WORKSPACE_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "WorkspaceResource-2026!";
let ipCounter = 100;

function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
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
      ...(options.ip ? { "x-forwarded-for": options.ip } : {}),
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
    ip: nextIp(),
    body: JSON.stringify({ email, password, confirmPassword: password, agreeTerms: true }),
  });
  assert.equal(result.status, 200, `registration failed: ${JSON.stringify(result.body)}`);
  assert.ok(result.cookie);
  return {
    email,
    userId: result.body.user.id,
    username: result.body.profile.username,
    cookie: result.cookie,
  };
}

async function createWorkspace(owner, label) {
  const result = await request("/api/workspaces", {
    method: "POST",
    cookie: owner.cookie,
    body: JSON.stringify({
      name: `Resource Workspace ${label}`,
      slug: `resource-${label}-${crypto.randomBytes(3).toString("hex")}`,
      workspaceType: "enterprise",
    }),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.workspace;
}

async function addActiveMember(client, workspaceId, ownerId, userId, role = "member") {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO workspace_members
      (id, workspace_id, user_id, role, status, invited_by, invited_at, joined_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', $5, now(), now(), now(), now())`,
    [id, workspaceId, userId, role, ownerId],
  );
  return id;
}

async function main() {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
  await waitForServer();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const owner = await register("resource-owner");
    const memberA = await register("resource-member-a");
    const memberB = await register("resource-member-b");
    const outsider = await register("resource-outsider");
    const workspace = await createWorkspace(owner, "primary");
    const otherWorkspace = await createWorkspace(outsider, "other");
    const memberAId = await addActiveMember(client, workspace.id, owner.userId, memberA.userId, "member");
    await addActiveMember(client, workspace.id, owner.userId, memberB.userId, "viewer");

    const productCreate = await request(`/api/workspaces/${workspace.id}/products`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({
        name: "企业专属产品",
        category: "SaaS",
        description: "只属于当前企业空间",
        priceText: "联系报价",
        isActive: true,
        assignedToUserId: null,
      }),
    });
    assert.equal(productCreate.status, 201, JSON.stringify(productCreate.body));
    const productId = productCreate.body.product.id;

    const knowledgeCreate = await request(`/api/workspaces/${workspace.id}/knowledge`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({
        title: "企业内部SOP",
        category: "sop",
        content: "仅供当前企业成员使用。",
        assignedToUserId: null,
      }),
    });
    assert.equal(knowledgeCreate.status, 201, JSON.stringify(knowledgeCreate.body));
    const docId = knowledgeCreate.body.doc.id;

    const mappings = await client.query(
      `SELECT resource_type, resource_id, workspace_id FROM workspace_resources
       WHERE resource_id = ANY($1::uuid[]) ORDER BY resource_type`,
      [[productId, docId]],
    );
    assert.equal(mappings.rowCount, 2);
    assert.ok(mappings.rows.every((row) => row.workspace_id === workspace.id));
    console.log("PASS enterprise product and knowledge ownership mappings are created transactionally");

    const personalProducts = await request("/api/dashboard/products", { cookie: owner.cookie });
    assert.equal(personalProducts.status, 200, JSON.stringify(personalProducts.body));
    assert.equal(personalProducts.body.products.some((item) => item.id === productId), false);
    const personalProductItem = await request(`/api/dashboard/products/${productId}`, { cookie: owner.cookie });
    assert.equal(personalProductItem.status, 404, JSON.stringify(personalProductItem.body));

    const personalKnowledge = await request("/api/dashboard/knowledge", { cookie: owner.cookie });
    assert.equal(personalKnowledge.status, 200, JSON.stringify(personalKnowledge.body));
    assert.equal(personalKnowledge.body.docs.some((item) => item.id === docId), false);
    const personalKnowledgeItem = await request(`/api/dashboard/knowledge/${docId}`, { cookie: owner.cookie });
    assert.equal(personalKnowledgeItem.status, 404, JSON.stringify(personalKnowledgeItem.body));

    const publicProducts = await request(`/api/${owner.username}/products`);
    assert.equal(publicProducts.status, 200, JSON.stringify(publicProducts.body));
    assert.equal(publicProducts.body.products.some((item) => item.id === productId), false);
    console.log("PASS enterprise resources are hidden from personal APIs and personal public profiles");

    const memberProducts = await request(`/api/workspaces/${workspace.id}/products`, { cookie: memberA.cookie });
    assert.equal(memberProducts.status, 200, JSON.stringify(memberProducts.body));
    assert.equal(memberProducts.body.products.some((item) => item.id === productId), true);
    const memberKnowledge = await request(`/api/workspaces/${workspace.id}/knowledge`, { cookie: memberA.cookie });
    assert.equal(memberKnowledge.status, 200, JSON.stringify(memberKnowledge.body));
    assert.equal(memberKnowledge.body.docs.some((item) => item.id === docId), true);

    const memberCreateDenied = await request(`/api/workspaces/${workspace.id}/products`, {
      method: "POST",
      cookie: memberA.cookie,
      body: JSON.stringify({ name: "越权产品" }),
    });
    assert.equal(memberCreateDenied.status, 403, JSON.stringify(memberCreateDenied.body));
    assert.equal(memberCreateDenied.body.code, "WORKSPACE_RESOURCE_MANAGE_DENIED");
    console.log("PASS active members can read shared resources but cannot manage them");

    const assignProduct = await request(`/api/workspaces/${workspace.id}/products/${productId}`, {
      method: "PUT",
      cookie: owner.cookie,
      body: JSON.stringify({ assignedToUserId: memberB.userId }),
    });
    assert.equal(assignProduct.status, 200, JSON.stringify(assignProduct.body));
    const memberAAfterAssignment = await request(`/api/workspaces/${workspace.id}/products`, { cookie: memberA.cookie });
    assert.equal(memberAAfterAssignment.status, 200, JSON.stringify(memberAAfterAssignment.body));
    assert.equal(memberAAfterAssignment.body.products.some((item) => item.id === productId), false);
    const memberBProducts = await request(`/api/workspaces/${workspace.id}/products`, { cookie: memberB.cookie });
    assert.equal(memberBProducts.status, 200, JSON.stringify(memberBProducts.body));
    assert.equal(memberBProducts.body.products.some((item) => item.id === productId), true);
    console.log("PASS members see only shared resources or resources assigned to themselves");

    const crossWorkspaceProduct = await request(`/api/workspaces/${otherWorkspace.id}/products/${productId}`, {
      cookie: outsider.cookie,
    });
    assert.equal(crossWorkspaceProduct.status, 404, JSON.stringify(crossWorkspaceProduct.body));
    const crossWorkspaceKnowledge = await request(`/api/workspaces/${otherWorkspace.id}/knowledge/${docId}`, {
      cookie: outsider.cookie,
    });
    assert.equal(crossWorkspaceKnowledge.status, 404, JSON.stringify(crossWorkspaceKnowledge.body));
    console.log("PASS enterprise resources cannot be accessed through another workspaceId");

    const removeMember = await request(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ memberId: memberAId, action: "remove" }),
    });
    assert.equal(removeMember.status, 200, JSON.stringify(removeMember.body));
    const removedMemberRead = await request(`/api/workspaces/${workspace.id}/knowledge`, { cookie: memberA.cookie });
    assert.equal(removedMemberRead.status, 403, JSON.stringify(removedMemberRead.body));
    console.log("PASS removed members immediately lose enterprise resource access");

    const deleteProduct = await request(`/api/workspaces/${workspace.id}/products/${productId}`, {
      method: "DELETE",
      cookie: owner.cookie,
    });
    assert.equal(deleteProduct.status, 200, JSON.stringify(deleteProduct.body));
    const deletedMapping = await client.query(
      "SELECT count(*)::int AS count FROM workspace_resources WHERE resource_type = 'product' AND resource_id = $1",
      [productId],
    );
    assert.equal(deletedMapping.rows[0].count, 0);
    const deletionAudit = await client.query(
      `SELECT count(*)::int AS count FROM workspace_audit_logs
       WHERE workspace_id = $1 AND action = 'workspace.product.deleted' AND target_id = $2`,
      [workspace.id, productId],
    );
    assert.equal(deletionAudit.rows[0].count, 1);
    console.log("PASS enterprise resource deletion removes ownership mapping and records an audit event");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
