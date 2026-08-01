import { redirect } from "next/navigation";

export const runtime = "nodejs";

// D10: /workbench 根页面统一跳转到 /console（普通用户管理首页）
// Workbench 子页面（/console/leads 等）保留可访问，不删除
export default function WorkbenchHomePage() {
  redirect("/console");
}
