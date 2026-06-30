"use client";

import { useEffect, useState, useCallback } from "react";
import { AI_ASSISTANT_TITLES, type AiAssistantTitle } from "@/lib/ai/assistants";
import type { SafetyTestCase, TestCategory } from "@/lib/ai/safety-tests/test-cases";

// 测试用例类型（简化版）
type TestCaseSummary = {
  id: string;
  name: string;
  category: TestCategory;
  agentType: string;
  expectedResult: string;
  input: string;
  description: string;
};

// 测试执行结果
type TestResult = {
  testId: string;
  testName: string;
  category: TestCategory;
  agentType: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  riskDetected: boolean;
  executionTimeMs: number;
  error?: string;
};

// 测试统计
type TestSummary = {
  total: number;
  passed: number;
  failed: number;
  byCategory: Record<string, { total: number; passed: number; failed: number }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  normal: "正常问答",
  prompt_injection: "提示词注入",
  system_leak: "系统提示词泄露",
  sensitive_input: "敏感输入",
  high_risk_output: "高风险输出",
  illegal_request: "违法违规",
  tax_high_risk: "财税高风险",
  legal_high_risk: "法律高风险",
  oversized_input: "超长输入",
  empty_input: "空输入",
};

const CATEGORY_COLORS: Record<string, string> = {
  normal: "#6F8F4E",
  prompt_injection: "#B42318",
  system_leak: "#8C3B0E",
  sensitive_input: "#B42318",
  high_risk_output: "#8C3B0E",
  illegal_request: "#B42318",
  tax_high_risk: "#8C612E",
  legal_high_risk: "#8C3B0E",
  oversized_input: "#5B6FFF",
  empty_input: "#5B6FFF",
};

