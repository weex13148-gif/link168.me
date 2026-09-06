import { AuthCard } from "@/components/AuthCard";

type RegisterPageProps = {
  searchParams: Promise<{ handle?: string | string[]; next?: string | string[] }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle;

  return <AuthCard mode="register" initialHandle={handle || ""} returnTo={typeof params.next === "string" ? params.next : undefined} />;
}
