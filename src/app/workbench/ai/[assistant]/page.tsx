import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ assistant: string }>;
};

export default async function LegacyAiAssistantPage({ params }: PageProps) {
  const { assistant } = await params;
  redirect(`/console/ai/${encodeURIComponent(assistant)}`);
}
