import { redirect } from "next/navigation";
import { resolveLegacyConsoleRoute } from "@/lib/legacy-console-routes";

export default async function DashboardCompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const query = await searchParams;
  redirect(resolveLegacyConsoleRoute("/dashboard", query.tab) || "/console/card");
}
