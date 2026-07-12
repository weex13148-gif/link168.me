import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import pg from "pg";

const { Client } = pg;
const baseUrl = process.env.WORKSPACE_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "WorkspaceCard-2026!";
let ipCounter = 180;

function nextIp() {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
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
  return { status: response.status, body, text, cookie: cookieFrom(response) };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next.js server did not become ready");
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
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return {
    email,
    userId: result.body.user.id,
    profileId: result.body.profile.id,
    username: result.body.profile.username,
    cookie: result.cookie,
  };
}

async function createWorkspace(owner, label) {
  const result = await request("/api/workspaces", {
    method: "POST",
    cookie: owner.cookie,
    body: JSON.stringify({
      name: `Card Workspace ${label}`,
      slug: `card-${label}-${crypto.randomBytes(3).toString("hex")}`,
      workspaceType: "enterprise",
    }),
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.workspace;
}

async function addActiveMember(client, workspaceId, ownerId, userId, role) {
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
    const owner = await register("card-owner");
    const memberA = await register("card-member-a");
    const memberB = await register("card-member-b");
    const viewer = await register("card-viewer");
    const outsider = await register("card-outsider");
    const workspace = await createWorkspace(owner, "primary");
    const otherWorkspace = await createWorkspace(outsider, "other");
    const memberARecordId = await addActiveMember(client, workspace.id, owner.userId, memberA.userId, "member");
    await addActiveMember(client, workspace.id, owner.userId, memberB.userId, "member");
    await addActiveMember(client, workspace.id, owner.userId, viewer.userId, "viewer");

    const personalBefore = await client.query(
      "SELECT id, username FROM profiles WHERE user_id = $1",
      [memberA.userId],
    );
    const personalLinksBefore = await client.query(
      "SELECT count(*)::int AS count FROM links WHERE profile_id = $1",
      [memberA.profileId],
    );

    const enterpriseHome = await request(`/api/workspaces/${workspace.id}/cards`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({
        cardType: "enterprise_home",
        displayName: "Link168测试企业",
        bio: "企业主页独立于个人Profile。",
        company: "Link168测试企业",
        contactVisibility: "public",
      }),
    });
    assert.equal(enterpriseHome.status, 201, JSON.stringify(enterpriseHome.body));
    assert.equal(enterpriseHome.body.card.cardType, "enterprise_home");
    assert.equal(enterpriseHome.body.card.status, "draft");
    const enterpriseHomeId = enterpriseHome.body.card.id;

    const duplicateHome = await request(`/api/workspaces/${workspace.id}/cards`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({ cardType: "enterprise_home", displayName: "重复企业主页" }),
    });
    assert.equal(duplicateHome.status, 409, JSON.stringify(duplicateHome.body));
    assert.equal(duplicateHome.body.code, "WORKSPACE_ENTERPRISE_HOME_EXISTS");
    console.log("PASS each Workspace has at most one enterprise home card");

    const ownMemberCard = await request(`/api/workspaces/${workspace.id}/cards`, {
      method: "POST",
      cookie: memberA.cookie,
      body: JSON.stringify({
        cardType: "member_card",
        memberUserId: memberA.userId,
        displayName: "成员甲企业名片",
        jobTitle: "销售顾问",
      }),
    });
    assert.equal(ownMemberCard.status, 201, JSON.stringify(ownMemberCard.body));
    const memberACardId = ownMemberCard.body.card.id;

    const createOtherDenied = await request(`/api/workspaces/${workspace.id}/cards`, {
      method: "POST",
      cookie: memberA.cookie,
      body: JSON.stringify({
        cardType: "member_card",
        memberUserId: memberB.userId,
        displayName: "越权创建",
      }),
    });
    assert.equal(createOtherDenied.status, 403, JSON.stringify(createOtherDenied.body));
    assert.equal(createOtherDenied.body.code, "WORKSPACE_CARD_CREATE_DENIED");

    const memberBCard = await request(`/api/workspaces/${workspace.id}/cards`, {
      method: "POST",
      cookie: owner.cookie,
      body: JSON.stringify({
        cardType: "member_card",
        memberUserId: memberB.userId,
        displayName: "成员乙企业名片",
      }),
    });
    assert.equal(memberBCard.status, 201, JSON.stringify(memberBCard.body));
    console.log("PASS members create only their own enterprise member card while managers create any card");

    const memberAList = await request(`/api/workspaces/${workspace.id}/cards`, { cookie: memberA.cookie });
    assert.equal(memberAList.status, 200, JSON.stringify(memberAList.body));
    assert.equal(memberAList.body.cards.some((card) => card.id === enterpriseHomeId), true);
    assert.equal(memberAList.body.cards.some((card) => card.id === memberACardId), true);
    assert.equal(memberAList.body.cards.some((card) => card.id === memberBCard.body.card.id), false);

    const viewerList = await request(`/api/workspaces/${workspace.id}/cards`, { cookie: viewer.cookie });
    assert.equal(viewerList.status, 200, JSON.stringify(viewerList.body));
    assert.deepEqual(viewerList.body.cards.map((card) => card.cardType), ["enterprise_home"]);
    console.log("PASS members see enterprise home plus their own card and viewers see enterprise home only");

    const memberUpdate = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}`, {
      method: "PATCH",
      cookie: memberA.cookie,
      body: JSON.stringify({ displayName: "成员甲更新名片", bio: "由成员本人维护" }),
    });
    assert.equal(memberUpdate.status, 200, JSON.stringify(memberUpdate.body));
    assert.equal(memberUpdate.body.card.displayName, "成员甲更新名片");

    const memberPublishDenied = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}`, {
      method: "PATCH",
      cookie: memberA.cookie,
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(memberPublishDenied.status, 403, JSON.stringify(memberPublishDenied.body));
    assert.equal(memberPublishDenied.body.code, "WORKSPACE_CARD_PUBLISH_DENIED");

    const managerPublish = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ status: "published" }),
    });
    assert.equal(managerPublish.status, 200, JSON.stringify(managerPublish.body));
    assert.equal(managerPublish.body.card.status, "published");
    assert.ok(managerPublish.body.card.publishedAt);
    console.log("PASS members edit their own card while only managers publish enterprise cards");

    const componentCreate = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}/components`, {
      method: "POST",
      cookie: memberA.cookie,
      body: JSON.stringify({
        type: "link",
        title: "企业产品资料",
        description: "企业名片专属组件",
        url: "https://example.com/product",
        position: 0,
      }),
    });
    assert.equal(componentCreate.status, 201, JSON.stringify(componentCreate.body));
    const componentId = componentCreate.body.component.id;

    const otherMemberCardDenied = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}`, {
      cookie: memberB.cookie,
    });
    assert.equal(otherMemberCardDenied.status, 403, JSON.stringify(otherMemberCardDenied.body));

    const componentUpdate = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}/components`, {
      method: "PATCH",
      cookie: memberA.cookie,
      body: JSON.stringify({ componentId, title: "更新后的企业资料" }),
    });
    assert.equal(componentUpdate.status, 200, JSON.stringify(componentUpdate.body));
    console.log("PASS enterprise card components follow the same Workspace and card ownership boundary");

    const crossWorkspace = await request(`/api/workspaces/${otherWorkspace.id}/cards/${memberACardId}`, {
      cookie: outsider.cookie,
    });
    assert.equal(crossWorkspace.status, 404, JSON.stringify(crossWorkspace.body));
    console.log("PASS enterprise cards cannot be accessed through another workspaceId");

    const removeMember = await request(`/api/workspaces/${workspace.id}/members`, {
      method: "PATCH",
      cookie: owner.cookie,
      body: JSON.stringify({ memberId: memberARecordId, action: "remove" }),
    });
    assert.equal(removeMember.status, 200, JSON.stringify(removeMember.body));

    const removedMemberRead = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}`, {
      cookie: memberA.cookie,
    });
    assert.equal(removedMemberRead.status, 403, JSON.stringify(removedMemberRead.body));

    const managerStillReads = await request(`/api/workspaces/${workspace.id}/cards/${memberACardId}`, {
      cookie: owner.cookie,
    });
    assert.equal(managerStillReads.status, 200, JSON.stringify(managerStillReads.body));
    assert.equal(managerStillReads.body.card.memberUserId, memberA.userId);
    console.log("PASS member removal revokes access but preserves the enterprise-owned member card");

    const personalAfter = await client.query(
      "SELECT id, username FROM profiles WHERE user_id = $1",
      [memberA.userId],
    );
    const personalLinksAfter = await client.query(
      "SELECT count(*)::int AS count FROM links WHERE profile_id = $1",
      [memberA.profileId],
    );
    assert.deepEqual(personalAfter.rows, personalBefore.rows);
    assert.equal(personalLinksAfter.rows[0].count, personalLinksBefore.rows[0].count);
    console.log("PASS enterprise cards and components do not mutate personal Profile or Link data");

    const audits = await client.query(
      `SELECT action FROM workspace_audit_logs
       WHERE workspace_id = $1 AND target_type IN ('workspace_card', 'workspace_card_component')`,
      [workspace.id],
    );
    assert.ok(audits.rows.some((row) => row.action === "workspace.card.created"));
    assert.ok(audits.rows.some((row) => row.action === "workspace.card.published"));
    assert.ok(audits.rows.some((row) => row.action === "workspace.card.component.created"));
    console.log("PASS enterprise card creation publication and component changes are audited");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
