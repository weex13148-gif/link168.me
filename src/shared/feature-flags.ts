import { DomainError } from "@/shared/domain-error";

export type RefactorFeatureFlags = {
  newDashboard: boolean;
  newProfileDomain: boolean;
  newMediaPipeline: boolean;
  newAiReception: boolean;
  newLeadPipeline: boolean;
  newBilling: boolean;
};

type FeatureFlagEnvironment = Record<string, string | undefined>;

const featureFlagMappings = [
  ["newDashboard", "LINK168_NEW_DASHBOARD"],
  ["newProfileDomain", "LINK168_NEW_PROFILE_DOMAIN"],
  ["newMediaPipeline", "LINK168_NEW_MEDIA_PIPELINE"],
  ["newAiReception", "LINK168_NEW_AI_RECEPTION"],
  ["newLeadPipeline", "LINK168_NEW_LEAD_PIPELINE"],
  ["newBilling", "LINK168_NEW_BILLING"],
] as const satisfies ReadonlyArray<
  readonly [keyof RefactorFeatureFlags, string]
>;

function parseFeatureFlag(
  envName: string,
  value: string | undefined,
): boolean {
  if (value === undefined) {
    return false;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  throw new DomainError("VALIDATION_ERROR", "INVALID_FEATURE_FLAG", {
    envName,
    value,
  });
}

export function getRefactorFeatureFlags(
  env: FeatureFlagEnvironment = process.env,
): RefactorFeatureFlags {
  const flags = {} as RefactorFeatureFlags;

  for (const [flagName, envName] of featureFlagMappings) {
    flags[flagName] = parseFeatureFlag(envName, env[envName]);
  }

  return flags;
}

export function assertSingleWriter(input: {
  label: string;
  legacyWriterEnabled: boolean;
  newWriterEnabled: boolean;
}): void {
  if (input.legacyWriterEnabled && input.newWriterEnabled) {
    throw new DomainError("CONFLICT", "MULTIPLE_WRITERS_ENABLED", {
      label: input.label,
    });
  }
}
