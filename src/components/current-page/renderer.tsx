import type {
  CurrentPageAction,
  CurrentPageRenderModel,
} from "@/components/current-page/types";
import {
  CurrentBoundaryPill,
  CurrentPageStatusBadge,
} from "@/components/current-page/states";

function ActionLink({ action }: { action: CurrentPageAction }) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2";
  const tone =
    action.kind === "secondary"
      ? "border border-[#DDD6CC] bg-white text-[#151515]"
      : action.kind === "quiet"
        ? "border border-transparent bg-transparent text-[#0B4DD8]"
        : "border border-[#0B4DD8] bg-[#0B4DD8] text-white";
  const disabled = action.disabled
    ? "cursor-not-allowed opacity-60"
    : "hover:brightness-[0.97]";

  if (action.href && !action.disabled) {
    return (
      <a href={action.href} className={`${base} ${tone} ${disabled}`}>
        {action.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={Boolean(action.disabled)}
      title={action.reason || undefined}
      className={`${base} ${tone} ${disabled}`}
    >
      {action.label}
    </button>
  );
}

export function CurrentPageRenderer({
  model,
}: {
  model: CurrentPageRenderModel;
}) {
  return (
    <article className="bg-[#F7F2E9]">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8 lg:gap-12 lg:px-10 lg:py-10">
        <header className="rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-[0_10px_28px_rgba(44,34,20,.08)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <CurrentBoundaryPill boundary={model.boundary} />
            <CurrentPageStatusBadge status={model.pageStatus} />
            {model.publicIdentity ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-[#DDD6CC] bg-white px-3 text-xs font-bold text-[#5E5A54]">
                @{model.publicIdentity}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="min-w-0">
              {model.hero.eyebrow ? (
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0B4DD8]">
                  {model.hero.eyebrow}
                </p>
              ) : null}
              <h1 className="mt-2 text-3xl font-bold text-[#151515] sm:text-4xl">
                {model.hero.title}
              </h1>
              {model.hero.subtitle ? (
                <p className="mt-3 text-lg font-medium text-[#5E5A54]">
                  {model.hero.subtitle}
                </p>
              ) : null}
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#5E5A54]">
                {model.hero.summary}
              </p>

              {model.hero.meta && model.hero.meta.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {model.hero.meta.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-[#DDD6CC] bg-white px-3 py-2 text-xs font-medium text-[#5E5A54]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              {(model.hero.primaryAction || model.hero.secondaryAction) ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {model.hero.primaryAction ? (
                    <ActionLink action={model.hero.primaryAction} />
                  ) : null}
                  {model.hero.secondaryAction ? (
                    <ActionLink action={model.hero.secondaryAction} />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-start justify-start lg:justify-end">
              {model.hero.avatarUrl ? (
                <img
                  src={model.hero.avatarUrl}
                  alt={`${model.pageName} 头像`}
                  className="h-28 w-28 rounded-[28px] object-cover shadow-[0_10px_28px_rgba(44,34,20,.10)] sm:h-36 sm:w-36"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-dashed border-[#BEB5A9] bg-white text-center text-sm font-bold text-[#8B847B] sm:h-36 sm:w-36">
                  暂无头像
                </div>
              )}
            </div>
          </div>
        </header>

        {model.offerings && model.offerings.length > 0 ? (
          <section className="grid gap-4">
            <div>
              <p className="text-sm font-bold text-[#0B4DD8]">Offering</p>
              <h2 className="mt-1 text-2xl font-bold text-[#151515]">
                当前对外提供的服务
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {model.offerings.map((offering) => (
                <article
                  key={offering.id}
                  className="rounded-[24px] border border-[#DDD6CC] bg-[#FFFDF9] p-5 shadow-[0_10px_28px_rgba(44,34,20,.08)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {offering.badge ? (
                      <span className="rounded-full bg-[#EAF0FF] px-3 py-1 text-xs font-bold text-[#1C4ED8]">
                        {offering.badge}
                      </span>
                    ) : null}
                    {offering.priceLabel ? (
                      <span className="rounded-full bg-[#F7E7C4] px-3 py-1 text-xs font-bold text-[#9A650F]">
                        {offering.priceLabel}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-[#151515]">
                    {offering.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5E5A54]">
                    {offering.summary}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {model.sections && model.sections.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {model.sections.map((section) => (
              <article
                key={section.id}
                className={`rounded-[24px] border p-5 shadow-[0_10px_28px_rgba(44,34,20,.08)] ${
                  section.tone === "highlight"
                    ? "border-[#C9D5F6] bg-[#F6F8FF]"
                    : section.tone === "muted"
                      ? "border-[#EEE7DD] bg-[#FBF8F2]"
                      : "border-[#DDD6CC] bg-[#FFFDF9]"
                }`}
              >
                <h3 className="text-xl font-bold text-[#151515]">
                  {section.label}
                </h3>
                {section.description ? (
                  <p className="mt-2 text-sm leading-6 text-[#5E5A54]">
                    {section.description}
                  </p>
                ) : null}
                <ul className="mt-4 space-y-3">
                  {section.content.map((item) => (
                    <li
                      key={item}
                      className="rounded-[16px] bg-white/70 px-4 py-3 text-sm text-[#151515]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : null}

        {model.links && model.links.length > 0 ? (
          <section className="rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-[0_10px_28px_rgba(44,34,20,.08)]">
            <h2 className="text-2xl font-bold text-[#151515]">更多链接</h2>
            <div className="mt-4 grid gap-3">
              {model.links.map((link) => (
                link.href ? (
                  <a
                    key={link.id}
                    href={link.href}
                    className="rounded-[18px] border border-[#EEE7DD] bg-white px-4 py-4 transition hover:border-[#BEB5A9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#151515]">
                          {link.label}
                        </p>
                        {link.description ? (
                          <p className="mt-1 text-sm leading-6 text-[#5E5A54]">
                            {link.description}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs font-bold text-[#0B4DD8]">
                        打开
                      </span>
                    </div>
                  </a>
                ) : (
                  <div
                    key={link.id}
                    className="rounded-[18px] border border-[#EEE7DD] bg-white px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#151515]">
                          {link.label}
                        </p>
                        {link.description ? (
                          <p className="mt-1 text-sm leading-6 text-[#5E5A54]">
                            {link.description}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs font-bold text-[#0B4DD8]">
                        未配置
                      </span>
                    </div>
                  </div>
                )
              ))}
            </div>
          </section>
        ) : null}

        {model.contacts && model.contacts.length > 0 ? (
          <section className="rounded-[28px] border border-[#DDD6CC] bg-[#FFFDF9] p-6 shadow-[0_10px_28px_rgba(44,34,20,.08)]">
            <h2 className="text-2xl font-bold text-[#151515]">联系入口</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {model.contacts.map((contact) => (
                contact.href ? (
                  <a
                    key={`${contact.label}-${contact.value}`}
                    href={contact.href}
                    className="rounded-[18px] border border-[#EEE7DD] bg-white px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B847B]">
                      {contact.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#151515]">
                      {contact.value}
                    </p>
                  </a>
                ) : (
                  <div
                    key={`${contact.label}-${contact.value}`}
                    className="rounded-[18px] border border-[#EEE7DD] bg-white px-4 py-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B847B]">
                      {contact.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#151515]">
                      {contact.value}
                    </p>
                  </div>
                )
              ))}
            </div>
          </section>
        ) : null}

        {model.footer ? (
          <footer className="flex flex-col gap-3 border-t border-[#DDD6CC] pt-6 text-sm text-[#5E5A54] sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {model.footer.brandLabel ? <p>{model.footer.brandLabel}</p> : null}
              {model.footer.note ? <p>{model.footer.note}</p> : null}
            </div>
            {model.footer.reportHref ? (
              <a
                href={model.footer.reportHref}
                className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[#DDD6CC] bg-white px-4 font-bold text-[#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4DD8] focus-visible:ring-offset-2"
              >
                举报此页面
              </a>
            ) : null}
          </footer>
        ) : null}
      </div>
    </article>
  );
}
