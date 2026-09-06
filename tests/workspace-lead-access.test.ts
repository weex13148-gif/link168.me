jest.mock("server-only", () => ({}));

const mockDb = {
  workspace: { findMany: jest.fn() },
  workspaceMember: { findMany: jest.fn() },
};

jest.mock("@/lib/db", () => ({ db: mockDb }));

import {
  canReadAllWorkspaceLeads,
  userLeadReadWhere,
  workspaceLeadReadWhere,
} from "@/lib/workspace-lead-access";

describe("Workspace Lead read access", () => {
  test.each(["owner", "admin"])("%s can read every Lead in the current Workspace", (role) => {
    expect(canReadAllWorkspaceLeads(role)).toBe(true);
    expect(workspaceLeadReadWhere({
      workspaceId: "workspace-1",
      userId: "user-1",
      role: role as "owner" | "admin",
    })).toEqual({ workspaceId: "workspace-1" });
  });

  test("Member can only read assigned Leads or Leads originating from their Member Page", () => {
    expect(canReadAllWorkspaceLeads("member")).toBe(false);
    expect(workspaceLeadReadWhere({
      workspaceId: "workspace-1",
      userId: "member-1",
      role: "member",
    })).toEqual({
      workspaceId: "workspace-1",
      OR: [
        { claimedByUserId: "member-1" },
        { profile: { userId: "member-1" } },
      ],
    });
  });

  test("Console and compatibility APIs resolve personal, manager, and Member scopes together", async () => {
    mockDb.workspace.findMany.mockResolvedValue([{ id: "owned-workspace" }]);
    mockDb.workspaceMember.findMany.mockResolvedValue([
      { workspaceId: "admin-workspace", role: "admin" },
      { workspaceId: "member-workspace", role: "member" },
    ]);

    await expect(userLeadReadWhere({ userId: "user-1", profileId: "profile-1" })).resolves.toEqual({
      OR: [
        { profileId: "profile-1", workspaceId: null },
        { workspaceId: { in: ["owned-workspace", "admin-workspace"] } },
        {
          workspaceId: { in: ["member-workspace"] },
          OR: [
            { claimedByUserId: "user-1" },
            { profileId: "profile-1" },
          ],
        },
      ],
    });
  });
});
