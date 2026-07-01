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
      <main className="ui-page grid min-h-dvh place-items-center px-4 py-10">
        <section className="ui-surface w-full max-w-xl p-7 text-center sm:p-9">
          <span className="mx-auto grid size-12 place-items-center rounded-[var(--ui-radius-sm)] bg-[var(--ui-brand)] text-lg font-black text-white">L</span>
          <p className="ui-eyebrow mt-6">比赛展示中心</p>
          <h1 className="ui-title mt-3 text-3xl sm:text-4xl">当前暂未开放评委访问</h1>
          <p className="ui-muted mt-4 text-sm leading-7">比赛页面由超级管理员控制，默认关闭。开启后可通过共享密码查看真实产品、比赛资料、演示状态和评委下载文件。</p>
          <a href="/" className="ui-button-secondary mt-6">返回 Link168 首页</a>
        </section>
      </main>
    );
  }

  if (!authed) {
    await recordShowcaseAccess(buildShowcaseLogMetadata(requestHeaders, "password_required")).catch(() => undefined);
    return <ShowcaseGate />;
  }

  await recordShowcaseAccess(buildShowcaseLogMetadata(requestHeaders, "authorized_page")).catch(() => undefined);
  return <ShowcaseClient />;
}
