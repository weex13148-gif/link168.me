import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { COMPANY_NAME, LEGAL_EFFECTIVE_DATE, PAYMENT_CHANNELS } from "@/lib/legal/meta";

const sections: LegalSection[] = [
  {
    id: "channels",
    title: "支付渠道",
    children: (
      <>
        <p>Link168 当前支持的支付渠道为：{PAYMENT_CHANNELS.join("、")}。</p>
        <p>支付过程中的敏感信息（如支付密码、银行卡号）由支付机构直接处理，平台不保存完整支付敏感信息。</p>
      </>
    ),
  },
  {
    id: "order-lifecycle",
    title: "订单生成与有效期",
    children: (
      <>
        <p>用户选择套餐并确认支付后，系统生成订单。订单有效期以页面提示为准，过期未支付订单将自动关闭。</p>
        <p>订单状态包括：待支付（pending）、支付处理中（processing）、已支付（paid）、支付失败（failed）、已关闭（closed）等。</p>
      </>
    ),
  },
  {
    id: "payment-confirm",
    title: "支付结果确认",
    children: (
      <>
        <p>支付结果以支付机构（如支付宝）的正式回调和平台系统记录为准。前端页面显示成功不代表支付最终完成，可能存在网络延迟或回调异常。</p>
        <p>如支付后订单状态未及时更新，请耐心等待 1-3 分钟，或联系客服核实。</p>
      </>
    ),
  },
  {
    id: "duplicate",
    title: "重复支付处理",
    children: (
      <>
        <p>如因网络异常导致同一订单重复支付，平台核实后将通过原支付渠道退回多付金额。</p>
        <p>请勿对同一订单多次发起支付，以免产生不必要的退款流程。</p>
      </>
    ),
  },
  {
    id: "refund-apply",
    title: "退款申请",
    children: (
      <>
        <p>用户可在满足条件的情况下申请退款。退款申请需提供订单号和退款原因。</p>
        <p>以下情况可能不支持退款：</p>
        <ul>
          <li>订单已超出退款申请期限。</li>
          <li>会员权益已大量消耗或使用。</li>
          <li>存在违规使用、滥用或欺诈行为。</li>
          <li>法律法规或平台规则规定的其他情形。</li>
        </ul>
      </>
    ),
  },
  {
    id: "refund-process",
    title: "退款处理",
    children: (
      <>
        <p>退款申请提交后，平台将进行审核。审核通过后，退款将原路退回至用户支付账户。</p>
        <p>退款处理可能需要一定时间，退款到账时间以支付机构实际处理结果为准。</p>
        <p>退款状态包括：退款处理中（refund_processing）、已退款（refunded）、部分退款（partially_refunded）、退款失败（refund_failed）。</p>
      </>
    ),
  },
  {
    id: "partial-refund",
    title: "部分退款",
    children: (
      <>
        <p>部分退款按实际支付金额和消耗情况计算可退金额。部分退款成功后，对应会员权益可能按比例回收。</p>
        <p>具体可退金额以平台审核结果为准。</p>
      </>
    ),
  },
  {
    id: "refund-failure",
    title: "退款失败",
    children: (
      <>
        <p>退款失败可能由以下原因导致：支付账户异常、支付渠道限制、原支付通道已关闭等。</p>
        <p>退款失败后，用户可联系客服提供替代收款方式或协商其他处理方案。</p>
      </>
    ),
  },
  {
    id: "rights-recovery",
    title: "权益回收",
    children: (
      <>
        <p>全额退款成功后，对应会员订阅将被取消，套餐降级为免费版，相关权益将被收回。</p>
        <p>降级后，超出免费版限制的内容可能无法继续编辑或新增，但历史数据不会被删除。</p>
      </>
    ),
  },
  {
    id: "contact",
    title: "异常订单处理",
    children: (
      <>
        <p>如遇订单异常、支付争议或退款问题，用户可通过<Link href="/contact">联系客服</Link>提交订单号和问题说明，平台将在核实后协助处理。</p>
        <p>平台不对支付渠道自身的技术故障、网络中断或政策调整承担责任，但会尽力协助用户沟通解决。</p>
      </>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="支付与退款规则"
      englishTitle="Payment & Refund Policy"
      subtitle="了解 Link168 的订单、支付和退款处理方式。"
      sections={sections}
    />
  );
}
