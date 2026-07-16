from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1))


commercial = "src/lib/ai/commercial-agent.ts"
replace(
    commercial,
    'import { logAiRiskEvent } from "@/lib/ai/risk-log";\n',
    'import { logAiRiskEvent } from "@/lib/ai/risk-log";\nimport { classifyAiBusinessRisk } from "@/lib/ai/business-risk";\n',
)
replace(
    commercial,
    '    reply: string;\n    conversationId: string;',
    '    reply: string;\n    replyKind: "ai" | "preset";\n    conversationId: string;',
)
replace(
    commercial,
    '        reply: "",\n        conversationId: "",',
    '        reply: "",\n        replyKind: "preset",\n        conversationId: "",',
)

provider = (
    '  const resolved = resolveEnterpriseBailianConfig(platformConfig);\n'
    '  if (!isBailianApplicationConfigured(resolved)) {\n'
    '    return { success: false, status: 503, error: "AI 服务暂不可用，请稍后再试。", code: "AI_NOT_CONFIGURED", traceId: traceCtx.traceId };\n'
    '  }\n\n'
)
target = Path(commercial)
source = target.read_text()
if provider in source:
    target.write_text(source.replace(provider, "", 1))

risk_block = '''

  const businessRisk = classifyAiBusinessRisk(message);
  if (businessRisk.level !== 1) {
    if (businessRisk.level >= 3) {
      await logAiRiskEvent({
        userId: profile.user.id,
        eventType: "manual_review",
        assistant: kind,
        riskLevel: businessRisk.riskLevel,
        metadata: {
          category: businessRisk.code,
          traceId: traceCtx.traceId,
          source: "commercial-agent-business-risk",
        },
      });
    }

    const privacyNotice = buildPrivacyNoticeFromConfig({
      collectLead: serviceConfig.collectLead,
      allowReport: serviceConfig.allowReport,
      allowTransferToHuman: false,
      privacyNoticeText: serviceConfig.privacyNoticeText,
    });

    return {
      success: true,
      status: 200,
      traceId: traceCtx.traceId,
      data: {
        agent: kind,
        reply: businessRisk.reply,
        replyKind: "preset",
        conversationId: "",
        visitorSessionId,
        action: businessRisk.level === 3
          ? { type: "contact", label: "联系确认" }
          : { type: "reply" },
        leadCaptured: false,
        creditBalance: guard.entitlements.limits.aiChatsPerMonth.remaining,
        privacyNotice,
        collectLeadEnabled: serviceConfig.collectLead,
        transferToHumanEnabled: false,
        allowReportEnabled: serviceConfig.allowReport,
      },
    };
  }

  const resolved = resolveEnterpriseBailianConfig(platformConfig);
  if (!isBailianApplicationConfigured(resolved)) {
    return { success: false, status: 503, error: "AI 服务暂不可用，请稍后再试。", code: "AI_NOT_CONFIGURED", traceId: traceCtx.traceId };
  }
'''
replace(
    commercial,
    '    return { success: false, status: 400, error: "问题包含平台限制内容，请修改后重试。", code: "SENSITIVE_CONTENT", traceId: traceCtx.traceId };\n  }\n\n  const requestedConversationId',
    '    return { success: false, status: 400, error: "问题包含平台限制内容，请修改后重试。", code: "SENSITIVE_CONTENT", traceId: traceCtx.traceId };\n  }'
    + risk_block
    + '\n  const requestedConversationId',
)
replace(
    commercial,
    '      reply,\n      conversationId: conversation.id,',
    '      reply,\n      replyKind: "ai",\n      conversationId: conversation.id,',
)
replace(
    "src/components/share/modules/AiChatModule.tsx",
    '  data?: { reply?: string };',
    '  data?: { reply?: string; replyKind?: "ai" | "preset" };',
)
replace(
    "src/components/share/modules/AiChatModule.tsx",
    '        appendMessage("assistant", reply, "ai");',
    '        appendMessage("assistant", reply, result.data.replyKind === "preset" ? "preset" : "ai");',
)
replace(
    "tests/ai-reception-ui-closeout.test.ts",
    '    expect(chat).toContain(\'appendMessage("assistant", reply, "ai")\');',
    '    expect(chat).toContain(\'appendMessage("assistant", reply, result.data.replyKind === "preset" ? "preset" : "ai")\');',
)
