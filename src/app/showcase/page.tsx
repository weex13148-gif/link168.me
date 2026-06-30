import { cookies, headers } from "next/headers";
import ShowcaseGate from "@/components/showcase/ShowcaseGate";
import ShowcaseClient from "@/components/showcase/ShowcaseClient";
import {
  SHOWCASE_COOKIE_NAME,
  buildShowcaseLogMetadata,
  getShowcaseConfig,
  hasValidShowcaseCookie,
  recordShowcaseAccess,
} from "@/lib/showcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  const config = await getShowcaseConfig();
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const authed = hasValidShowcaseCookie(cookieStore.get(SHOWCASE_COOKIE_NAME)?.value, config);

  if (!config.enabled) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(requestHeaders, "disabled")).catch(() => undefined);
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0A1020] px-4 py-8 text-white sm:px-5 sm:py-10">
        <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl sm:rounded-[32px] sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9DBADD] sm:text-xs">Link168 Showcase</p>
          <h1 className="mt-2 text-2xl font-black sm:mt-3 sm:text-3xl lg:text-5xl">比赛展示中心暂未启用</h1>
          <p className="mt-4 text-sm leading-7 text-white/70 sm:text-base lg:leading-8">
            该页面由超级管理员后台总开关控制，默认关闭。主站首页、Dashboard、登录注册页和用户公开主页不会出现比赛宣传。
          </p>
        </section>
      </main>
    );
  }

  if (!authed) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(requestHeaders, "password_required")).catch(() => undefined);
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0A1020] px-4 py-8 text-white sm:px-5 sm:py-10">
        <section className="w-full max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9DBADD] sm:text-xs">Judge Access</p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:mt-3 sm:text-4xl lg:text-6xl">Link168 比赛展示中心</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base lg:leading-8">
            本展示中心仅面向评委和比赛审核场景开放，需输入共享访问密码。展示内容严格区分已上线、内测中和规划中能力。
          </p>
          <ShowcaseGate />
        </section>
      </main>
    );
  }

  await recordShowcaseAccess(buildShowcaseLogMetadata(requestHeaders, "authorized_page")).catch(() => undefined);
  return <ShowcaseClient />;
}
