"use client";

import { Lock, Unlock, Users, Globe, Wrench, Archive, ArrowLeft, RefreshCw, Mail } from "lucide-react";

export type AccessStatusType =
  | "closed"
  | "password_protected"
  | "role_restricted"
  | "public_demo"
  | "maintenance"
  | "archived";

export interface ShowcaseAccessStatusProps {
  status: AccessStatusType;
  message?: string;
  onReturn?: () => void;
  onRefresh?: () => void;
  onContact?: () => void;
}

const STATUS_CONFIG: Record<AccessStatusType, {
  title: string;
  icon: typeof Lock;
  bg: string;
  text: string;
  iconColor: string;
  description: string;
  action: string;
}> = {
  closed: {
    title: "展示已关闭",
    icon: Lock,
    bg: "bg-[var(--ui-surface-muted)]",
    text: "text-[var(--ui-muted)]",
    iconColor: "text-[var(--ui-muted)]",
    description: "当前公开展示页面已关闭，无法访问",
    action: "返回首页",
  },
  password_protected: {
    title: "需要访问密码",
    icon: Lock,
    bg: "bg-[var(--ui-info-soft)]",
    text: "text-[var(--ui-info)]",
    iconColor: "text-[var(--ui-info)]",
    description: "请输入访问密码以查看演示内容",
    action: "输入密码",
  },
  role_restricted: {
    title: "指定角色开放",
    icon: Users,
    bg: "bg-[var(--ui-accent-soft)]",
    text: "text-[#7D5B24]",
    iconColor: "text-[#7D5B24]",
    description: "本页面仅对指定角色开放，请联系管理员获取访问权限",
    action: "联系管理员",
  },
  public_demo: {
    title: "公开演示开放",
    icon: Globe,
    bg: "bg-[var(--ui-success-soft)]",
    text: "text-[var(--ui-success)]",
    iconColor: "text-[var(--ui-success)]",
    description: "当前演示对公众开放，欢迎体验",
    action: "开始体验",
  },
  maintenance: {
    title: "维护中",
    icon: Wrench,
    bg: "bg-[var(--ui-warning-soft)]",
    text: "text-[var(--ui-warning)]",
    iconColor: "text-[var(--ui-warning)]",
    description: "系统正在维护升级，预计很快恢复",
    action: "刷新重试",
  },
  archived: {
    title: "已结束归档",
    icon: Archive,
    bg: "bg-[var(--ui-surface-muted)]",
    text: "text-[var(--ui-muted)]",
    iconColor: "text-[var(--ui-muted)]",
    description: "本次演示已结束，相关内容已归档保存",
    action: "返回首页",
  },
};

export default function ShowcaseAccessStatus({ status, message, onReturn, onRefresh, onContact }: ShowcaseAccessStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const handleAction = () => {
    switch (status) {
      case "closed":
      case "archived":
        onReturn?.();
        break;
      case "password_protected":
        break;
      case "role_restricted":
        onContact?.();
        break;
      case "maintenance":
        onRefresh?.();
        break;
      case "public_demo":
        break;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--ui-surface)]">
      <div className={`w-full max-w-md rounded-[var(--ui-radius-lg)] ${config.bg} p-8 text-center`}>
        <div className={`grid size-20 place-items-center rounded-full bg-white/60 mx-auto mb-6`}>
          <Icon className={`size-10 ${config.iconColor}`} />
        </div>
        <h1 className={`text-2xl font-black mb-3 ${config.text}`}>{config.title}</h1>
        <p className={`text-sm leading-6 ${config.text}`}>{message || config.description}</p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {status === "public_demo" && (
            <button
              type="button"
              onClick={handleAction}
              className="ui-button-primary min-h-11 px-8 text-sm"
            >
              {config.action}
            </button>
          )}
          {status === "password_protected" && (
            <button
              type="button"
              onClick={handleAction}
              className="ui-button-primary min-h-11 px-8 text-sm"
            >
              {config.action}
            </button>
          )}
          {status === "role_restricted" && (
            <button
              type="button"
              onClick={handleAction}
              className="ui-button-primary min-h-11 px-8 text-sm flex items-center justify-center gap-2"
            >
              <Mail className="size-4" />
              {config.action}
            </button>
          )}
          {status === "maintenance" && (
            <button
              type="button"
              onClick={handleAction}
              className="ui-button-secondary min-h-11 px-8 text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="size-4" />
              {config.action}
            </button>
          )}
          {(status === "closed" || status === "archived") && (
            <button
              type="button"
              onClick={handleAction}
              className="ui-button-secondary min-h-11 px-8 text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="size-4" />
              {config.action}
            </button>
          )}
        </div>
        
        <div className="mt-6 flex justify-center gap-4 text-xs text-[var(--ui-faint)]">
          <span>当前状态：{config.title}</span>
          <span>|</span>
          <span>更新时间：{new Date().toLocaleString()}</span>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-[var(--ui-faint)]">
        Link168 · 公开展示系统
      </p>
    </div>
  );
}