import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const baseUrl = process.env.WORKSPACE_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "WorkspaceCustomer-2026!";
let ipCounter = 140;

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
  return { email, userId: result.body.user.id, cookie: result.cookie };
}

async function createWorkspace(owner, label) {
  const result = await request("/api/workspaces", {
    method: "POST",
    cookie: owner.cookie,
    body: JSON.stringify({
      name: `Customer Workspace ${label}`,
      slug: `customer-${label}-${crypto.randomBytes(3).toString("hex")}`,
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
    const owner = await register("customer-owner");
    const memberA = await register("customer-member-a");
    const memberB = await register("customer-member-b");
    const viewer = await register("customer-viewer");
    const outsider = await register("customer-outsider");

    const workspace = await createWorkspace(owner, "primary");
    const otherWorkspace = await createWorkspace(outsider, "other");
    const memberARecordId = await addActiveMember(client, workspace.id, owner.userId, memberA.userId, "member");
    await addActiveMember(client, workspace.id, owner.userId, memberB.userId, "member");
    await addActiveMember(client, workspace.id, owner.userId, viewer.userId, "viewer");

    const createCustomer = await request(`/api/workspaces/${workspace.id}/customers`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({
        name: "企业客户甲",
        email: "customer-a@example.com",
        phone: "13800138000",
        wechat: "customer_a",
        message: "需要企业版方案",
        sourceComponent: "contact_form",
        sourcePage: "enterprise-home",
        status: "new",
        assignedToUserId: memberA.userId,
      }),
    });
    assert.equal(createCustomer.status, 201, JSON.stringify(createCustomer.body));
    const customerId = createCustomer.body.customer.id;
    assert.equal(createCustomer.body.customer.workspaceId, workspace.id);
    assert.equal(createCustomer.body.customer.assignedToUserId, memberA.userId);
    console.log("PASS owner can create an enterprise customer assigned to an active member");

    const ownerList = await request(`/api/workspaces/${workspace.id}/customers`, { cookie: owner.cookie });
    assert.equal(ownerList.status, 200, JSON.stringify(ownerList.body));
    assert.equal(ownerList.body.customers.some((item) => item.id === customerId), true);

    const memberAList = await request(`/api/workspaces/${workspace.id}/customers`, { cookie: memberA.cookie });
    assert.equal(memberAList.status, 200, JSON.stringify(memberAList.body));
    assert.equal(memberAList.body.customers.some((item) => item.id === customerId), true);

    const memberBList = await request(`/api/workspaces/${workspace.id}/customers`, { cookie: memberB.cookie });
    assert.equal(memberBList.status, 200, JSON.stringify(memberBList.body));
    assert.equal(memberBList.body.customers.some((item) => item.id === customerId), false);

    const viewerList = await request(`/api/workspaces/${workspace.id}/customers`, { cookie: viewer.cookie });
    assert.equal(viewerList.status, 403, JSON.stringify(viewerList.body));
    assert.equal(viewerList.body.code, "WORKSPACE_CUSTOMER_PII_DENIED");
    console.log("PASS customer PII is visible only to managers and the assigned member");

    const memberUpdate = await request(`/api/workspaces/${workspace.id}/customers/${customerId}`, {
      method: "PATCH",
      cookie: memberA.cookie,
      body: JSON.stringify({ status: "contacted", note: "已电话联系客户。" }),
    });
    assert.equal(memberUpdate.status, 200, JSON.stringify(memberUpdate.body));
    assert.equal(memberUpdate.body.customer.status, "contacted");
    assert.equal(memberUpdate.body.customer.followUps.length, 1);

    const unauthorizedUpdate = await request(`/api/workspaces/${workspace.id}/customers/${customerId}`, {
      method: "PATCH",
      cookie: memberB.cookie,
      body: JSON.stringify({ status: "closed" }),
    });
    assert.equal(unauthorizedUpdate.status, 403, JSON.stringify(unauthorizedUpdate.body));
    assert.equal(unauthorizedUpdate.body.code, "WORKSPACE_CUSTOMER_NOT_ASSIGNED");
    console.log("PASS only the assigned member may update customer status and follow-up records");

    const createTask = await request(`/api/workspaces/${workspace.id}/customers/${customerId}/tasks`, {
      method: "POST",
      cookie: memberA.cookie,
      body: JSON.stringify({
        title: "发送企业版报价",
        description: "整理5席位企业版报价并发送。",
        priority: "high",
        assignedToUserId: memberA.userId,
      }),
    });
    assert.equal(createTask.status, 201, JSON.stringify(createTask.body));
    const taskId = createTask.body.task.id;

    const taskDenied = await request(`/api/workspaces/${workspace.id}/customers/${customerId}/tasks`, {
      method: "PATCH",
      cookie: memberB.cookie,
      body: JSON.stringify({ taskId, status: "completed" }),
    });
    assert.equal(taskDenied.status, 403, JSON.stringify(taskDenied.body));

    const taskProgress = await request(`/api/workspaces/${workspace.id}/customers/${customerId}/tasks`, {
      method: "PATCH",
      cookie: memberA.cookie,
      body: JSON.stringify({ taskId, status: "in_progress" }),
    });
    assert.equal(taskProgress.status, 200, JSON.stringify(taskProgress.body));
    assert.equal(taskProgress.body.task.status, "in_progress");
    console.log("PASS assigned members may create and update their own customer tasks");

    const reassign = await request(`/api/workspaces/${workspace.id}/customers/${customerId}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ assignedToUserId: memberB.userId, reassignOpenTasks: true, reason: "销售区域调整" }),
    });
    assert.equal(reassign.status, 200, JSON.stringify(reassign.body));
    assert.equal(reassign.body.customer.assignedToUserId, memberB.userId);
    assert.equal(reassign.body.customer.tasks.find((item) => item.id === taskId).assignedToUserId, memberB.userId);

    const formerAssigneeRead = await request(`/api/workspaces/${workspace.id}/customers/${customerId}`, {
      cookie: memberA.cookie,
    });
    assert.equal(formerAssigneeRead.status, 403, JSON.stringify(formerAssigneeRead.body));

    const newAssigneeRead = await request(`/api/workspaces/${workspace.id}/customers/${customerId}`, {
      cookie: memberB.cookie,
    });
    assert.equal(newAssigneeRead.status, 200, JSON.stringify(newAssigneeRead.body));
    console.log("PASS customer reassignment can move unfinished tasks and immediately changes visibility");

    const crossWorkspace = await request(`/api/workspaces/${otherWorkspace.id}/customers/${customerId}`, {
      cookie: outsider.cookie,
    });
    assert.equal(crossWorkspace.status, 404, JSON.stringify(crossWorkspace.body));
    console.log("PASS customers cannot be accessed through another workspaceId");

    const createSecondCustomer = await request(`/api/workspaces/${workspace.id}/customers`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ name: "企业客户乙", assignedToUserId: memberA.userId }),
    });
    assert.equal(createSecondCustomer.status, 201, JSON.stringify(createSecondCustomer.body));
    const secondCustomerId = createSecondCustomer.body.customer.id;

    const removeWithoutReassignment = await request(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ memberId: memberARecordId, action: "remove" }),
    });
    assert.equal(removeWithoutReassignment.status, 409, JSON.stringify(removeWithoutReassignment.body));
    assert.equal(removeWithoutReassignment.body.code, "WORKSPACE_REASSIGN_REQUIRED");

    const removeWithReassignment = await request(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({
        memberId: memberARecordId,
        action: "remove",
        reassignToUserId: memberB.userId,
        reason: "成员离职",
      }),
    });
    assert.equal(removeWithReassignment.status, 200, JSON.stringify(removeWithReassignment.body));

    const reassignedSecondCustomer = await request(`/api/workspaces/${workspace.id}/customers/${secondCustomerId}`, {
      cookie: memberB.cookie,
    });
    assert.equal(reassignedSecondCustomer.status, 200, JSON.stringify(reassignedSecondCustomer.body));
    assert.equal(reassignedSecondCustomer.body.customer.assignedToUserId, memberB.userId);

    const removedMemberRead = await request(`/api/workspaces/${workspace.id}/customers`, { cookie: memberA.cookie });
    assert.equal(removedMemberRead.status, 403, JSON.stringify(removedMemberRead.body));
    console.log("PASS member removal is blocked until unfinished customers and tasks are reassigned");

    const history = await client.query(
      `SELECT from_user_id, to_user_id, reason
       FROM workspace_customer_assignment_history
       WHERE workspace_id = $1 AND customer_id = $2
       ORDER BY created_at ASC`,
      [workspace.id, customerId],
    );
    assert.ok(history.rowCount >= 2);
    assert.equal(history.rows.at(-1).to_user_id, memberB.userId);

    const audit = await client.query(
      `SELECT action FROM workspace_audit_logs
       WHERE workspace_id = $1 AND target_type = 'workspace_customer'
       ORDER BY created_at ASC`,
      [workspace.id],
    );
    assert.ok(audit.rows.some((row) => row.action === "workspace.customer.created"));
    assert.ok(audit.rows.some((row) => row.action === "workspace.customer.reassigned"));
    console.log("PASS assignment history and enterprise audit records are preserved");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
