"use client";

import { useCallback, useMemo, useState } from "react";
import type { DashboardLink, LinkDraft, SaveState } from "@/components/dashboard-v1/types";
import { createLinkRequest, deleteLinkRequest, reorderLinksRequest, updateLinkRequest } from "@/components/dashboard-v1/dashboard-api";

function draftFromLink(link: DashboardLink): LinkDraft {
  return {
    title: link.title,
    url: link.url,
    description: link.description || "",
    iconType: link.icon_type || "default",
    iconValue: link.icon_value || "",
    iconUrl: link.icon_url || "",
    componentType: (link.type || "link") as LinkDraft["componentType"],
    payloadJson: link.payload_json || "",
  };
}

export function useDashboardLinks({
  initialLinks,
  profileReady,
  setGlobalSaveState,
  showToast,
  onNeedProfile,
  onUpgrade,
}: {
  initialLinks: DashboardLink[];
  profileReady: boolean;
  setGlobalSaveState: (state: SaveState) => void;
  showToast: (message: string, tone?: "success" | "error") => void;
  onNeedProfile: () => void;
  onUpgrade: () => void;
}) {
  const [links, setLinks] = useState<DashboardLink[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState("");
  const sortedLinks = useMemo(() => [...links].sort((a, b) => a.position - b.position), [links]);

  const replaceLinks = useCallback((next: DashboardLink[]) => {
    setLinks([...next].sort((a, b) => a.position - b.position));
  }, []);

  const createLink = useCallback(async (draft: LinkDraft) => {
    if (!profileReady) {
      showToast("请先完成名片资料和公开地址。", "error");
      onNeedProfile();
      return false;
    }
    setCreating(true);
    setGlobalSaveState("saving");
    try {
      const result = await createLinkRequest(draft);
      if (!result.ok) {
        setGlobalSaveState("error");
        if (result.upgradeRequired) onUpgrade();
        showToast(result.error, "error");
        return false;
      }
      setLinks((current) => [...current, result.data].sort((a, b) => a.position - b.position));
      setGlobalSaveState("saved");
      showToast("内容已保存并公开。");
      return true;
    } catch {
      setGlobalSaveState("error");
      showToast("内容创建失败，请稍后重试。", "error");
      return false;
    } finally {
      setCreating(false);
    }
  }, [onNeedProfile, onUpgrade, profileReady, setGlobalSaveState, showToast]);

  const updateLink = useCallback(async (link: DashboardLink, draft: LinkDraft) => {
    setBusyLinkId(link.id);
    setGlobalSaveState("saving");
    try {
      const result = await updateLinkRequest(link, draft);
      if (!result.ok) {
        setGlobalSaveState("error");
        showToast(result.error, "error");
        return false;
      }
      setLinks((current) => current.map((item) => item.id === link.id ? result.data : item));
      setGlobalSaveState("saved");
      showToast("内容修改已保存。");
      return true;
    } catch {
      setGlobalSaveState("error");
      showToast("内容保存失败，请稍后重试。", "error");
      return false;
    } finally {
      setBusyLinkId("");
    }
  }, [setGlobalSaveState, showToast]);

  const toggleLink = useCallback(async (link: DashboardLink) => {
    setBusyLinkId(link.id);
    setGlobalSaveState("saving");
    try {
      const result = await updateLinkRequest(link, draftFromLink(link), !link.is_active);
      if (!result.ok) {
        setGlobalSaveState("error");
        showToast(result.error, "error");
        return;
      }
      setLinks((current) => current.map((item) => item.id === link.id ? result.data : item));
      setGlobalSaveState("saved");
      showToast(result.data.is_active ? "内容已公开。" : "内容已隐藏。");
    } catch {
      setGlobalSaveState("error");
      showToast("内容状态更新失败。", "error");
    } finally {
      setBusyLinkId("");
    }
  }, [setGlobalSaveState, showToast]);

  const deleteLink = useCallback(async (link: DashboardLink) => {
    if (!window.confirm(`确定删除“${link.title}”吗？`)) return;
    setBusyLinkId(link.id);
    try {
      const result = await deleteLinkRequest(link.id);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setLinks((current) => current.filter((item) => item.id !== link.id));
      showToast("内容已删除。");
    } catch {
      showToast("内容删除失败，请稍后重试。", "error");
    } finally {
      setBusyLinkId("");
    }
  }, [showToast]);

  const moveLink = useCallback(async (linkId: string, direction: "up" | "down") => {
    const current = [...links].sort((a, b) => a.position - b.position);
    const index = current.findIndex((item) => item.id === linkId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= current.length) return;

    const previous = links;
    [current[index], current[target]] = [current[target], current[index]];
    const optimistic = current.map((item, position) => ({ ...item, position }));
    setLinks(optimistic);
    setBusyLinkId(linkId);
    setGlobalSaveState("saving");
    try {
      const result = await reorderLinksRequest(optimistic.map((item) => item.id));
      if (!result.ok) {
        setLinks(previous);
        setGlobalSaveState("error");
        showToast(result.error, "error");
        return;
      }
      setGlobalSaveState("saved");
      showToast("顺序已保存。");
    } catch {
      setLinks(previous);
      setGlobalSaveState("error");
      showToast("排序保存失败。", "error");
    } finally {
      setBusyLinkId("");
    }
  }, [links, setGlobalSaveState, showToast]);

  return { links, sortedLinks, replaceLinks, creating, busyLinkId, createLink, updateLink, toggleLink, deleteLink, moveLink };
}
