// Jeepwork AI 安全测试 API
// 提供安全测试用例执行接口
// 注意：当前使用内存存储，待数据库模型建立后应迁移到持久化存储

import { NextResponse } from "next/server";
import { requireJeepworkAdmin } from "@/lib/jeepwork-auth";
import {
  SAFETY_TEST_CASES,
  getTestCaseStats,
  getTestCasesByCategory,
  getTestCasesByAgent,
  type SafetyTestCase,
  type TestCategory,
} from "@/lib/ai/safety-tests/test-cases";

export const runtime = "nodejs";

/**
 * GET: 获取测试用例列表和统计
 * Query参数:
 *   - category: 按类别筛选 (optional)
 *   - agentType: 按Agent类型筛选 (optional)
 *   - includeStats: 是否包含统计信息 (default: true)
 */
export async function GET(request: Request) {
  const authResult = await requireJeepworkAdmin(request);
  if (authResult) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as TestCategory | null;
  const agentType = searchParams.get("agentType");
  const includeStats = searchParams.get("includeStats") !== "false";

  let testCases: SafetyTestCase[] = SAFETY_TEST_CASES;

  // 按类别筛选
  if (category) {
    testCases = getTestCasesByCategory(category);
  }

  // 按Agent类型筛选
  if (agentType) {
    testCases = getTestCasesByAgent(agentType as SafetyTestCase["agentType"]);
  }

  const response: {
    testCases: SafetyTestCase[];
    total: number;
    stats?: ReturnType<typeof getTestCaseStats>;
    message?: string;
  } = {
    testCases,
    total: testCases.length,
  };

  if (includeStats) {
    response.stats = getTestCaseStats();
  }

  // 标记数据持久化状态
  response.message = "【等待数据模型】当前测试用例存储在内存中，重启服务后数据将重置。";

  return NextResponse.json(response);
}
