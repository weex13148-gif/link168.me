"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Globe2,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { ContactEntryCard, contactConnectUrl } from "@/components/share/ContactEntryCard";
import { contactChannelLabel, parseContactEntryPayload, type ContactChannel } from "@/lib/contact-entries";
import type { PublicHostStatus } from "@/lib/contact-entry-domain";

type ContactEntry = {
  id: string;
  profileId: string;
  workspaceId: string | null;
  title: string;
  description: string | null;
  targetUrl: string;
  payload: string | null;
  isActive: boolean;
  position: number;
};

type Workspace = {
  id: string;
  name: string;
  workspaceType: string;
  role: string;
  status: string;
  publicHost: string | null;
  publicHostStatus: PublicHostStatus;
};

type DomainInfo = {
  id: string;
  domain: string;
  domainType: "subdomain" | "custom";
  status: "pending" | "verified" | "failed" | "unbound";
  failureReason?: string;
  cnameTarget: string;
};

type TeamLead = {
  id: string;
  name: string;
  message: string | null;
  status: string;
  claimedByUserId: string | null;
  createdAt: string;
  contactEntry: { id: string; title: string; payload: string | null } | null;
};

type FormState = {
  channel: ContactChannel;
  title: string;
  description: string;
  targetUrl: string;
};

const EMPTY_FORM: FormState = {
  channel: "wechat",
  title: "",
  description: "",
  targetUrl: "",
};

const DOMAIN_STATUS: Record<PublicHostStatus, { label: string; className: string }> = {
  missing: { label: "未绑定域名", className: "bg-[#FFF0D4] text-[#8C612E]" },
  pending: { label: "等待验证", className: "bg-[#FFF0D4] text-[#8C612E]" },
  failed: { label: "验证失败", className: "bg-[#FFF1F0] text-[#B42318]" },
  verified: { label: "已验证可分享", className: "bg-[#E8F4DD] text-[#3F5F31]" },
};

function entryChannel(entry: ContactEntry): ContactChannel {
  return parseContactEntryPayload(entry.payload, entry.workspaceId)?.channel || "wechat";
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { hour12: false });
}

function isWorkspaceManager(workspace: Workspace | undefined) {
  return Boolean(workspace && workspace.status === "active" && ["owner", "admin"].includes(workspace.role));
}

function domainStatus(domain: DomainInfo | undefined, fallback: PublicHostStatus): PublicHostStatus {
  if (!domain || domain.status === "unbound") return fallback;
  return domain.status;
}

function toPublicBaseUrl(host: string | null) {
  return host ? `https://${host}` : null;
}

