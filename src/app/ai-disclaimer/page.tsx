import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { COMPANY_NAME, LEGAL_EFFECTIVE_DATE } from "@/lib/legal/meta";

const sections: LegalSection[] = [
  {
    id: "nature",
    title: "AI 内容的性质",
    children: (
      <>
        <p>Link168 提供的 AI 接待助手、AI 工具箱及相关 AI 服务，其输出内容由人工智能模型根据用户输入和上下文自动生成，不构成平台的人工审核结论或官方意见。</p>
        <p>AI 输出可能存在错误、遗漏、过时信息或不恰当表达，用户应自行判断其准确性和适用性。</p>
      </>
    ),
  },
  {
    id: "not-advice",
    title: "不构成专业意见",
    children: (
      <>
        <p>AI 输出仅供参考，不构成法律、财税、医疗、投资、教育或其他任何领域的专业意见。</p>
        <p>涉及重要决策的事项，用户应咨询具备相应资质的专业人士，并自行核验关键结论。平台不对用户依据 AI 输出作出的决策承担责任。</p>
      </>
    ),
  },
  {
    id: "input-restriction",
    title: "用户输入限制",
    children: (
      <>
        <p>用户不得向 AI 输入以下内容：</p>
        <ul>
          <li>违法违规、危害国家安全、破坏社会稳定或侵犯他人权益的内容。</li>
          <li>他人的个人隐私、敏感信息或未经授权的机密数据。</li>
          <li>旨在诱导 AI 生成违法、有害或误导性内容的提示注入。</li>
        </ul>
        <p>用户对其输入内容承担全部责任。平台可能对输入内容进行必要的安全检测，并拒绝处理违规请求。</p>
      </>
    ),
  },
  {
    id: "output-restriction",
    title: "AI 生成内容的使用限制",
    children: (
      <>
        <p>用户不得利用 AI 服务生成或传播以下内容：</p>
        <ul>
          <li>虚假新闻、谣言、诈骗话术或误导性宣传。</li>
          <li>色情低俗、暴力恐怖、仇恨歧视或侮辱诽谤内容。</li>
          <li>侵犯他人知识产权、商业秘密或肖像权的内容。</li>
          <li>其他违反法律法规或公序良俗的内容。</li>
        </ul>
        <p>平台保留对 AI 输出进行内容安全检测的权利，对违规输出可拦截、过滤或记录。</p>
      </>
    ),
  },
  {
    id: "safety-check",
    title: "安全检测与人工复核",
    children: (
      <>
        <p>平台可能对 AI 输入和输出执行自动化的内容安全检测，包括但不限于敏感词过滤、风险识别和异常行为监测。</p>
        <p>部分触发风险规则的内容可能进入人工复核流程。复核期间，相关服务可能受到限制。</p>
      </>
    ),
  },
  {
    id: "quota",
    title: "服务额度与限流",
    children: (
      <>
        <p>AI 服务受用户当前套餐额度限制。免费用户仅可查看 AI 功能演示，不产生真实 AI 调用。</p>
        <p>会员用户的 AI 工具箱点数按月结算，超出额度后需次月恢复或升级套餐。平台可能根据系统负载实施限流措施。</p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "第三方模型服务",
    children: (
      <>
        <p>Link168 的 AI 能力由第三方模型服务（如阿里云百炼等）提供支持。第三方服务可能因维护、升级、网络故障或政策调整而发生中断。</p>
        <p>平台会尽力选择稳定可靠的服务提供商，但不对第三方服务的可用性、准确性或连续性作出绝对保证。</p>
      </>
    ),
  },
  {
    id: "liability",
    title: "责任归属",
    children: (
      <>
        <p>用户对 AI 服务的最终使用结果承担全部责任。因用户不当使用、误信 AI 输出或违反本说明导致的损失，由用户自行承担。</p>
        <p>在法律允许范围内，平台不对 AI 服务的间接损失、预期利益损失或第三方索赔承担责任。</p>
      </>
    ),
  },
];

export default function AiDisclaimerPage() {
  return (
    <LegalPage
      title="AI 内容使用说明与免责声明"
      englishTitle="AI Disclaimer"
      subtitle="使用 Link168 AI 服务前，请了解 AI 内容的性质和边界。"
      sections={sections}
    />
  );
}
