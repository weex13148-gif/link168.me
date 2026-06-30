import { notFound } from "next/navigation";

// 旧 /admin 路由统一返回 404，真正的后台入口在 /jeepwork
export default function DeprecatedAdminSettingsApiPage() {
  notFound();
}
