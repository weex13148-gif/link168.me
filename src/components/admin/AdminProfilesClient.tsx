"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmModal, type ConfirmModalDangerLevel } from "@/components/admin/ConfirmModal";

type AdminEnvelope<T> = {
  success?: unknown;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
};

type ProfileRow = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  isPublic: boolean;
  createdAt: string;
  linkCount: number;
};

type ProfilesData = {
  total?: number;
  page?: number;
  totalPages?: number;
  profiles?: ProfileRow[];
};

type ActionState = {
  loading: boolean;
  message: string;
  isError: boolean;
};

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminProfilesClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [visibility, setVisibility] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [action, setAction] = useState<ActionState>({ loading: false, message: "", isError: false });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    dangerLevel: ConfirmModalDangerLevel;
    onConfirm: () => void | Promise<void>;
    onConfirmWithReason?: (reason: string) => void | Promise<void>;
    impactList?: string[];
    irreversibleNotice?: string;
    requireReason?: boolean;
    reasonMinLength?: number;
    reasonPlaceholder?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (keyword.trim()) params.set("q", keyword.trim());
    if (visibility) params.set("visibility", visibility);

    try {
      const response = await fetch(`/api/jeepwork/profiles?${params.toString()}`, { cache: "no-store" });
      const result = (await response.json()) as AdminEnvelope<ProfilesData>;
      if (!response.ok || result.success !== true || !result.data) {
        setError(result.error?.message || "加载失败");
        setLoading(false);
        return;
      }
      setProfiles(result.data.profiles || []);
      setTotal(result.data.total || 0);
      setTotalPages(result.data.totalPages || 1);
      setLoading(false);
    } catch {
      setError("加载失败");
      setLoading(false);
    }
  }, [page, keyword, visibility]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  async function executeProfileAction(
    username: string,
    actionName: "hide-profile" | "restore-profile" | "disable-links" | "enable-links"
  ) {
    setAction({ loading: true, message: "", isError: false });
    try {
      const response = await fetch(`/api/jeepwork/profiles/${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const result = (await response.json()) as AdminEnvelope<{ message?: string }>;
      if (!response.ok || result.success !== true || !result.data) {
        setAction({ loading: false, message: result.error?.message || "操作失败", isError: true });
        return;
      }
      setAction({ loading: false, message: result.data.message || "操作成功", isError: false });
      await load();
    } catch {
      setAction({ loading: false, message: "操作失败", isError: true });
    }
  }

  function patchProfile(
    username: string,
    actionName: "hide-profile" | "restore-profile" | "disable-links" | "enable-links"
  ) {
    const actionLabel =
      actionName === "hide-profile"
        ? "隐藏主页"
        : actionName === "restore-profile"
        ? "恢复公开"
        : actionName === "disable-links"
        ? "下架全部链接"
        : "恢复全部链接";
    const isDanger = actionName === "hide-profile" || actionName === "disable-links";
    const description = `确定要对 @${username} 执行「${actionLabel}」操作吗？`;

    const modalConfig =
      actionName === "hide-profile"
        ? {
            title: "确认隐藏主页",
            impactList: ["该操作将立即下架该用户主页", "主页将不再对公开访问者可见"],
            reasonPlaceholder: "请说明隐藏该主页的具体原因，例如：经核查确认存在违规内容。",
          }
        : actionName === "disable-links"
        ? {
            title: "确认下架全部链接",
            impactList: ["该操作将立即下架该用户主页下的全部链接", "所有链接将不再可被访问"],
            reasonPlaceholder: "请说明下架全部链接的具体原因，例如：经核查发现链接存在违规内容。",
          }
        : actionName === "restore-profile"
        ? {
            title: "确认恢复公开",
            impactList: ["该主页将重新对公开访问者可见"],
          }
        : {
            title: "确认恢复全部链接",
            impactList: ["该用户主页下的全部链接将重新可被访问"],
          };

    const runAction = async () => {
      setConfirmModal((prev) => (prev ? { ...prev, open: false } : null));
      await executeProfileAction(username, actionName);
    };

    setConfirmModal({
      open: true,
      title: modalConfig.title,
      description,
      dangerLevel: isDanger ? "danger" : "warn",
      requireReason: isDanger,
      reasonMinLength: isDanger ? 10 : undefined,
      reasonPlaceholder: modalConfig.reasonPlaceholder,
      impactList: modalConfig.impactList,
      onConfirm: runAction,
      onConfirmWithReason: isDanger ? runAction : undefined,
    });
  }

  return (
    <div className="grid gap-6">
      {action.message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            action.isError ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#E6F0D8] text-[#355126]"
          }`}
        >
          {action.loading ? "处理中…" : action.message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div>
      ) : null}

      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">用户名 / 显示名 / 简介</span>
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[#2B241E]">可见性</span>
          <select
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm text-[#2B241E] outline-none"
          >
            <option value="">全部</option>
            <option value="public">仅公开主页</option>
            <option value="hidden">仅已隐藏主页</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          disabled={loading}
          className="min-h-11 rounded-2xl bg-[#6F8F4E] px-5 text-sm font-black text-white disabled:opacity-60"
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </section>

      <section className="grid gap-3 rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-2xl bg-[#FFF9E8] p-4">
          <p className="text-sm font-bold text-[#8C612E]">当前页数量</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{profiles.length}</p>
        </div>
        <div className="rounded-2xl bg-[#E6F0D8] p-4">
          <p className="text-sm font-bold text-[#355126]">总主页数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">{total}</p>
        </div>
        <div className="rounded-2xl bg-[#F2EDE3] p-4">
          <p className="text-sm font-bold text-[#7A6D5E]">当前页 / 总页数</p>
          <p className="mt-2 text-2xl font-black text-[#2B241E]">
            {page} / {totalPages}
          </p>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-[#E8DCCB] bg-white p-10 text-center text-sm font-bold text-[#7A6D5E] shadow-sm">
          正在加载主页列表…
        </div>
      ) : null}

      {!loading && profiles.length === 0 && !error ? (
        <div className="rounded-[28px] border border-dashed border-[#E8DCCB] bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-black text-[#2B241E]">暂无匹配的主页</p>
          <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">请修改筛选条件或刷新页面后重试。</p>
        </div>
      ) : null}

      <section className="grid gap-4">
        {profiles.map((profile) => (
          <article
            key={profile.id}
            className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {profile.isPublic ? (
                    <span className="rounded-2xl bg-[#E6F0D8] px-3 py-1 text-xs font-black text-[#355126]">公开</span>
                  ) : (
                    <span className="rounded-2xl bg-[#FFF1F0] px-3 py-1 text-xs font-black text-[#B42318]">已隐藏</span>
                  )}
                  <span className="rounded-2xl bg-[#F2EDE3] px-3 py-1 text-xs font-black text-[#7A6D5E]">
                    链接数：{profile.linkCount}
                  </span>
                </div>
                <p className="mt-3 truncate text-lg font-black text-[#2B241E]">
                  @{profile.username}
                  {profile.displayName ? ` · ${profile.displayName}` : ""}
                </p>
                {profile.bio ? <p className="mt-1 text-sm leading-6 text-[#6B5D4F]">{profile.bio}</p> : null}
                <p className="mt-2 text-xs leading-5 text-[#7A6D5E]">创建时间：{formatDate(profile.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/${encodeURIComponent(profile.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E]"
                >
                  查看主页
                </a>
                {profile.isPublic ? (
                  <button
                    type="button"
                    onClick={() => void patchProfile(profile.username, "hide-profile")}
                    disabled={action.loading}
                    className="min-h-11 rounded-2xl bg-[#B42318] px-4 text-sm font-black text-white disabled:opacity-60"
                  >
                    隐藏主页
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void patchProfile(profile.username, "restore-profile")}
                    disabled={action.loading}
                    className="min-h-11 rounded-2xl bg-[#6F8F4E] px-4 text-sm font-black text-white disabled:opacity-60"
                  >
                    恢复公开
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void patchProfile(profile.username, "disable-links")}
                  disabled={action.loading}
                  className="min-h-11 rounded-2xl border border-[#B42318] bg-white px-4 text-sm font-bold text-[#B42318] disabled:opacity-60"
                >
                  下架全部链接
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!loading && totalPages > 1 ? (
        <section className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || action.loading}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={page >= totalPages || action.loading}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
            className="min-h-11 rounded-2xl border border-[#E8DCCB] bg-white px-4 text-sm font-bold text-[#2B241E] disabled:opacity-60"
          >
            下一页
          </button>
        </section>
      ) : null}

      {confirmModal ? (
        <ConfirmModal
          isOpen={confirmModal.open}
          onClose={() => setConfirmModal((prev) => (prev ? { ...prev, open: false } : null))}
          onConfirm={confirmModal.onConfirm}
          onConfirmWithReason={confirmModal.onConfirmWithReason}
          title={confirmModal.title}
          description={confirmModal.description}
          dangerLevel={confirmModal.dangerLevel}
          loading={action.loading}
          requireReason={confirmModal.requireReason}
          reasonMinLength={confirmModal.reasonMinLength}
          reasonPlaceholder={confirmModal.reasonPlaceholder}
          impactList={confirmModal.impactList}
          irreversibleNotice={confirmModal.irreversibleNotice}
        />
      ) : null}
    </div>
  );
}
