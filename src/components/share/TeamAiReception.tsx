"use client";

import { useMemo, useState } from "react";
import { AiChatModule } from "@/components/share/modules/AiChatModule";
import { ContactEntryDialog, type PublicContactEntry } from "@/components/share/ContactEntryCard";

export function TeamAiReception({
  username,
  entries,
  publicBaseUrl,
}: {
  username: string;
  entries: PublicContactEntry[];
  publicBaseUrl?: string | null;
}) {
  const [activeEntry, setActiveEntry] = useState<PublicContactEntry | null>(null);
  const fallbackEntry = useMemo(() => entries[0] || null, [entries]);

  function openEntry(id?: string) {
    const entry = id ? entries.find((item) => item.id === id) : fallbackEntry;
    if (entry) setActiveEntry(entry);
  }

  if (!entries.length) return null;

  return (
    <section className="border-t border-gray-200 py-8">
      <h2 className="mb-2 text-lg font-bold text-gray-900">AI 接待</h2>
      <p className="mb-4 text-sm text-gray-500">AI 根据公开资料进行第一轮接待；需要人工确认时会展示团队联系卡。</p>
      <AiChatModule username={username} handoffContactEntryId={fallbackEntry?.id} onOpenContact={() => openEntry()} onOpenContactEntry={openEntry} />
      {activeEntry ? <ContactEntryDialog entry={activeEntry} publicBaseUrl={publicBaseUrl} onClose={() => setActiveEntry(null)} /> : null}
    </section>
  );
}
