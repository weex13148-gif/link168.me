import assert from "node:assert/strict";
import test from "node:test";
import {
  canCreateWorkspaceCustomerTask,
  canManageWorkspaceCustomer,
  canReadWorkspaceCustomer,
  canReassignWorkspaceCustomer,
  canUpdateWorkspaceCustomer,
  canUpdateWorkspaceCustomerTask,
} from "./customer-policy.ts";

test("owners and admins may manage and reassign all enterprise customers", () => {
  assert.equal(canManageWorkspaceCustomer("owner"), true);
  assert.equal(canManageWorkspaceCustomer("admin"), true);
  assert.equal(canReassignWorkspaceCustomer("owner"), true);
  assert.equal(canReassignWorkspaceCustomer("admin"), true);
  assert.equal(canManageWorkspaceCustomer("member"), false);
  assert.equal(canReassignWorkspaceCustomer("member"), false);
  assert.equal(canManageWorkspaceCustomer("viewer"), false);
});

test("members may read and update only customers assigned to themselves", () => {
  assert.equal(canReadWorkspaceCustomer("member", "u1", "u1"), true);
  assert.equal(canUpdateWorkspaceCustomer("member", "u1", "u1"), true);
  assert.equal(canReadWorkspaceCustomer("member", "u1", "u2"), false);
  assert.equal(canUpdateWorkspaceCustomer("member", "u1", "u2"), false);
  assert.equal(canReadWorkspaceCustomer("member", "u1", null), false);
});

test("viewers cannot read customer PII or modify enterprise customers", () => {
  assert.equal(canReadWorkspaceCustomer("viewer", "u1", "u1"), false);
  assert.equal(canUpdateWorkspaceCustomer("viewer", "u1", "u1"), false);
  assert.equal(canCreateWorkspaceCustomerTask("viewer", "u1", "u1"), false);
});

test("assigned members may create and update their own customer tasks", () => {
  assert.equal(canCreateWorkspaceCustomerTask("member", "u1", "u1"), true);
  assert.equal(canCreateWorkspaceCustomerTask("member", "u1", "u2"), false);
  assert.equal(canUpdateWorkspaceCustomerTask("member", "u1", "u1"), true);
  assert.equal(canUpdateWorkspaceCustomerTask("member", "u1", "u2"), false);
  assert.equal(canUpdateWorkspaceCustomerTask("admin", "u1", "u2"), true);
  assert.equal(canUpdateWorkspaceCustomerTask("owner", "u1", null), true);
});
