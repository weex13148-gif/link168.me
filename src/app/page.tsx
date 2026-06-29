import Link from "next/link";
import { ArrowRight, BarChart3, LayoutGrid, QrCode } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { HomeHandleForm } from "@/components/HomeHandleForm";
import { PhonePreview } from "@/components/PhonePreview";
import { SiteFooter } from "@/components/SiteFooter";
const demoLinks = [
{ id: "a", label: "最新创业记录", caption: "AI 创业实战", href: "/register" },
{ id: "b", label: "AI 工具清单", caption: "持续更新", href: "/register" },
{ id: "c", label: "预约合作咨询", caption: "项目与品牌合作", href: "/register" },
];
const features = [
  ["整理入口", "内容、商品、服务集中展示。", LayoutGrid],
  ["一码传播", "适合线上与线下分享。", QrCode],
  ["数据沉淀", "看懂访问与点击。", BarChart3],
] as const;
export default function Home() {
  return (
<div className="min-h-dvh overflow-x-hidden bg-[#F6F7F2] text-[#182016]">
<AppHeader />
<main>
<section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
<div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_400px] lg:items-center">
<div>
<p className="text-sm font-black text-[#587744]">中文数字主页与二维码经营工具</p>
<h1 className="mt-5 max-w-3xl text-[42px] font-black leading-[1.06] tracking-[-0.045em] sm:text-[64px] lg:text-[76px]">让客户更快找到你，<span className="text-[#587744]">也更快联系你</span></h1>
<p className="mt-6 max-w-2xl text-base leading-8 text-[#667063] sm:text-lg">用一个专属主页展示内容、商品、服务和联系方式，再用二维码承接客户。</p>
<HomeHandleForm />
<p className="mt-4 text-sm font-semibold text-[#667063]">无需代码 · 3 分钟创建 · 免费开始</p>
</div>
<PhonePreview variant="marketing" username="abao" displayName="阿宝的创业笔记" bio="分享一个人用 AI 做产品、做内容、做生意的真实过程" links={demoLinks} className="max-w-[350px]" appearance={{ surfaceClassName: "bg-[#F3F5EF]", cardClassName: "bg-white", linkClassName: "border-[#DCE2D7] bg-white" }} />
</div>
</section>
<section id="features" className="border-y border-[#E4E8E0] bg-white px-4 py-20 sm:px-6 lg:px-8">
<div className="mx-auto max-w-7xl">
<h2 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">不只是放链接，而是整理一条更短的成交路径</h2>
<div className="mt-10 grid gap-5 lg:grid-cols-3">
{features.map(([title, text, Icon], index) => (
<article key={title} className="rounded-[28px] border border-[#DCE2D7] bg-[#F6F7F2] p-7">
<div className="flex justify-between text-[#587744]"><span className="font-black">0{index + 1}</span><Icon className="size-6" /></div>
<h3 className="mt-10 text-2xl font-black">{title}</h3><p className="mt-3 text-[#667063]">{text}</p>
</article>
              ))}
</div>
</div>
</section>
<section id="cases" className="px-4 py-20 sm:px-6 lg:px-8">
<div className="mx-auto flex max-w-7xl flex-col gap-8 rounded-[32px] bg-[#182016] p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
<div><p className="font-black text-[#BBD0AE]">适合创作者、门店与独立顾问</p><h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-5xl">主页承接客户，AI 帮你继续经营</h2><p className="mt-4 text-white/65">AI 经营助手处于白名单内测。</p></div>
<Link href="/register" className="inline-flex min-h-14 shrink-0 items-center gap-2 rounded-full bg-[#BBD0AE] px-7 font-black text-[#182016]">免费创建<ArrowRight className="size-5" /></Link>
</div>
</section>
</main>
<SiteFooter />
</div>
  );
}
