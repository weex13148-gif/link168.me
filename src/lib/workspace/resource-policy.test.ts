import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageWorkspaceResource,
  canReadWorkspaceResource,
  canViewWorkspaceResourceAssignment,
  isWorkspaceResourceType,
} from "./resource-policy.ts";

test("only approved V2 workspace resource types are accepted", () => {
  assert.equal(isWorkspaceResourceType("product"), true);
  assert.equal(isWorkspaceResourceType("knowledge_doc"), true);
  assert.equal(isWorkspaceResourceType("profile"), false);
  assert.equal(isWorkspaceResourceType("ai_credit_account"), false);
});

test("all active workspace roles may read resources", () => {
  assert.equal(canReadWorkspaceResource("owner"), true);
  assert.equal(canReadWorkspaceResource("admin"), true);
  assert.equal(canReadWorkspaceResource("member"), true);
  assert.equal(canReadWorkspaceResource("viewer"), true);
  assert.equal(canReadWorkspaceResource(null), false);
});

test("only owners and admins may create update assign or delete enterprise resources", () => {
  assert.equal(canManageWorkspaceResource("owner"), true);
  assert.equal(canManageWorkspaceResource("admin"), true);
  assert.equal(canManageWorkspaceResource("member"), false);
  assert.equal(canManageWorkspaceResource("viewer"), false);
  assert.equal(canManageWorkspaceResource(null), false);
});

test("members and viewers see shared resources or resources assigned to themselves", () => {
  assert.equal(canViewWorkspaceResourceAssignment("owner", "u1", "u2"), true);
  assert.equal(canViewWorkspaceResourceAssignment("admin", "u1", "u2"), true);
  assert.equal(canViewWorkspaceResourceAssignment("member", "u1", null), true);
  assert.equal(canViewWorkspaceResourceAssignment("member", "u1", "u1"), true);
  assert.equal(canViewWorkspaceResourceAssignment("member", "u1", "u2"), false);
  assert.equal(canViewWorkspaceResourceAssignment("viewer", "u1", null), true);
  assert.equal(canViewWorkspaceResourceAssignment("viewer", "u1", "u1"), true);
  assert.equal(canViewWorkspaceResourceAssignment("viewer", "u1", "u2"), false);
});
