import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { COMPANY_NAME, LEGAL_EFFECTIVE_DATE, PUBLIC_PLANS, formatPriceYuan } from "@/lib/legal/meta";

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "协议适用范围",
    children: (
      <>
        <p>本《Link168 会员服务协议》（以下简称"本协议"）是用户与 {COMPANY_NAME}（以下简称"平台"）之间就 Link168 会员服务相关事宜达成的协议。</p>
        <p>本协议作为《Link168 用户协议》的补充，与用户协议具有同等效力。用户购买会员服务，即视为已阅读、理解并同意本协议全部内容。</p>
      </>
    ),
  },
  {
    id: "plans",
    title: "会员套餐",
    children: (
      <>
        <p>Link168 当前提供以下会员套餐，具体以购买时订单页面展示为准：</p>
        <ul>
          {PUBLIC_PLANS.map((plan) => (
            <li key={plan.code}>
              <strong>{plan.name}</strong>
              {plan.contactSales ? "：联系销售" : `：${formatPriceYuan(plan.priceYearlyCents)}`}
              {plan.aiChatsPerMonth >= 0 ? `，AI 工具箱点数 ${plan.aiChatsPerMonth === 0 ? "0" : plan.aiChatsPerMonth.toLocaleString()} / 月` : "，AI 工具箱点数不限"}
            </li>
          ))}
        </ul>
        <p>平台可能根据运营需要调整套餐内容、价格或权益，调整不影响已购买且在服务期内的订单权益。新价格生效前，平台将通过合理方式通知。</p>
        <p>具体价格、服务期限和权益以用户购买时的订单页面为准。</p>
      </>
    ),
  },
  {
    id: "entitlements",
    title: "套餐权益",
    children: (
      <>
        <p>各套餐对应的核心权益如下，具体以购买时页面展示为准：</p>
        <ul>
          <li><strong>免费版</strong>：1 个公开主页、基础主题、基础访问数据、AI 功能演示（不产生真实调用）。</li>
          <li><strong>Plus 会员</strong>：1 个公开主页、隐藏 Link168 品牌标识、90 天访问数据、产品数量 10 个、知识库 3 篇、AI 工具箱 300 点/月。</li>
          <li><strong>Pro 年付</strong>：1 个公开主页、隐藏品牌标识、客户线索收集、高级数据统计与导出、产品数量 50 个、知识库 20 篇、AI 工具箱 2000 点/月、优先客服。</li>
          <li><strong>企业版</strong>：团队席位 3 个、独立域名绑定（以实际实现为准）、品牌主题定制、产品数量 200 个、知识库 100 篇、AI 工具箱 10000 点/月、专属客户经理。需联系销售洽谈。</li>
        </ul>
        <p>AI 工具箱点数按月结算，未用完的点数不累计至下月。额度耗尽后，用户可次月恢复或升级套餐。</p>
      </>
    ),
  },
  {
    id: "purchase",
    title: "购买与生效",
    children: (
      <>
        <p>用户通过 Link168 支付页面选择套餐并完成支付后，会员权益将在支付成功后立即生效。</p>
        <p>订单状态以系统记录为准。支付成功后，用户可在工作台查看当前套餐、有效期和权益使用情况。</p>
        <p>当前系统仅支持年付。月付功能如后续上线，将另行说明。</p>
      </>
    ),
  },
  {
    id: "renewal",
    title: "续费与到期",
    children: (
      <>
        <p>会员服务到期前，用户可主动续费以延续权益。当前系统不支持自动续费扣款，到期后不会自动扣款。</p>
        <p>会员到期后，平台提供 3 天宽限期，宽限期内用户仍可保留会员权益。宽限期结束后，套餐将自动降级为免费版，相应权益将被收回。</p>
        <p>降级后，超出免费版权益限制的内容（如产品数量、知识库文档等）可能无法继续编辑或新增，但历史数据不会被删除。</p>
      </>
    ),
  },
  {
    id: "upgrade",
    title: "升级与降级",
    children: (
      <>
        <p>用户可在会员有效期内升级至更高等级套餐。升级后，新套餐权益通常即时生效，服务周期按剩余天数折算或顺延，具体以升级时页面说明为准。</p>
        <p>降级在当前周期内一般不支持即时生效，用户可在当前周期结束后选择不续费，到期自动降级为免费版。</p>
        <p>套餐迁移历史记录可在订单管理中查看。</p>
      </>
    ),
  },
  {
    id: "refund-impact",
    title: "退款与权益回收",
    children: (
      <>
        <p>用户申请退款后，平台将根据退款审核结果处理。退款规则详见<Link href="/refund-policy">《支付与退款规则》</Link>。</p>
        <p>全额退款成功后，对应会员权益将被收回，套餐降级为免费版。部分退款可能按比例回收权益。</p>
        <p>退款到账时间以支付机构实际处理结果为准。</p>
      </>
    ),
  },
  {
    id: "invoice",
    title: "发票与凭证",
    children: (
      <>
        <p>用户如需发票或其他财务凭证，可通过客服渠道联系平台申请。平台将在核实订单信息后，按相关法律法规和财务流程处理。</p>
        <p>发票开具周期、类型和邮寄方式以实际沟通结果为准。</p>
      </>
    ),
  },
  {
    id: "restrictions",
    title: "使用限制",
    children: (
      <>
        <p>会员账号仅限购买者本人或本企业使用，禁止转售、出租、借用或共享账号。</p>
        <p>禁止利用会员权益从事违法违规活动，包括但不限于：发布违规内容、滥用 AI 生成违法信息、攻击平台、绕过权限限制等。</p>
        <p>平台有权对异常使用行为进行核查，必要时暂停或终止会员权益。</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "协议更新",
    children: (
      <>
        <p>平台可根据业务需要、法律法规或监管要求对本协议进行更新。更新后将在页面显著位置提示，用户继续使用会员服务即视为接受更新后的协议。</p>
        <p>本协议版本：v1.0，生效日期：{LEGAL_EFFECTIVE_DATE}。</p>
      </>
    ),
  },
];

export default function MembershipAgreementPage() {
  return (
    <LegalPage
      title="会员服务协议"
      englishTitle="Membership Agreement"
      subtitle="购买和使用 Link168 会员服务前，请仔细阅读本协议。"
      sections={sections}
    />
  );
}
