import fs from "node:fs";
import path from "node:path";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("AI reception customer and visitor UI closeout", () => {
  test("customer editor owns quick actions but never exposes provider controls", () => {
    const client = source("src/components/ai/ReceptionConfigClient.tsx");

    expect(client).toContain("quickActions");
    expect(client).toContain("addQuickAction");
    expect(client).toContain("removeQuickAction");
    expect(client).toContain("moveQuickAction");
    expect(client).toContain("auto_reply");
    expect(client).toContain("send_message");
    expect(client).toContain("open_url");
    expect(client).toContain("copy_text");
    expect(client).toContain("call_phone");
    expect(client).not.toContain("providerMode");
    expect(client).not.toContain("allowTransferToHuman");
    expect(client).not.toContain("转人工");
    expect(client).not.toMatch(/阿里百炼|通义千问|DeepSeek|OpenAI|Base URL|API Key|App ID|Workspace ID|Token/);
  });

  test("public chat loads safe public configuration and executes explicit quick actions", () => {
    const chat = source("src/components/share/modules/AiChatModule.tsx");

    expect(chat).toContain("ai-reception-config");
    expect(chat).toContain("handleQuickAction");
    expect(chat).toContain('action.type === "auto_reply"');
    expect(chat).toContain('action.type === "send_message"');
    expect(chat).toContain('action.type === "open_url"');
    expect(chat).toContain('action.type === "copy_text"');
    expect(chat).toContain('action.type === "call_phone"');
    expect(chat).toContain("void sendMessage(action.value)");
    expect(chat).not.toContain("transferredToHuman");
    expect(chat).not.toContain("handleTransferToHuman");
    expect(chat).not.toContain("转人工");
    expect(chat).not.toContain("reply = result.error");
    expect(chat).not.toMatch(/阿里百炼|通义千问|DeepSeek|OpenAI|qwen-|providerMode|apiKey|baseUrl/);
  });

  test("public chat reports availability and exposes the real contact handoff", () => {
    const chat = source("src/components/share/modules/AiChatModule.tsx");

    expect(chat).toContain("onAvailabilityChange?: (available: boolean) => void");
    expect(chat).toContain("onOpenContact?: () => void");
    expect(chat).toContain('aria-label="AI 咨询问题"');
    expect(chat).toContain("data-ai-reception-input={username}");
    expect(chat).toContain("联系本人");
    expect(chat).toContain("onOpenContact?.()");
  });

  test("preset replies are distinguished from model-generated replies", () => {
    const chat = source("src/components/share/modules/AiChatModule.tsx");

    expect(chat).toContain('source?: "preset" | "ai"');
    expect(chat).toContain('message.source === "preset" ? "— 预设回复" : "— AI 生成内容"');
    expect(chat).toContain('appendMessage("assistant", action.value, "preset")');
    expect(chat).toContain('appendMessage("assistant", reply, result.data.replyKind === "preset" ? "preset" : "ai")');
    expect(chat).toContain('appendMessage("system", publicErrorMessage(result.code))');
  });

  test("profile AI component controls placement only and links to the single config page", () => {
    const renderer = source("src/components/share/SharePageRenderer.tsx");
    const editor = source("src/components/dashboard-v1/LinksPanel.tsx");

    expect(renderer).toContain("onAvailabilityChange");
    expect(renderer).toContain("onOpenContact");
    expect(renderer).not.toContain("aiPayload.assistantName");
    expect(renderer).not.toContain("aiPayload.greeting");
    expect(editor).toContain("/console/ai-reception");
    expect(editor).toContain("助手名称、欢迎语、业务资料和快捷回复");
    expect(editor).not.toContain('payloadField(draft.payloadJson, "assistantName")');
    expect(editor).not.toContain('payloadField(draft.payloadJson, "greeting")');
    expect(editor).not.toContain('payloadField(draft.payloadJson, "tone")');
  });

  test("the public profile has one shared sticky action and no legacy floating assistant", () => {
    const page = source("src/components/share/SharePageWithContact.tsx");

    expect(page).toContain("PublicProfileStickyAction");
    expect(page).not.toContain("PublicAiAssistant");
    expect(fs.existsSync(path.join(process.cwd(), "src/components/share/PublicAiAssistant.tsx"))).toBe(false);
  });

  test("commercial agent uses customer recommendation switch and public-safe errors", () => {
    const agent = source("src/lib/ai/commercial-agent.ts");

    expect(agent).toContain("serviceConfig.allowProductRecommendation");
    expect(agent).toContain("AI 服务暂不可用，请稍后再试。");
    expect(agent).toContain("AI 接待暂时不可用，本次未消耗额度。");
    expect(agent).not.toContain("AI 服务尚未完成配置。");
    expect(agent).not.toContain('error: consumed.reason || "主页 AI 额度不足。"');
  });
});
