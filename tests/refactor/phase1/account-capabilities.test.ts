import { evaluateAccountCapabilities } from "@/domains/identity/account-capabilities";

function evaluate(overrides: Partial<Parameters<typeof evaluateAccountCapabilities>[0]> = {}) {
  return evaluateAccountCapabilities({
    accountStatus: "active",
    emailVerified: true,
    role: "user",
    restrictionTypes: [],
    ...overrides,
  });
}

describe("Phase 1 unified account capabilities", () => {
  test("active verified user can use ordinary product capabilities", () => {
    expect(evaluate()).toEqual({
      canLogin: true,
      canEnterDashboard: true,
      canModifySensitiveData: true,
      canPublishProfile: true,
      canExposePublicResources: true,
      canEnterJeepwork: false,
      blockedBy: null,
    });
  });

  test("unverified user may edit in dashboard but cannot publish or expose resources", () => {
    expect(evaluate({ emailVerified: false })).toEqual({
      canLogin: true,
      canEnterDashboard: true,
      canModifySensitiveData: false,
      canPublishProfile: false,
      canExposePublicResources: false,
      canEnterJeepwork: false,
      blockedBy: "EMAIL_UNVERIFIED",
    });
  });

  test("ADMIN_FREEZE preserves login and dashboard only", () => {
    expect(evaluate({ restrictionTypes: ["ADMIN_FREEZE"] })).toEqual({
      canLogin: true,
      canEnterDashboard: true,
      canModifySensitiveData: false,
      canPublishProfile: false,
      canExposePublicResources: false,
      canEnterJeepwork: false,
      blockedBy: "ADMIN_FREEZE",
    });
  });

  test.each(["BANNED", "SECURITY_RISK"])("%s blocks every capability", (restriction) => {
    expect(evaluate({ restrictionTypes: [restriction] })).toEqual({
      canLogin: false,
      canEnterDashboard: false,
      canModifySensitiveData: false,
      canPublishProfile: false,
      canExposePublicResources: false,
      canEnterJeepwork: false,
      blockedBy: restriction,
    });
  });

  test("inactive account wins over every other state", () => {
    expect(evaluate({
      accountStatus: "deactivated",
      emailVerified: false,
      role: "super_admin",
      restrictionTypes: ["ADMIN_FREEZE"],
    })).toEqual({
      canLogin: false,
      canEnterDashboard: false,
      canModifySensitiveData: false,
      canPublishProfile: false,
      canExposePublicResources: false,
      canEnterJeepwork: false,
      blockedBy: "ACCOUNT_INACTIVE",
    });
  });

  test("verified active super-admin may enter Jeepwork", () => {
    expect(evaluate({ role: "super_admin" }).canEnterJeepwork).toBe(true);
  });

  test("unverified super-admin cannot enter Jeepwork", () => {
    expect(evaluate({ role: "super_admin", emailVerified: false }).canEnterJeepwork).toBe(false);
  });

  test("unknown restrictions do not grant or remove capabilities", () => {
    expect(evaluate({ restrictionTypes: ["FUTURE_INFORMATIONAL_FLAG"] })).toEqual(evaluate());
  });

  test("returns immutable capability objects", () => {
    expect(Object.isFrozen(evaluate())).toBe(true);
  });
});
