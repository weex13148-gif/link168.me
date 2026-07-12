// Temporary CI trigger for corrected workspace validation; do not merge this comment.
import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKSPACE_INVITATION_TTL_MS,
  canGrantWorkspaceRole,
  canManageWorkspaceRole,
  getWorkspaceInvitationExpiry,
  hashWorkspaceInvitationToken,
  isWorkspaceInvitationExpired,
  normalizeWorkspaceInvitationEmail,
} from "./invitation-policy.ts";

test("workspace invitations expire exactly seven days after creation", () => {
  const createdAt = new Date("2026-07-12T00:00:00.000Z");
  const expiresAt = getWorkspaceInvitationExpiry(createdAt);
  assert.equal(expiresAt.toISOString(), "2026-07-19T00:00:00.000Z");
  assert.equal(expiresAt.getTime() - createdAt.getTime(), WORKSPACE_INVITATION_TTL_MS);
  assert.equal(isWorkspaceInvitationExpired(expiresAt, new Date("2026-07-18T23:59:59.999Z")), false);
  assert.equal(isWorkspaceInvitationExpired(expiresAt, new Date("2026-07-19T00:00:00.000Z")), true);
});

test("invitation emails are normalized and invalid values are rejected", () => {
  assert.equal(normalizeWorkspaceInvitationEmail("  Team.Member@Example.COM "), "team.member@example.com");
  assert.equal(normalizeWorkspaceInvitationEmail("not-an-email"), null);
  assert.equal(normalizeWorkspaceInvitationEmail(""), null);
});

test("invitation tokens are stored as hashes", () => {
  assert.equal(hashWorkspaceInvitationToken("example-token"), hashWorkspaceInvitationToken("example-token"));
  assert.notEqual(hashWorkspaceInvitationToken("example-token"), "example-token");
  assert.notEqual(hashWorkspaceInvitationToken("example-token"), hashWorkspaceInvitationToken("other-token"));
});

test("owners may invite admins while admins may invite only members or viewers", () => {
  assert.equal(canGrantWorkspaceRole("owner", "admin"), true);
  assert.equal(canGrantWorkspaceRole("owner", "member"), true);
  assert.equal(canGrantWorkspaceRole("owner", "viewer"), true);
  assert.equal(canGrantWorkspaceRole("owner", "owner"), false);

  assert.equal(canGrantWorkspaceRole("admin", "admin"), false);
  assert.equal(canGrantWorkspaceRole("admin", "member"), true);
  assert.equal(canGrantWorkspaceRole("admin", "viewer"), true);
  assert.equal(canGrantWorkspaceRole("member", "viewer"), false);
});

test("admins cannot manage other admins but owners can manage every non-owner role", () => {
  assert.equal(canManageWorkspaceRole("owner", "admin"), true);
  assert.equal(canManageWorkspaceRole("owner", "member"), true);
  assert.equal(canManageWorkspaceRole("owner", "viewer"), true);
  assert.equal(canManageWorkspaceRole("owner", "owner"), false);

  assert.equal(canManageWorkspaceRole("admin", "admin"), false);
  assert.equal(canManageWorkspaceRole("admin", "member"), true);
  assert.equal(canManageWorkspaceRole("admin", "viewer"), true);
  assert.equal(canManageWorkspaceRole("member", "viewer"), false);
});
