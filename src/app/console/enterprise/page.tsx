import { redirect } from "next/navigation";
import ContactEntriesClient from "@/components/console/ContactEntriesClient";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { getCurrentUserFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export default async function EnterpriseConsolePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  return (
    <ConsoleShell
      eyebrow="团队协作"
      title="团队联系入口"
      subtitle="配置微信、企业微信联系入口，并在一个共享池中接住团队线索。"
    >
      <ContactEntriesClient />
    </ConsoleShell>
  );
}
