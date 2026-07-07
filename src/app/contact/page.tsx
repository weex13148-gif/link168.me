"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, Flag, HelpCircle, LogOut, MailQuestion, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { COMPANY_NAME, SUPPORT_EMAIL } from "@/lib/legal/meta";

const supportRoutes = [
  {
    title: "账号与登录",
    description: "找回密码、邮箱验证、登录异常和账号安全说明。",
    href: "/help",
    icon: HelpCircle,
  },
  {
    title: "会员与订单",
    description: "查看当前会员、订单状态、支付结果和权益说明。",
    href: "/workbench/membership",
    icon: CreditCard,
  },
  {
    title: "举报违规内容",
    description: "举报违法、侵权、欺诈或不适合公开展示的内容。",
    href: "/report",
    icon: ShieldAlert,
  },
  {
    title: "账号注销",
    description: "提交真实账号注销请求，并按系统返回处理结果。",
    href: "/account-cancellation",
    icon: LogOut,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#FFFEF8] text-[#113A1D]">
      <header className="sticky top-0 z-30 border-b border-[#E7E4D8]/80 bg-[#FFFEF8]/88 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <BrandLogo size="header" />
          <Link href="/help" className="text-sm font-bold text-[#0B6B2B] transition hover:text-[#0B7A58]">
            帮助中心
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0B6B2B]">{COMPANY_NAME}</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">联系与支持</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#52624A]">
            请选择与你的问题最接近的入口。Link168 只展示当前真实可用的处理路径，不提供没有接收端的表单提交。
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {supportRoutes.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="link168-button-press group flex min-h-[148px] flex-col justify-between rounded-[26px] border border-[#DDE8CF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-[#0B6B2B]">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-black">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#52624A]">{item.description}</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#0B6B2B]">
                  前往处理
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </section>

        {SUPPORT_EMAIL ? (
          <section className="mt-6 rounded-[26px] border border-[#DDE8CF] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#F7F6EA] text-[#7A8B70]">
                <MailQuestion className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-black">邮件支持</h2>
                <p className="mt-2 text-sm leading-6 text-[#52624A]">
                  如果以上入口无法覆盖你的问题，可以通过邮件补充说明账号、页面地址、订单号或问题截图。
                </p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 inline-block text-sm font-black text-[#0B6B2B] underline">
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-[26px] border border-[#DDE8CF] bg-[#FCFFF7] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Flag className="mt-0.5 size-5 shrink-0 text-[#0B6B2B]" />
            <p className="text-sm leading-7 text-[#52624A]">
              涉及公开主页内容违规、冒用身份、欺诈或侵权时，请优先使用举报中心。举报记录会进入平台治理流程。
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
