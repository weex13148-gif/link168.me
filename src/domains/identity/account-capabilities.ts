export type AccountCapabilityInput = Readonly<{
  accountStatus: string;
  emailVerified: boolean;
  role: string;
  restrictionTypes: readonly string[];
}>;

export type AccountCapabilities = Readonly<{
  canLogin: boolean;
  canEnterDashboard: boolean;
  canModifySensitiveData: boolean;
  canPublishProfile: boolean;
  canExposePublicResources: boolean;
  canEnterJeepwork: boolean;
  blockedBy: string | null;
}>;

const allBlocked = (blockedBy: string): AccountCapabilities => Object.freeze({
  canLogin: false,
  canEnterDashboard: false,
  canModifySensitiveData: false,
  canPublishProfile: false,
  canExposePublicResources: false,
  canEnterJeepwork: false,
  blockedBy,
});

const dashboardOnly = (blockedBy: string): AccountCapabilities => Object.freeze({
  canLogin: true,
  canEnterDashboard: true,
  canModifySensitiveData: false,
  canPublishProfile: false,
  canExposePublicResources: false,
  canEnterJeepwork: false,
  blockedBy,
});

export function evaluateAccountCapabilities(input: AccountCapabilityInput): AccountCapabilities {
  if (input.accountStatus !== "active") {
    return allBlocked("ACCOUNT_INACTIVE");
  }

  const restrictions = new Set(input.restrictionTypes);
  if (restrictions.has("BANNED")) {
    return allBlocked("BANNED");
  }
  if (restrictions.has("SECURITY_RISK")) {
    return allBlocked("SECURITY_RISK");
  }
  if (restrictions.has("ADMIN_FREEZE")) {
    return dashboardOnly("ADMIN_FREEZE");
  }
  if (!input.emailVerified) {
    return dashboardOnly("EMAIL_UNVERIFIED");
  }

  return Object.freeze({
    canLogin: true,
    canEnterDashboard: true,
    canModifySensitiveData: true,
    canPublishProfile: true,
    canExposePublicResources: true,
    canEnterJeepwork: input.role === "super_admin",
    blockedBy: null,
  });
}