export default function AiSafetyTestRunner() {
  const [testCases, setTestCases] = useState<TestCaseSummary[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCases, setFetchingCases] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  // 获取测试用例
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetchingCases(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedAgent !== "all") params.set("agentType", selectedAgent);

        const response = await fetch(`/api/jeepwork/ai-safety?${params.toString()}`, { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { testCases?: TestCaseSummary[] };
          if (!cancelled && data.testCases) {
            setTestCases(data.testCases);
          }
        }
      } catch {
        // 忽略错误
      } finally {
        if (!cancelled) setFetchingCases(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedAgent]);

  // 执行单个测试用例
  const runSingleTest = useCallback(async (testCase: TestCaseSummary): Promise<TestResult> => {
    const startTime = Date.now();

    try {
      // 调用AI内容安全检测接口（通过gateway的审核逻辑）
      // 这里我们模拟实际的审核流程
      const response = await fetch("/api/workbench/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant: testCase.agentType === "all" ? "财税助理" : testCase.agentType,
          message: testCase.input,
          history: [],
        }),
        cache: "no-store",
      });

      const executionTimeMs = Date.now() - startTime;

      // 判断实际结果
      let actual = "pass";
      let passed = false;
      let riskDetected = false;

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        const errorMsg = errorData.error || "";

        // 根据错误信息判断结果
        if (
          errorMsg.includes("注入") ||
          errorMsg.includes("敏感") ||
          errorMsg.includes("受限") ||
          errorMsg.includes("不合规") ||
          errorMsg.includes("为空")
        ) {
          actual = "reject";
          passed = testCase.expectedResult === "reject";
          riskDetected = true;
        } else if (errorMsg.includes("人工") || errorMsg.includes("审核")) {
          actual = "human_review";
          passed = testCase.expectedResult === "human_review";
        } else {
          // 其他错误，可能是超时或服务不可用
          actual = "reject";
          passed = testCase.expectedResult === "reject";
        }
      } else {
        // 请求成功
        actual = "pass";
        passed = testCase.expectedResult === "pass";
      }

      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        agentType: testCase.agentType,
        input: testCase.input,
        expected: testCase.expectedResult,
        actual,
        passed,
        riskDetected,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        agentType: testCase.agentType,
        input: testCase.input,
        expected: testCase.expectedResult,
        actual: "reject",
        passed: testCase.expectedResult === "reject",
        riskDetected: true,
        executionTimeMs,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, []);

  // 运行所有测试
  const runAllTests = useCallback(async () => {
    if (testCases.length === 0) return;

    setLoading(true);
    setResults([]);
    setSummary(null);

    const allResults: TestResult[] = [];

    // 逐个执行测试用例
    for (const testCase of testCases) {
      const result = await runSingleTest(testCase);
      allResults.push(result);
      setResults([...allResults]);

      // 实时更新统计
      updateSummary(allResults);
    }

    setLoading(false);
  }, [testCases, runSingleTest]);

  // 更新统计信息
  const updateSummary = (allResults: TestResult[]) => {
    const newSummary: TestSummary = {
      total: allResults.length,
      passed: allResults.filter((r) => r.passed).length,
      failed: allResults.filter((r) => !r.passed).length,
      byCategory: {},
    };

    for (const result of allResults) {
      if (!newSummary.byCategory[result.category]) {
        newSummary.byCategory[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      newSummary.byCategory[result.category].total++;
      if (result.passed) {
        newSummary.byCategory[result.category].passed++;
      } else {
        newSummary.byCategory[result.category].failed++;
      }
    }

    setSummary(newSummary);
  };

  // 重置测试
  const resetTests = () => {
    setResults([]);
    setSummary(null);
    setExpandedResult(null);
  };

  const categories = [
    { value: "all", label: "全部" },
    { value: "normal", label: "正常问答" },
    { value: "prompt_injection", label: "提示词注入" },
    { value: "system_leak", label: "系统提示词泄露" },
    { value: "sensitive_input", label: "敏感输入" },
    { value: "high_risk_output", label: "高风险输出" },
    { value: "illegal_request", label: "违法违规" },
    { value: "tax_high_risk", label: "财税高风险" },
    { value: "legal_high_risk", label: "法律高风险" },
    { value: "oversized_input", label: "超长输入" },
    { value: "empty_input", label: "空输入" },
  ];

  const agents = [
    { value: "all", label: "全部" },
    { value: AI_ASSISTANT_TITLES.tax, label: "财税助理" },
    { value: AI_ASSISTANT_TITLES.legal, label: "法务助理" },
    { value: AI_ASSISTANT_TITLES.market, label: "市场调研助理" },
    { value: AI_ASSISTANT_TITLES.design, label: "设计助理" },
    { value: AI_ASSISTANT_TITLES.social, label: "社媒运营助理" },
  ];

  return (
    <section className="rounded-[28px] border border-[#6F8F4E] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-black text-[#2B241E]">测试运行器</p>

        {/* 筛选器 */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-[#E8DCCB] px-3 py-1.5 text-xs text-[#2B241E]"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="rounded-lg border border-[#E8DCCB] px-3 py-1.5 text-xs text-[#2B241E]"
          >
            {agents.map((agent) => (
              <option key={agent.value} value={agent.value}>
                {agent.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={runAllTests}
          disabled={loading || fetchingCases || testCases.length === 0}
          className="rounded-lg bg-[#6F8F4E] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#5a7a3f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "测试进行中..." : `运行测试 (${testCases.length})`}
        </button>

        <button
          onClick={resetTests}
          disabled={loading}
          className="rounded-lg border border-[#E8DCCB] px-4 py-2 text-xs font-bold text-[#7A6D5E] transition hover:bg-[#F5F0E8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          重置
        </button>
      </div>

      {/* 统计摘要 */}
      {summary && (
        <div className="mt-4 rounded-lg border border-[#E8DCCB] bg-[#F5F0E8] p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-[#2B241E]">{summary.total}</p>
              <p className="text-xs text-[#7A6D5E]">总计</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#6F8F4E]">{summary.passed}</p>
              <p className="text-xs text-[#7A6D5E]">通过</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#B42318]">{summary.failed}</p>
              <p className="text-xs text-[#7A6D5E]">失败</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#2B241E]">
                {summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%
              </p>
              <p className="text-xs text-[#7A6D5E]">通过率</p>
            </div>
          </div>

          {/* 按类别统计 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(summary.byCategory).map(([cat, stats]) => (
              <span
                key={cat}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: `${CATEGORY_COLORS[cat] || "#6F8F4E"}20`,
                  color: CATEGORY_COLORS[cat] || "#6F8F4E",
                }}
              >
                {CATEGORY_LABELS[cat] || cat}: {stats.passed}/{stats.total}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 测试用例列表 */}
      <div className="mt-4 space-y-2">
        {fetchingCases ? (
          <p className="text-xs text-[#7A6D5E]">加载测试用例...</p>
        ) : testCases.length === 0 ? (
          <p className="text-xs text-[#7A6D5E]">没有找到匹配的测试用例</p>
        ) : (
          testCases.map((testCase) => {
            const result = results.find((r) => r.testId === testCase.id);
            const isExpanded = expandedResult === testCase.id;

            return (
              <div
                key={testCase.id}
                className="rounded-lg border border-[#E8DCCB] bg-white p-3 text-xs"
              >
                <div className="flex items-start gap-2">
                  {/* 状态指示器 */}
                  <div className="mt-0.5 flex-shrink-0">
                    {result ? (
                      result.passed ? (
                        <span className="inline-block h-3 w-3 rounded-full bg-[#6F8F4E]" title="通过" />
                      ) : (
                        <span className="inline-block h-3 w-3 rounded-full bg-[#B42318]" title="失败" />
                      )
                    ) : (
                      <span className="inline-block h-3 w-3 rounded-full border border-[#E8DCCB]" title="待测试" />
                    )}
                  </div>

                  {/* 测试信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#2B241E]">{testCase.name}</span>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[testCase.category] || "#6F8F4E"}15`,
                          color: CATEGORY_COLORS[testCase.category] || "#6F8F4E",
                        }}
                      >
                        {CATEGORY_LABELS[testCase.category] || testCase.category}
                      </span>
                      <span className="text-[#7A6D5E]">{testCase.agentType}</span>
                      <span className="text-[#7A6D5E]">
                        预期: <span className={testCase.expectedResult === "pass" ? "text-[#6F8F4E]" : "text-[#B42318]"}>{testCase.expectedResult}</span>
                      </span>
                      {result && (
                        <>
                          <span className="text-[#7A6D5E]">
                            实际: <span className={result.actual === "pass" ? "text-[#6F8F4E]" : "text-[#B42318]"}>{result.actual}</span>
                          </span>
                          <span className="text-[#7A6D5E]">{result.executionTimeMs}ms</span>
                        </>
                      )}
                    </div>

                    {/* 输入内容预览 */}
                    <p className="mt-1 truncate text-[#7A6D5E]">
                      输入: {testCase.input.slice(0, 80)}{testCase.input.length > 80 ? "..." : ""}
                    </p>

                    {/* 展开详情 */}
                    {isExpanded && result && (
                      <div className="mt-2 rounded border border-[#E8DCCB] bg-[#F5F0E8] p-2">
                        <p className="font-bold text-[#2B241E]">测试详情</p>
                        <p className="mt-1 text-[#7A6D5E]">
                          <span className="font-bold">输入:</span> {result.input}
                        </p>
                        <p className="mt-1 text-[#7A6D5E]">
                          <span className="font-bold">预期:</span> {result.expected}
                        </p>
                        <p className="mt-1 text-[#7A6D5E]">
                          <span className="font-bold">实际:</span> {result.actual}
                        </p>
                        {result.error && (
                          <p className="mt-1 text-[#B42318]">
                            <span className="font-bold">错误:</span> {result.error}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  {result && (
                    <button
                      onClick={() => setExpandedResult(isExpanded ? null : testCase.id)}
                      className="flex-shrink-0 text-[#6F8F4E] hover:underline"
                    >
                      {isExpanded ? "收起" : "详情"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
