"use client";

import { buttonClass, Feedback, TeamShell } from "@/components/current-team/shared";

export default function TeamError({ reset }: { reset: () => void }) {
  return <TeamShell title="团队信息暂不可用" description="请重试；如果仍无法加载，请稍后再来。"><Feedback error="加载团队时发生错误，尚未完成的操作不会显示为成功。" /><button type="button" className={buttonClass} onClick={reset}>重新加载</button></TeamShell>;
}
