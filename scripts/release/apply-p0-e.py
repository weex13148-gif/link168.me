from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1))


replace(
    "src/lib/legal/meta.ts",
    'export const SUPPORT_EMAIL: string | null = null;',
    'export const SUPPORT_EMAIL: string = "business@link168.me";',
)
replace(
    "src/app/page.tsx",
    "AI 助手自动接待、解答常见问题并引导留资，7×24 小时不漏掉任何一次商机。",
    "AI 助手自动接待、解答常见问题并引导留资，帮助及时回应咨询并减少遗漏。",
)

pricing = "src/app/pricing/page.tsx"
replace(
    pricing,
    '  const [sandboxDelay, setSandboxDelay] = useState(0);',
    '  const [sandboxDelay, setSandboxDelay] = useState(0);\n  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);',
)
replace(
    pricing,
    '    setSelectedPlan(planCode);\n    setShowPaymentModal(true);',
    '    setSelectedPlan(planCode);\n    setAcceptedLegalTerms(false);\n    setShowPaymentModal(true);',
)
replace(
    pricing,
    '  const handleCreateOrder = async () => {\n    if (!selectedPlan) return;\n\n    setOrderLoading(true);',
    '  const handleCreateOrder = async () => {\n    if (!selectedPlan) return;\n    if (!acceptedLegalTerms) {\n      setOrderResult({ error: "请先阅读并同意会员服务协议、支付与退款规则和 AI 服务说明。" });\n      return;\n    }\n\n    setOrderLoading(true);',
)
replace(
    pricing,
    '                  a: "退款政策以服务条款为准。",',
    '                  a: "具体适用条件、处理流程和到账时间请查看《支付与退款规则》。",',
)
replace(
    pricing,
    '            {orderResult?.error && (\n              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600">',
    '''            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#E8DCCB] bg-white p-4 text-xs leading-5 text-[#5F5347]">
              <input
                type="checkbox"
                checked={acceptedLegalTerms}
                onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                我已阅读并同意
                <Link href="/membership-agreement" target="_blank" className="font-black text-[#3F5F31]">《会员服务协议》</Link>、
                <Link href="/refund-policy" target="_blank" className="font-black text-[#3F5F31]">《支付与退款规则》</Link>和
                <Link href="/ai-disclaimer" target="_blank" className="font-black text-[#3F5F31]">《AI 服务说明》</Link>。
              </span>
            </label>

            {orderResult?.error && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-600">''',
)
replace(
    pricing,
    'disabled={orderLoading || pollingStatus === "polling" || pollingStatus === "success"}',
    'disabled={!acceptedLegalTerms || orderLoading || pollingStatus === "polling" || pollingStatus === "success"}',
)

membership = "src/app/workbench/membership/page.tsx"
replace(
    membership,
    'import { useCallback, useEffect, useMemo, useState } from "react";\n',
    'import { useCallback, useEffect, useMemo, useState } from "react";\nimport Link from "next/link";\n',
)
replace(
    membership,
    '  const [refundError, setRefundError] = useState("");',
    '  const [refundError, setRefundError] = useState("");\n  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);',
)
replace(
    membership,
    '    setCheckoutMessage("");\n    setActiveOrderId(null);\n    setCheckoutOpen(true);',
    '    setCheckoutMessage("");\n    setActiveOrderId(null);\n    setAcceptedLegalTerms(false);\n    setCheckoutOpen(true);',
)
replace(
    membership,
    '  async function createAlipayOrder() {\n    if (!selectedPlan || !data) return;\n    if (!data.email_verified) {',
    '  async function createAlipayOrder() {\n    if (!selectedPlan || !data) return;\n    if (!acceptedLegalTerms) {\n      setCheckoutError("请先阅读并同意会员服务协议、支付与退款规则和 AI 服务说明。");\n      return;\n    }\n    if (!data.email_verified) {',
)
replace(
    membership,
    '            {checkoutError ? (\n              <p className="mt-4 rounded-2xl bg-[#FFF1F0] p-4 text-sm font-bold text-[#B42318]">',
    '''            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[#E8DCCB] bg-white p-4 text-xs leading-5 ui-muted">
              <input
                type="checkbox"
                checked={acceptedLegalTerms}
                onChange={(event) => setAcceptedLegalTerms(event.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                我已阅读并同意
                <Link href="/membership-agreement" target="_blank" className="font-black text-[#355126]">《会员服务协议》</Link>、
                <Link href="/refund-policy" target="_blank" className="font-black text-[#355126]">《支付与退款规则》</Link>和
                <Link href="/ai-disclaimer" target="_blank" className="font-black text-[#355126]">《AI 服务说明》</Link>。
              </span>
            </label>

            {checkoutError ? (
              <p className="mt-4 rounded-2xl bg-[#FFF1F0] p-4 text-sm font-bold text-[#B42318]">''',
)
replace(
    membership,
    'disabled={submitting || Boolean(activeOrderId)}',
    'disabled={!acceptedLegalTerms || submitting || Boolean(activeOrderId)}',
)
