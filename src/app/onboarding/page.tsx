import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) {
    redirect("/login?next=/onboarding");
  }
  return <OnboardingWizard />;
}
