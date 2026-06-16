"use client";

import Link from "next/link";
import { ArrowLeft, Bot, BriefcaseBusiness, FileText, Lock, Palette, Scale, Sparkles, Users } from "lucide-react";

const assistants = [
  { title: "财税助理", text: "发票、成本、报税、年报提醒", icon: FileText },
  { title: "法务助理", text: "协议、合同、合规风险提示", icon: Scale },
  { title: "市场调研助理", text: "竞品、用户画像、定价建议", icon: BriefcaseBusiness },
  { title: "设计助理", text: "Logo、页面、海报、品牌视觉建议", icon: Palette },
  { title: "社媒运营助理", text: "小红书、公众号、抖音、视频号内容建议", icon: Sparkles },
];

const enterpriseTools = [
  { title: "团队管理", status: "即将开放" },
  { title: "企业资料库", status: "即将开放" },
  { title: "长期记忆", status: "企业版专属" },
  { title: "使用记录", status: "即将开放" },
  { title: "成员权限", status: "即将开放" },
];

function showEnterpriseNotice() {
  window.alert("该功能为企业版能力，当前处于内测展示阶段，如需开通请联系平台管理员。");
}

export default function EnterpriseAiDashboardPage() {
  return (
    <main className="min-h-dvh bg-[#F7F1E7] px-4 py-6 text-[#2B241E] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#DDE8CD] px-3 py-1.5 text-sm font-black text-[#3F5F31]">
            <Bot aria-hidden className="size-4" />
            内测展示工作台
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">企业 AI 工作台</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/enterprise-ai" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-5 text-sm font-black text-[#3F5F31]">
            <ArrowLeft aria-hidden className="size-4" />
            返回企业 AI 服务
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white">
            返回登录页
          </Link>
        </div>
      </div>

      <section className="mx-auto mt-8 grid w-full max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-5">
        {assistants.map(({ title, text, icon: Icon }) => (
          <button
            key={title}
            type="button"
            onClick={showEnterpriseNotice}
            className="link168-button-press rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8] p-5 text-left shadow-sm hover:-translate-y-0.5"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
              <Icon aria-hidden className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{text}</p>
          </button>
        ))}
      </section>

      <section className="mx-auto mt-8 w-full max-w-7xl rounded-[32px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-6 shadow-[0_22px_70px_rgba(86,68,46,0.10)]">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#F6E7C8] text-[#8C612E]">
            <Users aria-hidden className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black">企业功能区</h2>
            <p className="mt-1 text-sm text-[#7A6D5E]">以下能力暂为前端预览，真实团队与资料库能力后续开放。</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {enterpriseTools.map(({ title, status }) => (
            <button
              key={title}
              type="button"
              onClick={showEnterpriseNotice}
              className="link168-button-press flex min-h-28 flex-col justify-between rounded-3xl border border-[#E8DCCB] bg-[#F7F1E7] p-4 text-left"
            >
              <span className="text-lg font-black">{title}</span>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#FFFDF8] px-3 py-1 text-xs font-black text-[#8C612E]">
                <Lock aria-hidden className="size-3" />
                {status}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
