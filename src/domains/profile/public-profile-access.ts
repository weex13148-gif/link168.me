import { evaluateAccountCapabilities } from "@/domains/identity/account-capabilities";

export type PublicProfileAccessReason =
  | "ACCOUNT_INACTIVE"
  | "BANNED"
  | "SECURITY_RISK"
  | "ADMIN_FREEZE"
  | "EMAIL_UNVERIFIED"
  | "PROFILE_NOT_PUBLIC";

export type PublicProfileAccessInput = Readonly<{
  isPublic: boolean;
  accountStatus: string;
  emailVerified: boolean;
  role: string;
  restrictionTypes: readonly string[];
}>;

export type PublicProfileAccessDecision = Readonly<{
  allowed: boolean;
  reason: PublicProfileAccessReason | null;
}>;

export function evaluatePublicProfileAccess(
  input: PublicProfileAccessInput,
): PublicProfileAccessDecision {
  const capabilities = evaluateAccountCapabilities({
    accountStatus: input.accountStatus,
    emailVerified: input.emailVerified,
    role: input.role,
    restrictionTypes: input.restrictionTypes,
  });

  if (!capabilities.canExposePublicResources) {
    return Object.freeze({
      allowed: false,
      reason: (capabilities.blockedBy || "ACCOUNT_INACTIVE") as PublicProfileAccessReason,
    });
  }

  if (!input.isPublic) {
    return Object.freeze({ allowed: false, reason: "PROFILE_NOT_PUBLIC" });
  }

  return Object.freeze({ allowed: true, reason: null });
}
