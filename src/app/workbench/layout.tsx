/**
 * Workbench 全局布局：强制登录检查
 * 未登录用户重定向到登录页
 */
import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";

export default async function WorkbenchLayout({
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
