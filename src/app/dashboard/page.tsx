"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Link2, Loader2, LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { ProfilePreview } from "@/components/ProfilePreview";
import type { Profile, ProfileLink } from "@/lib/link168-types";

type DashboardState = {
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  userId: string | null;
  profile: Profile | null;
  links: ProfileLink[];
};

type DashboardResponse = {
  success?: boolean;
  error?: string;
  user?: { id: string; email: string };
  profile?: Profile | null;
  links?: ProfileLink[];
};

type ProfileResponse = {
  success?: boolean;
  error?: string;
  profile?: Profile;
};

type LinkResponse = {
  success?: boolean;
  error?: string;
  link?: ProfileLink;
};

const initialState: DashboardState = {
  loading: true,
  saving: false,
  error: "",
  success: "",
  userId: null,
  profile: null,
  links: [],
};

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>(initialState);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActive, setEditActive] = useState(true);

  const activeLinks = useMemo(() => state.links.filter((link) => link.is_active), [state.links]);

  const loadDashboard = useCallback(async () => {
    try {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    const result = (await response.json()) as DashboardResponse;
    if (!response.ok || !result.success || !result.user) {
      setState({ ...initialState, loading: false, error: result.error || "读取后台数据失败。" });
      return;
    }

    const profile = result.profile || null;
    const links = result.links || [];
    setUsername(profile?.username || "");
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setState({
      loading: false,
      saving: false,
      error: "",
      success: "",
      userId: result.user.id,
      profile,
      links,
    });
    } catch {
      setState({ ...initialState, loading: false, error: "读取后台数据失败。" });
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername.length < 3) {
      setState((current) => ({ ...current, error: "用户名至少需要 3 个字符。", success: "" }));
      return;
    }

    setState((current) => ({ ...current, saving: true, error: "", success: "" }));

    const response = await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: normalizedUsername, displayName, bio }),
    });
    const result = (await response.json()) as ProfileResponse;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success || !result.profile) {
      setState((current) => ({ ...current, saving: false, error: result.error || "资料保存失败。", success: "" }));
      return;
    }

    setUsername(result.profile.username);
    setDisplayName(result.profile.display_name || "");
    setBio(result.profile.bio || "");
    setState((current) => ({
      ...current,
      saving: false,
      profile: result.profile || null,
      error: "",
      success: "资料已保存。",
    }));
  }

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!state.profile) {
      setState((current) => ({ ...current, error: "请先保存用户名，再添加链接。", success: "" }));
      return;
    }

    const title = newTitle.trim();
    const url = normalizeUrl(newUrl);
    if (!title || !url) {
      setState((current) => ({ ...current, error: "链接标题和 URL 都不能为空。", success: "" }));
      return;
    }

    setState((current) => ({ ...current, saving: true, error: "", success: "" }));

    const response = await fetch("/api/dashboard/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, description: newDescription }),
    });
    const result = (await response.json()) as LinkResponse;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success || !result.link) {
      setState((current) => ({ ...current, saving: false, error: result.error || "链接添加失败。", success: "" }));
      return;
    }

    setNewTitle("");
    setNewUrl("");
    setNewDescription("");
    setState((current) => ({
      ...current,
      saving: false,
      links: [...current.links, result.link as ProfileLink].sort((a, b) => a.position - b.position),
      success: "链接已添加。",
    }));
  }

  function startEdit(link: ProfileLink) {
    setEditingId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.url);
    setEditDescription(link.description || "");
    setEditActive(link.is_active);
    setState((current) => ({ ...current, error: "", success: "" }));
  }

  async function updateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    const title = editTitle.trim();
    const url = normalizeUrl(editUrl);
    if (!title || !url) {
      setState((current) => ({ ...current, error: "链接标题和 URL 都不能为空。", success: "" }));
      return;
    }

    setState((current) => ({ ...current, saving: true, error: "", success: "" }));

    const response = await fetch(`/api/dashboard/links/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, description: editDescription, isActive: editActive }),
    });
    const result = (await response.json()) as LinkResponse;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success || !result.link) {
      setState((current) => ({ ...current, saving: false, error: result.error || "链接更新失败。", success: "" }));
      return;
    }

    setEditingId(null);
    setState((current) => ({
      ...current,
      saving: false,
      links: current.links.map((link) => (link.id === result.link?.id ? result.link : link)).sort((a, b) => a.position - b.position),
      success: "链接已更新。",
    }));
  }

  async function deleteLink(linkId: string) {
    setState((current) => ({ ...current, saving: true, error: "", success: "" }));

    const response = await fetch(`/api/dashboard/links/${linkId}`, { method: "DELETE" });
    const result = (await response.json()) as { success?: boolean; error?: string };

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success) {
      setState((current) => ({ ...current, saving: false, error: result.error || "链接删除失败。", success: "" }));
      return;
    }

    setState((current) => ({
      ...current,
      saving: false,
      links: current.links.filter((link) => link.id !== linkId),
      success: "链接已删除。",
    }));
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (state.loading) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="flex items-center gap-3 rounded-lg bg-white px-5 py-4 text-sm font-bold text-[#4A4A4A] shadow-sm">
          <Loader2 aria-hidden className="size-5 animate-spin text-[#5B6FFF]" />
          正在读取数据...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8">
      <section>
        <header className="flex items-center justify-between">
          <LogoMark />
          <button onClick={signOut} className="grid size-10 place-items-center rounded-lg bg-white text-[#4A4A4A] shadow-sm">
            <LogOut aria-label="退出登录" className="size-5" />
          </button>
        </header>

        <div className="mt-7">
          <p className="text-sm font-bold text-[#5B6FFF]">用户后台</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">管理你的 Link1688 主页</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#4A4A4A]">
            保存资料后生成公开主页；添加、编辑和删除链接会写入 PostgreSQL。
          </p>
        </div>

        {state.error ? <p className="mt-5 rounded-lg border border-[#FF4D4F]/20 bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#FF4D4F]">{state.error}</p> : null}
        {state.success ? <p className="mt-5 rounded-lg border border-[#52C41A]/20 bg-[#F6FFED] px-4 py-3 text-sm font-bold text-[#237804]">{state.success}</p> : null}

        <div className="mt-7 grid gap-4">
          <section className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">公开地址</h2>
                <p className="mt-1 text-sm text-[#8C8C8C]">
                  {state.profile ? `link168.me/${state.profile.username}` : "保存资料后生成公开地址"}
                </p>
              </div>
              {state.profile ? (
                <Link href={`/${state.profile.username}`} className="grid size-10 place-items-center rounded-lg bg-[#5B6FFF] text-white">
                  <Eye aria-label="查看公开主页" className="size-5" />
                </Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">个人资料</h2>
            <form onSubmit={saveProfile} className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[#4A4A4A]">昵称</span>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-3 outline-none focus:border-[#5B6FFF]"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="例如：阿宝"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-[#4A4A4A]">用户名</span>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-3 outline-none focus:border-[#5B6FFF]"
                    value={username}
                    onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                    placeholder="yourname"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-bold text-[#4A4A4A]">简介</span>
                <textarea
                  className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-3 outline-none focus:border-[#5B6FFF]"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="一句话介绍你自己"
                />
              </label>
              <button
                type="submit"
                disabled={state.saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#5B6FFF] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
              >
                {state.saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                保存资料
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">链接</h2>
                <p className="mt-1 text-sm text-[#8C8C8C]">
                  当前 {state.links.length} 个链接，公开显示 {activeLinks.length} 个。
                </p>
              </div>
              <button
                type="submit"
                form="new-link-form"
                disabled={state.saving}
                className="grid size-10 place-items-center rounded-lg bg-[#FF6B35] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus aria-label="添加链接" className="size-5" />
              </button>
            </div>

            <form id="new-link-form" onSubmit={addLink} className="mt-4 grid gap-3 rounded-lg bg-[#F5F7FA] p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-[#4A4A4A]">标题</span>
                  <input
                    required
                    className="mt-2 h-11 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 outline-none focus:border-[#5B6FFF]"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="例如：预约咨询"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-[#4A4A4A]">URL</span>
                  <input
                    required
                    className="mt-2 h-11 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 outline-none focus:border-[#5B6FFF]"
                    value={newUrl}
                    onChange={(event) => setNewUrl(event.target.value)}
                    placeholder="https://example.com"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-bold text-[#4A4A4A]">描述</span>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 outline-none focus:border-[#5B6FFF]"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="可选：补充说明"
                />
              </label>
            </form>

            <div className="mt-4 space-y-3">
              {state.links.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E0E0E0] bg-[#F5F7FA] px-4 py-8 text-center">
                  <p className="text-sm font-black text-[#1A1A1A]">还没有链接</p>
                  <p className="mt-1 text-sm text-[#8C8C8C]">保存资料后，填写上方表单添加第一个链接。</p>
                </div>
              ) : null}

              {state.links.map((item) =>
                editingId === item.id ? (
                  <form key={item.id} onSubmit={updateLink} className="grid gap-3 rounded-lg border border-[#5B6FFF]/30 bg-[#F5F7FA] p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        required
                        className="h-11 rounded-lg border border-[#E0E0E0] bg-white px-3 outline-none focus:border-[#5B6FFF]"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        placeholder="链接标题"
                      />
                      <input
                        required
                        className="h-11 rounded-lg border border-[#E0E0E0] bg-white px-3 outline-none focus:border-[#5B6FFF]"
                        value={editUrl}
                        onChange={(event) => setEditUrl(event.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                    <input
                      className="h-11 rounded-lg border border-[#E0E0E0] bg-white px-3 outline-none focus:border-[#5B6FFF]"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="可选描述"
                    />
                    <label className="flex items-center gap-2 text-sm font-bold text-[#4A4A4A]">
                      <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} />
                      公开显示
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={state.saving}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#5B6FFF] px-4 text-sm font-black text-white disabled:opacity-60"
                      >
                        <Save aria-hidden className="size-4" />
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-[#4A4A4A]"
                      >
                        <X aria-hidden className="size-4" />
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  <div key={item.id} className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-2">
                    <span className="flex min-w-0 items-center gap-3 text-sm">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white">
                        <Link2 aria-hidden className="size-5 text-[#5B6FFF]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-black">{item.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-[#8C8C8C]">{item.url}</span>
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(item)} className="grid size-9 place-items-center rounded-lg bg-white text-[#4A4A4A]">
                        <Pencil aria-label={`编辑 ${item.title}`} className="size-4" />
                      </button>
                      <button
                        onClick={() => void deleteLink(item.id)}
                        disabled={state.saving}
                        className="grid size-9 place-items-center rounded-lg bg-white text-[#FF4D4F] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 aria-label={`删除 ${item.title}`} className="size-4" />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>
      </section>

      <aside className="lg:sticky lg:top-5 lg:h-fit">
        <ProfilePreview
          username={state.profile?.username || username}
          displayName={state.profile?.display_name || displayName}
          bio={state.profile?.bio || bio}
          avatarUrl={state.profile?.avatar_url}
          links={state.links.map((item) => ({
            id: item.id,
            label: item.title,
            caption: item.description,
            href: item.url,
            isActive: item.is_active,
          }))}
        />
      </aside>
    </main>
  );
}
