import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateWorkspaceCard,
  canManageWorkspaceCard,
  canPublishWorkspaceCard,
  canReadWorkspaceCard,
  canUpdateWorkspaceCard,
} from "./card-policy.ts";

test("owners and admins manage enterprise home and every member card", () => {
  assert.equal(canManageWorkspaceCard("owner"), true);
  assert.equal(canManageWorkspaceCard("admin"), true);
  assert.equal(canManageWorkspaceCard("member"), false);
  assert.equal(canManageWorkspaceCard("viewer"), false);

  assert.equal(canCreateWorkspaceCard("owner", "u1", "enterprise_home", null), true);
  assert.equal(canCreateWorkspaceCard("admin", "u1", "member_card", "u2"), true);
  assert.equal(canUpdateWorkspaceCard("admin", "u1", "member_card", "u2"), true);
});

test("members may create read and update only their own enterprise member card", () => {
  assert.equal(canCreateWorkspaceCard("member", "u1", "member_card", "u1"), true);
  assert.equal(canCreateWorkspaceCard("member", "u1", "member_card", "u2"), false);
  assert.equal(canCreateWorkspaceCard("member", "u1", "enterprise_home", null), false);
  assert.equal(canReadWorkspaceCard("member", "u1", "member_card", "u1"), true);
  assert.equal(canReadWorkspaceCard("member", "u1", "member_card", "u2"), false);
  assert.equal(canUpdateWorkspaceCard("member", "u1", "member_card", "u1"), true);
  assert.equal(canUpdateWorkspaceCard("member", "u1", "member_card", "u2"), false);
});

test("all active roles may read enterprise home but viewers cannot read member cards", () => {
  assert.equal(canReadWorkspaceCard("owner", "u1", "enterprise_home", null), true);
  assert.equal(canReadWorkspaceCard("admin", "u1", "enterprise_home", null), true);
  assert.equal(canReadWorkspaceCard("member", "u1", "enterprise_home", null), true);
  assert.equal(canReadWorkspaceCard("viewer", "u1", "enterprise_home", null), true);
  assert.equal(canReadWorkspaceCard("viewer", "u1", "member_card", "u1"), false);
  assert.equal(canReadWorkspaceCard(null, "u1", "enterprise_home", null), false);
});

test("only owners and admins may publish or unpublish enterprise cards", () => {
  assert.equal(canPublishWorkspaceCard("owner"), true);
  assert.equal(canPublishWorkspaceCard("admin"), true);
  assert.equal(canPublishWorkspaceCard("member"), false);
  assert.equal(canPublishWorkspaceCard("viewer"), false);
});
