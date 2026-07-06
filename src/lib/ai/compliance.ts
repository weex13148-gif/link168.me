export const AI_GENERATED_MARKER = "【内容由人工智能生成，仅供参考】";

export const AI_DISCLAIMER =
  "以上内容由人工智能自动生成，可能存在误差或不完整之处，不构成任何专业建议或承诺。如有疑问，请联系相关专业人士或人工客服核实。";

export function addAiDisclaimer(content: string): string {
  if (!content) return content;
  const trimmed = content.trimEnd();
  if (trimmed.startsWith(AI_GENERATED_MARKER)) {
    return content;
  }
  return `${AI_GENERATED_MARKER}\n\n${trimmed}\n\n${AI_DISCLAIMER}`;
}

export function stripAiDisclaimer(content: string): string {
  if (!content) return content;
  let result = content;
  if (result.startsWith(AI_GENERATED_MARKER)) {
    result = result.slice(AI_GENERATED_MARKER.length).trimStart();
    if (result.startsWith("\n")) result = result.slice(1);
  }
  if (result.endsWith(AI_DISCLAIMER)) {
    result = result.slice(0, -AI_DISCLAIMER.length).trimEnd();
    if (result.endsWith("\n")) result = result.slice(0, -1);
  }
  return result;
}
