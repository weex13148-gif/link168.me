import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserFromCookies();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
