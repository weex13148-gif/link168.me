import { AuthCard } from "@/components/AuthCard";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <AuthCard mode="login" returnTo={typeof params.next === "string" ? params.next : undefined} />;
}
