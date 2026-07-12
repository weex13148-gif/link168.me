"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function AcceptWorkspaceInvitationButton({ token, disabled }: { token: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acceptInvitation() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace-invitations/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "邀请接受失败。");
        return;
      }
      router.replace(data.redirectTo || "/console/account/enterprise");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      {error ? (
        <p className="mb-3 rounded-2xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void acceptInvitation()}
        disabled={disabled || loading}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--ui-success)] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        接受企业邀请
      </button>
    </div>
  );
}
