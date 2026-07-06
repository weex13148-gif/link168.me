import Link from "next/link";
import {
  ArrowRight,
  Compass,
  FileText,
  Globe2,
  LayoutDashboard,
  Link2,
  LogIn,
  MessageCircle,
  MonitorSmartphone,
  Rocket,
  ShieldAlert,
  Sparkles,
  UserPlus,
  CreditCard,
  Bot,
  Users,
  Lock,
  Flag,
  Phone,
  QrCode,
  BarChart3,
  Palette,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

type HelpEntry = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const helpEntries: HelpEntry[] = [
  {
    title: "快速开始",
    description: "三分钟搭建你的第一个数字名片主页。",
    href: "#quickstart",
    icon: Rocket,
  },
  {
    title: "注册与登录",
    description: "如何注册账号、登录和修改密码。",
    href: "#auth",
    icon: LogIn,
  },
  {
    title: "创建名片",
    description: "设置用户名、填写资料和保存公开主页。",
    href: "#profile",
    icon: UserPlus,
  },
  {
    title: "名片装修",
    description: "选择主题、调整布局和个性化展示。",
    href: "#appearance",
    icon: Palette,
  },
  {
    title: "添加链接和组件",
    description: "添加外部链接、产品和模块到主页。",
    href: "#links",
    icon: PlusCircle,
  },
  {
    title: "二维码与分享",
    description: "生成主页二维码，分享到社交平台。",
    href: "#qr",
    icon: QrCode,
  },
  {
    title: "产品与服务",
    description: "展示产品、服务介绍和文件交付。",
    href: "#products",
    icon: Globe2,
  },
  {
    title: "客户线索",
    description: "查看访客咨询和收集的线索信息。",
    href: "#leads",
    icon: MessageCircle,
  },
  {
    title: "短链接",
    description: "创建和管理短链接，追踪点击数据。",
    href: "#shortlinks",
    icon: Link2,
  },
  {
    title: "数据分析",
    description: "查看主页访问数据和点击统计。",
    href: "#analytics",
    icon: BarChart3,
  },
  {
    title: "AI 助手",
    description: "了解 AI 接待助手和工具箱的使用。",
    href: "#ai",
    icon: Bot,
  },
  {
    title: "会员与支付",
    description: "购买会员、查看订单和申请退款。",
    href: "#membership",
    icon: CreditCard,
  },
  {
    title: "Workspace",
    description: "创建团队和邀请成员协作。",
    href: "#workspace",
    icon: Users,
  },
  {
    title: "账号安全",
    description: "保护账号安全和管理登录状态。",
    href: "#security",
    icon: Lock,
  },
  {
    title: "举报和申诉",
    description: "举报违规主页或提交申诉。",
    href: "#report",
    icon: Flag,
  },
  {
    title: "联系客服",
    description: "遇到问题？联系平台获取帮助。",
    href: "#contact",
    icon: Phone,
  },
];

const quickLinks: HelpEntry[] = [
  { title: "登录", description: "已有账号继续管理主页。", href: "/login", icon: LogIn },
  { title: "用户协议", description: "查看 Link168 用户协议。", href: "/terms", icon: FileText },
  { title: "隐私政策", description: "查看个人信息保护说明。", href: "/privacy", icon: Compass },
  { title: "会员协议", description: "查看会员服务协议。", href: "/membership-agreement", icon: CreditCard },
  { title: "退款规则", description: "了解支付与退款规则。", href: "/refund-policy", icon: FileText },
  { title: "AI 免责声明", description: "查看 AI 使用说明。", href: "/ai-disclaimer", icon: Bot },
  { title: "举报中心", description: "举报违法违规或侵权内容。", href: "/report", icon: ShieldAlert },
  { title: "联系客服", description: "提交问题或反馈。", href: "/contact", icon: Phone },
];

const faqs = [
  {
    q: "如何创建名片？",
    a: "访问 link168.me，输入你想要的用户名后缀，完成注册后即可进入 Dashboard 填写资料并保存公开主页。",
  },
  {
    q: "如何修改用户名？",
    a: "登录后进入 Dashboard，在资料设置中修改用户名并保存。用户名修改后，公开主页地址将同步更新。",
  },
  {
    q: "如何上传头像？",
    a: "在 Dashboard 的资料设置中，点击头像区域上传图片。支持 JPG、PNG、WEBP 格式。",
  },
  {
    q: "如何生成二维码？",
    a: "保存公开主页后，系统会自动生成主页二维码。你可以在 Dashboard 或分享页面查看和下载。",
  },
  {
    q: "如何隐藏某个组件？",
    a: "在 Dashboard 的链接或模块管理中，找到对应项目，点击设置将其设为隐藏或删除。",
  },
  {
    q: "如何查看访问数据？",
    a: "登录 Dashboard，进入数据分析页面，可查看主页访问量、点击分布和来源统计。",
  },
  {
    q: "如何查看客户线索？",
    a: "Pro 及以上会员可在 Dashboard 的客户线索页面查看访客提交的咨询和联系方式。",
  },
  {
    q: "AI 为什么无法使用？",
    a: "免费用户仅可预览 AI 功能，不产生真实调用。请确认当前套餐是否包含 AI 额度，或额度是否已耗尽。",
  },
  {
    q: "AI 额度如何计算？",
    a: "AI 工具箱点数按月结算，不同套餐额度不同。Plus 为 300 点/月，Pro 为 2000 点/月，企业版为 10000 点/月。未用完不累计。",
  },
  {
    q: "如何购买会员？",
    a: "登录后进入工作台会员页面或定价页面，选择套餐并完成支付宝支付即可。",
  },
  {
    q: "如何查看订单？",
    a: "登录后进入工作台会员页面，可查看历史订单和当前订阅状态。",
  },
  {
    q: "如何申请退款？",
    a: "如需退款，请通过联系客服页面提交订单号和退款原因，平台将在审核后处理。",
  },
  {
    q: "如何创建 Workspace？",
    a: "企业版用户可在工作台创建 Workspace，并邀请团队成员加入协作。",
  },
  {
    q: "如何添加已有用户到 Workspace？",
    a: "在 Workspace 管理页面，输入对方注册邮箱发送邀请。被邀请用户接受后即可加入。",
  },
  {
    q: "如何举报违规主页？",
    a: "访问举报中心页面，填写被举报链接、举报类型和说明，提交后平台将进行核查。",
  },
  {
    q: "如何联系平台？",
    a: "可通过联系客服页面提交问题，或访问帮助中心查找解决方案。",
  },
];

const guideSections = [
  {
    id: "quickstart",
    title: "快速开始",
    text: "访问 link168.me 首页，输入你想要的用户名后缀，点击注册。填写邮箱和密码完成注册后，进入 Dashboard 完善资料、添加链接并保存，即可通过 link168.me/你的用户名 访问公开主页。",
  },
  {
    id: "auth",
    title: "注册与登录",
    text: "使用邮箱注册 Link168 账号。注册后可通过邮箱和密码登录。如忘记密码，可在登录页面尝试找回。请妥善保管账号信息，不要与他人共享。",
  },
  {
    id: "profile",
    title: "创建名片",
    text: "在 Dashboard 资料面板中填写昵称、简介、头像和联系方式。保存后，这些信息将展示在你的公开主页上。你可以随时修改并实时更新。",
  },
  {
    id: "appearance",
    title: "名片装修",
    text: "在 Dashboard 外观面板中选择主题风格、调整颜色和布局。Pro 及以上会员可使用高级主题和去品牌标识功能。",
  },
  {
    id: "links",
    title: "添加链接和组件",
    text: "在 Dashboard 链接面板中点击添加，输入链接标题和地址。支持添加外部链接、产品模块、文件交付等多种组件。拖拽可调整展示顺序。",
  },
  {
    id: "qr",
    title: "二维码与分享",
    text: "保存主页后，系统会自动生成二维码。你可以下载二维码图片，或直接将主页地址分享到微信、小红书、抖音等平台。",
  },
  {
    id: "products",
    title: "产品与服务",
    text: "在链接面板中添加产品模块，填写产品名称、描述、价格和行动号召按钮。适合创作者、商家展示和销售服务。",
  },
  {
    id: "leads",
    title: "客户线索",
    text: "Pro 及以上会员可在工作台查看客户线索页面。访客通过 AI 接待或主页表单提交的咨询信息将汇总在此，方便后续跟进。",
  },
  {
    id: "shortlinks",
    title: "短链接",
    text: "在工作台短链接页面创建自定义短链接，追踪点击次数和来源。适合在社交媒体、邮件或线下场景中使用。",
  },
  {
    id: "analytics",
    title: "数据分析",
    text: "在工作台数据分析页面查看主页访问量、链接点击量、访客来源和访问趋势。Plus 会员可查看 90 天数据，Pro 及以上可查看更长时间范围。",
  },
  {
    id: "ai",
    title: "AI 助手",
    text: "AI 接待助手可在访客访问主页时自动答疑和引导留资。AI 工具箱提供文案生成、客户分析等经营工具。AI 额度按月结算，具体以当前套餐为准。",
  },
  {
    id: "membership",
    title: "会员与支付",
    text: "在定价页面选择套餐并完成支付。当前支持支付宝付款。支付成功后权益立即生效。可在工作台查看订单和订阅状态。",
  },
  {
    id: "workspace",
    title: "Workspace",
    text: "企业版用户可创建 Workspace 并邀请最多 3 名成员协作。Workspace 所有者管理成员权限和内容。团队成员可共享知识库和 AI 额度。",
  },
  {
    id: "security",
    title: "账号安全",
    text: "定期修改密码，不要在公共设备上保持登录状态。如发现异常登录，请立即修改密码。账号注销需联系客服申请。",
  },
  {
    id: "report",
    title: "举报和申诉",
    text: "发现违规主页？访问举报中心提交被举报链接和说明。平台将在核查后处理。恶意举报将承担相应责任。",
  },
  {
    id: "contact",
    title: "联系客服",
    text: "遇到问题可访问联系客服页面提交反馈，或在帮助中心查找相关文章。",
  },
];

function HelpCard({ title, description, href, icon: Icon }: HelpEntry) {
  return (
    <Link
      href={href}
      className="link168-card-hover link168-button-press group flex min-h-28 items-center gap-4 rounded-[26px] border border-[#E7E4D8] bg-white px-4 py-4 text-left shadow-sm"
    >
      <span className="link168-card-icon link168-wiggle-on-hover grid size-12 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-[#16A34A] transition group-hover:bg-[#FACC15] group-hover:text-[#113A1D]">
        <Icon aria-hidden className="link168-feature-icon" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-[#113A1D]">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-[#52624A]">{description}</span>
      </span>
      <ArrowRight aria-hidden className="link168-feature-icon shrink-0 text-[#8FA083] transition group-hover:translate-x-1 group-hover:text-[#0B7A58]" />
    </Link>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#FFFEF8] text-[#113A1D]">
      <main>
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#092B17_0%,#0B6B2B_42%,#F7F6EA_100%)]" />
          <div className="link168-aurora absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(250,204,21,0.42),transparent_25%),radial-gradient(circle_at_82%_22%,rgba(255,247,214,0.56),transparent_22%),radial-gradient(circle_at_56%_82%,rgba(22,163,74,0.36),transparent_24%)]" />
          <div className="absolute -left-24 top-28 -z-10 size-72 rounded-full border border-white/20" />
          <div className="absolute right-[-70px] top-10 -z-10 size-[320px] rounded-full bg-[#FACC15]/25 blur-3xl" />
          <div className="absolute bottom-8 left-[28%] -z-10 h-28 w-[42rem] rotate-[-7deg] rounded-full border border-white/20" />

          <div className="mx-auto w-full max-w-7xl">
            <header className="flex items-center justify-between">
              <BrandLogo size="header" />
              <Link
                href="/register"
                className="link168-button-press hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[15px] font-semibold text-[#113A1D] shadow-xl shadow-black/10 transition hover:-translate-y-0.5 sm:inline-flex"
              >
                创建主页
                <Rocket aria-hidden className="link168-nav-icon" />
              </Link>
            </header>

            <div className="grid gap-10 pt-16 lg:grid-cols-[minmax(0,0.88fr)_minmax(360px,1.12fr)] lg:items-end">
              <div className="text-white">
                <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black text-[#FFF7D6]">
                  <Sparkles aria-hidden className="size-4" />
                  Link168 使用支持
                </p>
                <h1 className="mt-5 text-5xl font-black leading-tight sm:text-6xl">Link168 帮助中心</h1>
                <p className="mt-5 max-w-2xl text-2xl font-black leading-snug text-[#FACC15]">
                  链接聚合分享，就用 Link168
                  <span className="block text-white">三分钟搭建你的数字名片</span>
                </p>
                <p className="mt-5 max-w-2xl text-base leading-8 text-white/80">
                  从注册、创建主页到复制平台链接，这里整理最常用的操作入口。先把客户需要点击的内容收齐，再把一个主页地址分享出去。
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-6 -z-10 rounded-full bg-[#FACC15]/25 blur-3xl" />
                <div className="rounded-[34px] border border-white/20 bg-white/20 p-4 shadow-2xl shadow-black/20 backdrop-blur">
                  <div className="rounded-[28px] bg-[#F7F6EA] p-5 text-[#113A1D]">
                    <div className="flex items-center gap-3">
                      <span className="grid size-14 place-items-center rounded-2xl bg-[#FACC15]">
                        <MonitorSmartphone aria-hidden className="size-7" />
                      </span>
                      <div>
                        <p className="text-lg font-black">新手三步</p>
                        <p className="text-sm font-bold text-[#52624A]">注册、保存主页、添加链接</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3">
                      {["抢占 link168.me/用户名", "填写资料并保存公开主页", "添加公众号、小红书、抖音等链接"].map((item, index) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-black shadow-sm">
                          <span className="grid size-8 place-items-center rounded-full bg-[#ECFDF3] text-[#0B6B2B]">{index + 1}</span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">快速入口</p>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl">你想解决什么问题？</h2>
              </div>
              <Link
                href="/dashboard"
                className="link168-button-press inline-flex w-fit items-center gap-2 rounded-full bg-[#0B6B2B] px-5 py-3 text-sm font-black text-white shadow-xl shadow-[#0B6B2B]/15 transition hover:-translate-y-0.5"
              >
                回到后台
                <LayoutDashboard aria-hidden className="size-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {helpEntries.map((entry) => (
                <HelpCard key={entry.title} {...entry} />
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((entry) => (
                <HelpCard key={entry.title} {...entry} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-sm font-black text-[#0B6B2B]">帮助文章</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">按主题浏览</h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {guideSections.map((item) => (
                <article key={item.id} id={item.id} className="rounded-[26px] border border-[#DDE8CF] bg-[#FCFFF7] p-5">
                  <p className="text-sm font-black text-[#0B6B2B]">Link168 Help</p>
                  <h3 className="mt-2 text-2xl font-black text-[#113A1D]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#52624A]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-sm font-black text-[#0B6B2B]">FAQ</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">常见问题</h2>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {faqs.map((item, index) => (
                <details
                  key={index}
                  className="group rounded-[26px] border border-[#DDE8CF] bg-white p-5 open:bg-[#FCFFF7]"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-base font-black text-[#113A1D]">
                    <span className="pr-4">{item.q}</span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7F6EA] text-[#0B6B2B] transition group-open:rotate-180">
                      <ArrowRight className="size-4 rotate-90" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-[#52624A]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
