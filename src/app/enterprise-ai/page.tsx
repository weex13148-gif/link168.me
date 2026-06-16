import Link from "next/link";
import { ArrowRight, Bot, BriefcaseBusiness, Building2, FileText, Palette, Scale, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const assistants = [
  { title: "财税助理", text: "辅助梳理发票、成本、报税提醒和经营数据。", icon: FileText },
  { title: "法务助理", text: "辅助查看协议、合同条款和常见合规风险。", icon: Scale },
  { title: "市场调研助理", text: "辅助整理竞品、用户画像、定价和机会判断。", icon: BriefcaseBusiness },
  { title: "设计助理", text: "辅助提供 Logo、页面、海报和品牌视觉建议。", icon: Palette },
  { title: "社媒运营助理", text: "辅助生成小红书、公众号、抖音、视频号内容思路。", icon: Sparkles },
];

const enterpriseFeatures = ["团队管理", "企业资料库", "长期记忆", "使用次数管理", "专属 AI 助理配置", "企业定制服务"];

export default function EnterpriseAiPage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_12%_18%,rgba(221,232,205,0.72),transparent_28%),linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_58%,#F2E7D8_100%)] px-4 py-6 text-[#2B241E] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <BrandLogo size="header" />
        <Link href="/login" className="rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-2 text-sm font-black text-[#3F5F31] shadow-sm">
          返回登录页
        </Link>
      </div>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#E8DCCB] bg-[#FFFDF8]/86 px-4 py-2 text-sm font-black text-[#3F5F31]">
            <Bot aria-hidden className="size-4" />
            内测展示版
          </p>
          <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight sm:text-6xl">企业 AI 创业助理</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#7A6D5E]">
            为个人创业者、小团队和企业提供财税、法务、市场调研、设计、社媒运营支持。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/enterprise-ai/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#6F8F4E] px-6 text-sm font-black text-white shadow-lg shadow-[#6F8F4E]/20">
              进入工作台预览
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a href="mailto:business@link168.me" className="inline-flex min-h-12 items-center rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-6 text-sm font-black text-[#3F5F31]">
              企业 AI 服务：business@link168.me
            </a>
          </div>
        </div>

        <div className="rounded-[32px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-6 shadow-[0_24px_80px_rgba(86,68,46,0.12)]">
          <div className="grid size-14 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
            <Building2 aria-hidden className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-black">企业版能力展示</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {enterpriseFeatures.map((item) => (
              <span key={item} className="rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm font-black text-[#3F5F31]">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-[#F6E7C8] px-4 py-3 text-sm font-bold leading-6 text-[#8C612E]">
            当前为内测展示版，真实 AI 服务和团队管理将在企业客户开通后逐步开放。
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-5">
        {assistants.map(({ title, text, icon: Icon }) => (
          <article key={title} className="rounded-[26px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-sm">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#DDE8CD] text-[#3F5F31]">
              <Icon aria-hidden className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6D5E]">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
