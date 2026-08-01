type OnboardingProfile = {
  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
  isPublic?: boolean | null;
} | null | undefined;

function hasUsableUsername(value: string | null | undefined) {
  const username = (value || "").trim().toLowerCase();
  return Boolean(username) && username !== "yourname" && !/^user-[a-z0-9]{6,}$/i.test(username) && !/^u_[a-z0-9]{8,}$/i.test(username);
}

export function isOnboardingProfileReady(profile: OnboardingProfile): boolean {
  return Boolean(profile && hasUsableUsername(profile.username) && (profile.displayName || "").trim());
}

export function resolveAuthenticatedDestination(profile: OnboardingProfile): "/console" | "/onboarding" {
  return isOnboardingProfileReady(profile) ? "/console" : "/onboarding";
}
