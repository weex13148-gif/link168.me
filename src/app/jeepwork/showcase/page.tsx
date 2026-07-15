import { redirect } from "next/navigation";

export default function LegacyShowcaseAdminPage() {
  redirect("/jeepwork/competition-center?tab=files");
}