export default function ContactEntriesClient() {
  const [personalEntries, setPersonalEntries] = useState<ContactEntry[]>([]);
  const [teamEntries, setTeamEntries] = useState<ContactEntry[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [scope, setScope] = useState<"personal" | "team">("team");
  const [teamWorkspaceId, setTeamWorkspaceId] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainSaving, setDomainSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<ContactEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const leadRequestId = useRef(0);
  const domainRequestId = useRef(0);

  const teamWorkspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.status === "active"),
    [workspaces],
  );
  const selectedWorkspace = useMemo(
    () => teamWorkspaces.find((workspace) => workspace.id === teamWorkspaceId),
    [teamWorkspaces, teamWorkspaceId],
  );
  const canManageSelectedWorkspace = isWorkspaceManager(selectedWorkspace);
  const selectedTeamEntries = useMemo(
    () => teamEntries.filter((entry) => entry.workspaceId === teamWorkspaceId),
    [teamEntries, teamWorkspaceId],
  );
  const selectedTeamEntry = useMemo(
    () => selectedTeamEntries.find((entry) => entry.id === selectedEntryId) || null,
    [selectedEntryId, selectedTeamEntries],
  );
  const selectedDomain = useMemo(() => {
    if (!selectedWorkspace) return undefined;
    if (selectedWorkspace.publicHost) {
      return domains.find((domain) => domain.domain === selectedWorkspace.publicHost);
    }
    return domains.find((domain) => domain.status === "pending" || domain.status === "failed");
  }, [domains, selectedWorkspace]);
  const selectedDomainStatus = domainStatus(selectedDomain, selectedWorkspace?.publicHostStatus || "missing");
  const verifiedHost = selectedWorkspace?.publicHostStatus === "verified"
    ? selectedWorkspace.publicHost
    : null;

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/contact-entries", { cache: "no-store" });
      const result = await response.json() as {
        success?: boolean;
        error?: string;
        personalEntries?: ContactEntry[];
        teamEntries?: ContactEntry[];
        workspaces?: Workspace[];
      };
      if (!response.ok || !result.success) throw new Error(result.error || "联系入口加载失败。");
      const nextWorkspaces = (result.workspaces || []).filter((workspace) => workspace.status === "active");
      setPersonalEntries(result.personalEntries || []);
      setTeamEntries(result.teamEntries || []);
      setWorkspaces(nextWorkspaces);
      setTeamWorkspaceId((current) => current && nextWorkspaces.some((workspace) => workspace.id === current)
        ? current
        : nextWorkspaces.find((workspace) => isWorkspaceManager(workspace))?.id || nextWorkspaces[0]?.id || "");
      if (!nextWorkspaces.length) setScope("personal");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "联系入口加载失败。");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async (workspaceId: string) => {
    const requestId = ++leadRequestId.current;
    setTeamLeads([]);
    if (!workspaceId) {
      setLeadLoading(false);
      return;
    }
    setLeadLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/leads?assignment=unclaimed`, { cache: "no-store" });
      const result = await response.json() as { success?: boolean; error?: string; leads?: TeamLead[] };
      if (!response.ok || !result.success) throw new Error(result.error || "共享线索加载失败。");
      if (requestId === leadRequestId.current) setTeamLeads(result.leads || []);
    } catch (loadError) {
      if (requestId !== leadRequestId.current) return;
      setError(loadError instanceof Error ? loadError.message : "共享线索加载失败。");
    } finally {
      if (requestId === leadRequestId.current) setLeadLoading(false);
    }
  }, []);

  const loadDomains = useCallback(async (workspaceId: string) => {
    const requestId = ++domainRequestId.current;
    setDomains([]);
    if (!workspaceId || !canManageSelectedWorkspace) {
      setDomains([]);
      setDomainLoading(false);
      return;
    }
    setDomainLoading(true);
    try {
      const response = await fetch(`/api/dashboard/domains?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" });
      const result = await response.json() as { success?: boolean; error?: string; domains?: DomainInfo[] };
      if (!response.ok || !result.success) throw new Error(result.error || "域名状态加载失败。");
      if (requestId === domainRequestId.current) {
        setDomains((result.domains || []).filter((domain) => domain.domainType === "custom" && domain.status !== "unbound"));
      }
    } catch (loadError) {
      if (requestId !== domainRequestId.current) return;
      setDomains([]);
      setError(loadError instanceof Error ? loadError.message : "域名状态加载失败。");
    } finally {
      if (requestId === domainRequestId.current) setDomainLoading(false);
    }
  }, [canManageSelectedWorkspace]);

  useEffect(() => { void loadEntries(); }, [loadEntries]);
  useEffect(() => { void loadLeads(teamWorkspaceId); }, [loadLeads, teamWorkspaceId]);
  useEffect(() => { void loadDomains(teamWorkspaceId); }, [loadDomains, teamWorkspaceId]);
  useEffect(() => {
    setSelectedEntryId((current) => selectedTeamEntries.some((entry) => entry.id === current)
      ? current
      : selectedTeamEntries[0]?.id || "");
  }, [selectedTeamEntries]);

  function resetEditor(nextScope = scope) {
    setEditing(null);
    setForm(EMPTY_FORM);
    setScope(nextScope);
    setError("");
  }

  function startEdit(entry: ContactEntry) {
    const payload = parseContactEntryPayload(entry.payload, entry.workspaceId);
    if (!payload) {
      setError("该联系入口数据格式异常，无法编辑。");
      return;
    }
    if (entry.workspaceId) {
      setScope("team");
      setTeamWorkspaceId(entry.workspaceId);
      setSelectedEntryId(entry.id);
    } else {
      setScope("personal");
    }
    setEditing(entry);
    setForm({
      channel: payload.channel,
      title: entry.title,
      description: entry.description || "",
      targetUrl: payload.targetUrl,
    });
    setNotice("");
    setError("");
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const workspaceId = scope === "team" ? teamWorkspaceId : undefined;
    if (scope === "team" && (!workspaceId || !canManageSelectedWorkspace)) {
      setError("请选择一个你可以管理的团队工作空间。");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(editing ? `/api/contact-entries/${encodeURIComponent(editing.id)}` : "/api/contact-entries", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, workspaceId }),
      });
      const result = await response.json() as { success?: boolean; error?: string; entry?: ContactEntry };
      if (!response.ok || !result.success) throw new Error(result.error || "保存失败。");
      const saved = result.entry;
      if (saved?.workspaceId) {
        setTeamWorkspaceId(saved.workspaceId);
        setSelectedEntryId(saved.id);
      }
      setNotice(editing ? "联系入口已更新，预览已同步。" : "联系入口已创建，二维码会在域名验证后可分享。");
      setEditing(null);
      setForm(EMPTY_FORM);
      await loadEntries();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: ContactEntry) {
    if (!window.confirm(`确认删除“${entry.title}”吗？`)) return;
    setError("");
    try {
      const response = await fetch(`/api/contact-entries/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "删除失败。");
      if (editing?.id === entry.id) resetEditor(entry.workspaceId ? "team" : "personal");
      setSelectedEntryId((current) => current === entry.id ? "" : current);
      setNotice("联系入口已删除。");
      await loadEntries();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "删除失败。");
    }
  }

  async function claimLead(leadId: string) {
    if (!teamWorkspaceId) return;
    setError("");
    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(teamWorkspaceId)}/leads/${encodeURIComponent(leadId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || "领取失败。");
      setNotice("已领取线索，可在团队客户池继续跟进。");
      await loadLeads(teamWorkspaceId);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "领取失败。");
    }
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(successMessage);
    } catch {
      setError("复制失败，请手动复制。");
    }
  }

  async function bindDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamWorkspaceId || !domainInput.trim()) return;
    setDomainSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bind", workspaceId: teamWorkspaceId, domain: domainInput.trim() }),
      });
      const result = await response.json() as { success?: boolean; error?: string; message?: string };
      if (!response.ok || !result.success) throw new Error(result.error || result.message || "域名绑定失败。");
      setDomainInput("");
      setNotice("域名已绑定，请按提示配置 CNAME 后进行验证。");
      await Promise.all([loadDomains(teamWorkspaceId), loadEntries()]);
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : "域名绑定失败。");
    } finally {
      setDomainSaving(false);
    }
  }

  async function verifyDomain(domainId: string) {
    if (!teamWorkspaceId) return;
    setDomainSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", workspaceId: teamWorkspaceId, domainId }),
      });
      const result = await response.json() as { success?: boolean; failureReason?: string; message?: string };
      if (!response.ok || !result.success) throw new Error(result.failureReason || result.message || "域名验证暂未通过。");
      setNotice("域名 DNS 验证已通过，公开入口将在 HTTPS 就绪后可访问。");
      await Promise.all([loadDomains(teamWorkspaceId), loadEntries()]);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "域名验证失败。");
      await Promise.all([loadDomains(teamWorkspaceId), loadEntries()]);
    } finally {
      setDomainSaving(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-56 place-items-center rounded-[28px] border border-[#E8DCCB] bg-white"><div className="flex items-center gap-2 text-sm font-black text-[#3F5F31]"><Loader2 className="size-4 animate-spin" />正在加载联系入口</div></div>;
  }

  const personalPreview = editing?.workspaceId ? null : editing || personalEntries[0] || null;
  const selectedPreview = scope === "team" ? selectedTeamEntry : personalPreview;
  const selectedPreviewBaseUrl = scope === "team" ? toPublicBaseUrl(verifiedHost) : undefined;
  const selectedPreviewUrl = selectedPreview ? contactConnectUrl(selectedPreview.id, selectedPreviewBaseUrl) : null;
  const showTeamBoard = scope === "team" && Boolean(selectedWorkspace);

  return (
    <div className="grid gap-5">
      <section className="rounded-[28px] border border-[#DDE8CD] bg-gradient-to-br from-[#F7FBF2] via-white to-[#FFFDF8] p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#6F8F4E] text-white"><QrCode className="size-5" /></span>
            <div>
              <p className="text-sm font-black text-[#3F5F31]">微信 / 企业微信图形联系入口</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5C745F]">配置安全添加链接后，系统统一生成联系卡、二维码和受控跳转。团队访客会进入共享线索池。</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadEntries()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE8CD] bg-white px-3 text-xs font-black text-[#3F5F31]"><RefreshCw className="size-3.5" />刷新状态</button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2" role="tablist" aria-label="联系入口范围">
          <button type="button" role="tab" aria-selected={scope === "personal"} onClick={() => resetEditor("personal")} className={`rounded-2xl border p-3 text-left transition ${scope === "personal" ? "border-[#6F8F4E] bg-[#EEF4E7]" : "border-[#E8DCCB] bg-white"}`}><p className="text-sm font-black text-[#2B241E]">个人入口</p><p className="mt-1 text-xs text-[#7A6D5E]">限 1 个，用于个人经营名片。</p></button>
          <button type="button" role="tab" aria-selected={scope === "team"} disabled={!teamWorkspaces.length} onClick={() => resetEditor("team")} className={`rounded-2xl border p-3 text-left transition disabled:opacity-45 ${scope === "team" ? "border-[#6F8F4E] bg-[#EEF4E7]" : "border-[#E8DCCB] bg-white"}`}><p className="text-sm font-black text-[#2B241E]">团队入口</p><p className="mt-1 text-xs text-[#7A6D5E]">多个入口、统一预览、共享线索。</p></button>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-2xl border border-[#F0C7C2] bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{error}</div> : null}
      {notice ? <div className="flex items-center gap-2 rounded-2xl border border-[#CFE0BE] bg-[#F4FAEF] px-4 py-3 text-sm font-bold text-[#3F5F31]"><CheckCircle2 className="size-4" />{notice}</div> : null}

      {showTeamBoard ? <>
        <section className="rounded-[24px] border border-[#E8DCCB] bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div><p className="text-xs font-black text-[#3F5F31]">当前团队工作空间</p><p className="mt-1 text-sm text-[#7A6D5E]">切换团队后，配置、预览和共享线索会同时切换。</p></div>
          <select value={teamWorkspaceId} onChange={(event) => { setDomains([]); setTeamLeads([]); setTeamWorkspaceId(event.target.value); resetEditor("team"); }} className="mt-3 min-h-11 w-full rounded-xl border border-[#E8DCCB] bg-[#FFFDF8] px-3 text-sm font-black text-[#2B241E] sm:mt-0 sm:max-w-sm">{teamWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.role}</option>)}</select>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(300px,1fr)_minmax(0,0.88fr)]">
          <div className="grid gap-5">
            <EntryEditor scope="team" canSave={canManageSelectedWorkspace} personalExists={false} form={form} editing={editing} saving={saving} onChange={setForm} onSubmit={saveEntry} onCancel={() => resetEditor("team")} />
            <EntrySummaryList title="团队入口" entries={selectedTeamEntries} selectedEntryId={selectedEntryId} canManage={canManageSelectedWorkspace} onSelect={setSelectedEntryId} onEdit={startEdit} onDelete={removeEntry} />
          </div>

          <div className="grid gap-5 xl:sticky xl:top-5">
            <DomainPanel
              workspace={selectedWorkspace}
              domain={selectedDomain}
              status={selectedDomainStatus}
              loading={domainLoading}
              saving={domainSaving}
              canManage={canManageSelectedWorkspace}
              domainInput={domainInput}
              onDomainInput={setDomainInput}
              onBind={bindDomain}
              onVerify={verifyDomain}
              onCopy={(value, message) => void copyText(value, message)}
            />
            <section className="rounded-[28px] border border-[#DDE8CD] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#2B241E]">实时分享预览</p><p className="mt-1 text-xs leading-5 text-[#7A6D5E]">与公开团队页和 AI 转人工弹窗使用同一张联系卡。</p></div><QrCode className="size-5 text-[#6F8F4E]" /></div>
              {selectedPreview ? <>
                <ContactEntryCard entry={selectedPreview} publicBaseUrl={selectedPreviewBaseUrl} />
                {selectedPreviewUrl ? <button type="button" onClick={() => void copyText(selectedPreviewUrl, "团队分享链接已复制。")} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#CFE0BE] bg-[#F7FBF2] px-3 text-xs font-black text-[#3F5F31]"><Clipboard className="size-3.5" />复制分享链接</button> : null}
              </> : <div className="rounded-2xl border border-dashed border-[#D8C9B7] bg-[#FFFDF8] p-5 text-center text-sm leading-6 text-[#7A6D5E]">创建或选中一个团队入口后，在这里预览二维码和分享效果。</div>}
            </section>
          </div>

          <SharedLeads leads={teamLeads} loading={leadLoading} onClaim={claimLead} />
        </div>
      </> : <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,1fr)]">
        <div className="grid gap-5">
          <EntryEditor scope="personal" canSave={true} personalExists={personalEntries.length > 0} form={form} editing={editing} saving={saving} onChange={setForm} onSubmit={saveEntry} onCancel={() => resetEditor("personal")} />
          <EntrySummaryList title="个人联系入口" entries={personalEntries} selectedEntryId={personalPreview?.id || ""} canManage onSelect={() => undefined} onEdit={startEdit} onDelete={removeEntry} />
        </div>
        <section className="rounded-[28px] border border-[#DDE8CD] bg-white p-5 shadow-sm xl:sticky xl:top-5">
          <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#2B241E]">个人分享预览</p><p className="mt-1 text-xs leading-5 text-[#7A6D5E]">个人入口配置完成后可立即在公开名片中使用。</p></div><MessageCircle className="size-5 text-[#6F8F4E]" /></div>
          {personalPreview ? <ContactEntryCard entry={personalPreview} /> : <div className="rounded-2xl border border-dashed border-[#D8C9B7] bg-[#FFFDF8] p-5 text-center text-sm leading-6 text-[#7A6D5E]">创建一个微信或企业微信入口后，二维码会显示在这里。</div>}
        </section>
      </div>}
    </div>
  );
}

function EntryEditor({
  scope,
  canSave,
  personalExists,
  form,
  editing,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  scope: "personal" | "team";
  canSave: boolean;
  personalExists: boolean;
  form: FormState;
  editing: ContactEntry | null;
  saving: boolean;
  onChange: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const isPersonal = scope === "personal";
  const disabled = saving || !canSave || (isPersonal && personalExists && !editing);
  return <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#3F5F31]">{editing ? "编辑联系入口" : isPersonal ? "创建个人联系入口" : "创建团队联系入口"}</p><p className="mt-1 text-xs leading-5 text-[#7A6D5E]">{isPersonal ? "个人名片只保留一个入口。" : canSave ? "创建后会进入当前团队的共享线索池。" : "只有团队所有者和管理员可以修改入口。"}</p></div>{editing ? <button type="button" onClick={onCancel} className="text-xs font-black text-[#3F5F31]">取消编辑</button> : null}</div>
    <form onSubmit={onSubmit} className="grid gap-4">
      {isPersonal && personalExists && !editing ? <p className="rounded-xl bg-[#FFF8E8] px-3 py-2 text-xs font-bold text-[#8C612E]">你已配置个人入口；如需更换，请在下方编辑或删除后再添加。</p> : null}
      <div className="grid grid-cols-2 gap-2"><ChannelButton active={form.channel === "wechat"} label="微信" icon={<MessageCircle className="size-4" />} onClick={() => onChange((current) => ({ ...current, channel: "wechat" }))} /><ChannelButton active={form.channel === "wecom"} label="企业微信" icon={<Building2 className="size-4" />} onClick={() => onChange((current) => ({ ...current, channel: "wecom" }))} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5"><span className="text-xs font-black text-[#3F5F31]">入口名称</span><input required value={form.title} onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))} maxLength={60} placeholder={`例如：添加${contactChannelLabel(form.channel)}`} className="min-h-11 rounded-xl border border-[#E8DCCB] px-3 text-sm" /></label><label className="grid gap-1.5"><span className="text-xs font-black text-[#3F5F31]">添加链接</span><input required type="url" value={form.targetUrl} onChange={(event) => onChange((current) => ({ ...current, targetUrl: event.target.value }))} placeholder="https://work.weixin.qq.com/..." className="min-h-11 rounded-xl border border-[#E8DCCB] px-3 text-sm" /></label></div>
      <label className="grid gap-1.5"><span className="text-xs font-black text-[#3F5F31]">说明（选填）</span><input value={form.description} onChange={(event) => onChange((current) => ({ ...current, description: event.target.value }))} maxLength={200} placeholder="例如：工作日 9:00–18:00 在线回复" className="min-h-11 rounded-xl border border-[#E8DCCB] px-3 text-sm" /></label>
      <button type="submit" disabled={disabled} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] px-4 text-sm font-black text-white disabled:opacity-45">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{editing ? "保存并更新预览" : "生成图形联系入口"}</button>
    </form>
  </section>;
}

function ChannelButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-black transition ${active ? "border-[#6F8F4E] bg-[#EEF4E7] text-[#3F5F31]" : "border-[#E8DCCB] text-[#5C745F]"}`}>{icon}{label}</button>;
}

function EntrySummaryList({ title, entries, selectedEntryId, canManage, onSelect, onEdit, onDelete }: { title: string; entries: ContactEntry[]; selectedEntryId: string; canManage: boolean; onSelect: (id: string) => void; onEdit: (entry: ContactEntry) => void; onDelete: (entry: ContactEntry) => void }) {
  return <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#2B241E]">{title}</p><p className="mt-1 text-xs text-[#7A6D5E]">选择一个入口，即可在中间区域查看分享效果。</p></div><span className="rounded-full bg-[#F2E7D8] px-2.5 py-1 text-xs font-black text-[#7A6D5E]">{entries.length} 个</span></div>{entries.length ? <div className="mt-4 grid gap-2">{entries.map((entry) => <article key={entry.id} className={`rounded-2xl border p-3 transition ${entry.id === selectedEntryId ? "border-[#91AE70] bg-[#F4FAEF]" : "border-[#E8DCCB] bg-[#FFFDF8]"}`}><div className="flex items-start gap-2"><button type="button" onClick={() => onSelect(entry.id)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-black text-[#2B241E]">{entry.title}</p><p className="mt-1 text-xs font-bold text-[#5C745F]">{contactChannelLabel(entryChannel(entry))} · {entry.isActive ? "已发布" : "已隐藏"}</p></button>{canManage ? <div className="flex shrink-0 gap-1"><button type="button" onClick={() => onEdit(entry)} className="grid size-8 place-items-center rounded-lg border border-[#DDE8CD] text-[#3F5F31]" aria-label={`编辑${entry.title}`}><Pencil className="size-3.5" /></button><button type="button" onClick={() => onDelete(entry)} className="grid size-8 place-items-center rounded-lg border border-[#F0C7C2] text-[#B42318]" aria-label={`删除${entry.title}`}><Trash2 className="size-3.5" /></button></div> : null}</div></article>)}</div> : <p className="mt-4 rounded-2xl bg-[#FFFDF8] px-3 py-4 text-sm leading-6 text-[#7A6D5E]">暂未配置联系入口。创建后会在这里列出，可随时切换预览。</p>}</section>;
}

function DomainPanel({ workspace, domain, status, loading, saving, canManage, domainInput, onDomainInput, onBind, onVerify, onCopy }: { workspace: Workspace | undefined; domain: DomainInfo | undefined; status: PublicHostStatus; loading: boolean; saving: boolean; canManage: boolean; domainInput: string; onDomainInput: (value: string) => void; onBind: (event: FormEvent<HTMLFormElement>) => void; onVerify: (domainId: string) => void; onCopy: (value: string, message: string) => void }) {
  const meta = DOMAIN_STATUS[status];
  const verified = status === "verified";
  return <section className="rounded-[28px] border border-[#DDE8CD] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#EEF4E7] text-[#3F5F31]"><Globe2 className="size-4" /></span><div><p className="text-sm font-black text-[#2B241E]">团队公开域名</p><p className="mt-1 text-xs leading-5 text-[#7A6D5E]">团队二维码只能使用已验证域名，避免错误分享。</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${meta.className}`}>{meta.label}</span></div>{loading ? <p className="mt-4 flex items-center gap-2 text-sm text-[#7A6D5E]"><Loader2 className="size-4 animate-spin" />正在读取域名状态…</p> : verified ? <div className="mt-4 rounded-2xl border border-[#CFE0BE] bg-[#F7FBF2] p-3"><div className="flex items-center gap-2 text-sm font-black text-[#3F5F31]"><ShieldCheck className="size-4" />{domain?.domain || workspace?.publicHost}</div><div className="mt-3 grid grid-cols-2 gap-2"><a href={`https://${domain?.domain || workspace?.publicHost || ""}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#CFE0BE] bg-white text-xs font-black text-[#3F5F31]"><ExternalLink className="size-3.5" />打开站点</a><button type="button" onClick={() => onCopy(`https://${domain?.domain || workspace?.publicHost || ""}`, "团队域名已复制。")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#CFE0BE] bg-white text-xs font-black text-[#3F5F31]"><Clipboard className="size-3.5" />复制域名</button></div></div> : !canManage ? <p className="mt-4 rounded-2xl bg-[#FFF8E8] px-3 py-3 text-sm leading-6 text-[#8C612E]">请联系团队所有者或管理员绑定并验证域名；验证完成后，二维码和分享链接会自动可用。</p> : domain ? <div className="mt-4 grid gap-3"><div className="rounded-2xl bg-[#FFF8E8] p-3"><p className="text-xs font-black text-[#8C612E]">请为 {domain.domain} 配置 CNAME 记录</p><p className="mt-2 break-all rounded-xl bg-white px-3 py-2 font-mono text-xs text-[#5C745F]">{domain.cnameTarget}</p><button type="button" onClick={() => onCopy(domain.cnameTarget, "CNAME 目标已复制。")} className="mt-2 text-xs font-black text-[#3F5F31]">复制 CNAME 目标</button>{domain.failureReason ? <p className="mt-2 text-xs leading-5 text-[#B42318]">上次验证：{domain.failureReason}</p> : null}</div><button type="button" disabled={saving} onClick={() => onVerify(domain.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] px-4 text-sm font-black text-white disabled:opacity-45">{saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}重新验证域名</button></div> : <form onSubmit={onBind} className="mt-4 grid gap-3"><label className="grid gap-1.5"><span className="text-xs font-black text-[#3F5F31]">要绑定的团队域名</span><input required value={domainInput} onChange={(event) => onDomainInput(event.target.value)} placeholder="team.example.com" className="min-h-11 rounded-xl border border-[#E8DCCB] px-3 text-sm" /></label><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6F8F4E] px-4 text-sm font-black text-white disabled:opacity-45">{saving ? <Loader2 className="size-4 animate-spin" /> : <Globe2 className="size-4" />}绑定并获取 DNS 指引</button></form>}</section>;
}

function SharedLeads({ leads, loading, onClaim }: { leads: TeamLead[]; loading: boolean; onClaim: (leadId: string) => void }) {
  return <section className="rounded-[28px] border border-[#E8DCCB] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Users className="size-4 text-[#3F5F31]" /><p className="text-sm font-black text-[#2B241E]">待领取共享线索</p></div><p className="mt-1 text-xs leading-5 text-[#7A6D5E]">访客点击团队入口或 AI 转人工后，会出现在这里。</p></div><span className="rounded-full bg-[#F2E7D8] px-2.5 py-1 text-xs font-black text-[#7A6D5E]">{leads.length} 条</span></div>{loading ? <p className="mt-4 flex items-center gap-2 text-sm text-[#7A6D5E]"><Loader2 className="size-4 animate-spin" />正在加载…</p> : leads.length ? <div className="mt-4 grid gap-3">{leads.map((lead) => <article key={lead.id} className="rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] p-4"><p className="text-sm font-black text-[#2B241E]">{lead.contactEntry?.title || "团队联系入口"}</p><p className="mt-1 text-xs leading-5 text-[#7A6D5E]">{lead.message || "访客已进入联系入口。"}</p><p className="mt-2 text-[11px] text-[#9A8B7A]">{formatTime(lead.createdAt)}</p><button type="button" onClick={() => onClaim(lead.id)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#6F8F4E] px-3 text-xs font-black text-white">领取并跟进</button></article>)}</div> : <div className="mt-4 rounded-2xl bg-[#F7FBF2] px-3 py-4 text-sm leading-6 text-[#5C745F]">暂无待领取线索。团队入口发布并被访客访问后，这里会显示真实线索。</div>}</section>;
}
