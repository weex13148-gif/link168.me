#!/usr/bin/env node
/**
 * 阿里云百炼（通义千问）API 调试脚本
 * 
 * 使用方式：
 *   node bailian-test.js
 * 
 * 环境变量：
 *   AI_API_KEY      - API Key（支持阿里云百炼、OpenAI 兼容接口）
 *   AI_BASE_URL     - API 基础 URL（默认：https://dashscope.aliyuncs.com/compatible-mode/v1）
 *   AI_MODEL        - 模型名称（默认：qwen-plus）
 *   TEST_TIMEOUT_MS - 超时时间（默认：30000ms）
 * 
 * 注意：
 *   - 脚本不会保存完整 API Key，仅显示前4位和后4位
 *   - 脚本输出结构化测试结果
 */

import { fetch } from "undici";
import { assertLocalTestOnly } from "./production-guard.mjs";

assertLocalTestOnly("scripts/ai-test/bailian-test.js");

// ---------- 配置读取 ----------

function maskKey(key) {
  if (!key || key.length < 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

const API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
const BASE_URL = (process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL || "qwen-plus";
const TIMEOUT_MS = parseInt(process.env.TEST_TIMEOUT_MS || "30000", 10);
const ENDPOINT = `${BASE_URL}/chat/completions`;

// ---------- 测试结果类型 ----------

const TestStatus = {
  PASS: "PASS",
  FAIL: "FAIL",
  SKIP: "SKIP",
  ERROR: "ERROR",
};

/**
 * @typedef {Object} TestResult
 * @property {string} name - 测试名称
 * @property {string} status - PASS | FAIL | SKIP | ERROR
 * @property {string} description - 测试描述
 * @property {number} [durationMs] - 耗时（毫秒）
 * @property {number} [httpStatus] - HTTP 状态码
 * @property {string} [errorCode] - 错误码
 * @property {string} [errorMessage] - 错误信息
 * @property {object} [metadata] - 额外元数据
 */

// ---------- 辅助函数 ----------

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chatCompletion(messages, options = {}) {
  const controller = new AbortController();
  const timeout = options.timeoutMs || TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  const startTime = Date.now();
  let httpStatus = null;
  let errorMessage = null;
  let errorCode = null;
  let responseData = null;

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey || API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model || MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 1024,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    httpStatus = response.status;
    const text = await response.text();

    if (!response.ok) {
      try {
        const errData = JSON.parse(text);
        errorMessage = errData.error?.message || text.slice(0, 200);
        errorCode = errData.error?.code || String(httpStatus);
      } catch {
        errorMessage = text.slice(0, 200);
        errorCode = String(httpStatus);
      }
      return {
        ok: false,
        httpStatus,
        errorMessage,
        errorCode,
        durationMs: Date.now() - startTime,
        responseData: null,
      };
    }

    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = { raw: text };
    }

    return {
      ok: true,
      httpStatus,
      errorMessage: null,
      errorCode: null,
      durationMs: Date.now() - startTime,
      responseData,
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("aborted") || message.includes("timeout")) {
      errorCode = "TIMEOUT";
      errorMessage = `请求超时（${timeout}ms）`;
    } else {
      errorCode = "NETWORK_ERROR";
      errorMessage = message;
    }
    return {
      ok: false,
      httpStatus: null,
      errorMessage,
      errorCode,
      durationMs: Date.now() - startTime,
      responseData: null,
    };
  }
}

// ---------- 测试用例 ----------

/**
 * 1. 正常调用测试
 */
async function testNormalCall() {
  const messages = [
    { role: "system", content: "你是财税助理。" },
    { role: "user", content: "小规模纳税人和一般纳税人的主要区别是什么？" },
  ];

  const result = await chatCompletion(messages);

  return {
    name: "正常调用测试",
    description: `使用有效 API Key 调用 ${MODEL}，询问简单财税问题`,
    status: result.ok ? TestStatus.PASS : TestStatus.FAIL,
    durationMs: result.durationMs,
    httpStatus: result.httpStatus,
    errorMessage: result.errorMessage,
    errorCode: result.errorCode,
    metadata: {
      maskedApiKey: maskKey(API_KEY),
      model: MODEL,
      responseLength: result.responseData?.choices?.[0]?.message?.content?.length ?? 0,
    },
  };
}

/**
 * 2. 错误 Key 测试
 */
async function testWrongKey() {
  const wrongKey = "placeholder-invalid-api-key";
  const messages = [
    { role: "user", content: "测试错误 Key" },
  ];

  const result = await chatCompletion(messages, { apiKey: wrongKey });

  // 预期：401 错误
  const isExpected = result.httpStatus === 401;

  return {
    name: "错误 Key 测试",
    description: "使用格式正确但无效的 API Key，预期返回 401",
    status: isExpected ? TestStatus.PASS : TestStatus.FAIL,
    durationMs: result.durationMs,
    httpStatus: result.httpStatus,
    errorMessage: result.errorMessage,
    errorCode: result.errorCode,
    metadata: {
      expectedHttpStatus: 401,
    },
  };
}

/**
 * 3. 错误模型测试
 */
async function testWrongModel() {
  const messages = [
    { role: "user", content: "测试错误模型" },
  ];

  const result = await chatCompletion(messages, { model: "non-existent-model-xyz" });

  // 预期：404 或 400 错误
  const isExpected = result.httpStatus === 404 || result.httpStatus === 400;

  return {
    name: "错误模型测试",
    description: "请求不存在的模型，预期返回 404 或 400",
    status: isExpected ? TestStatus.PASS : TestStatus.FAIL,
    durationMs: result.durationMs,
    httpStatus: result.httpStatus,
    errorMessage: result.errorMessage,
    errorCode: result.errorCode,
    metadata: {
      wrongModel: "non-existent-model-xyz",
    },
  };
}

/**
 * 4. 超时测试
 */
async function testTimeout() {
  // 故意使用很短的超时时间来触发超时
  const messages = [
    { role: "user", content: "写一篇关于宇宙的详细介绍，越长越好" },
  ];

  const result = await chatCompletion(messages, { timeoutMs: 1000 });

  const isExpected = result.errorCode === "TIMEOUT";

  return {
    name: "超时测试",
    description: "设置极短超时（1s），预期触发超时错误",
    status: isExpected ? TestStatus.PASS : TestStatus.FAIL,
    durationMs: result.durationMs,
    httpStatus: result.httpStatus,
    errorMessage: result.errorMessage,
    errorCode: result.errorCode,
    metadata: {
      timeoutSetting: 1000,
    },
  };
}

/**
 * 5. 连续请求测试
 */
async function testConsecutiveRequests() {
  const messages = [
    { role: "system", content: "你是财税助理。" },
    { role: "user", content: "请问企业所得税的税率是多少？" },
  ];

  const results = [];
  const numRequests = 3;

  for (let i = 0; i < numRequests; i++) {
    const result = await chatCompletion(messages);
    results.push({
      index: i + 1,
      ok: result.ok,
      durationMs: result.durationMs,
      httpStatus: result.httpStatus,
    });
    if (i < numRequests - 1) {
      await sleep(500); // 500ms 间隔
    }
  }

  const allSuccess = results.every((r) => r.ok);
  const avgDuration = results.reduce((sum, r) => sum + (r.durationMs || 0), 0) / results.length;

  return {
    name: "连续请求测试",
    description: `连续发送 ${numRequests} 个请求，验证服务稳定性`,
    status: allSuccess ? TestStatus.PASS : TestStatus.FAIL,
    durationMs: avgDuration,
    metadata: {
      requestCount: numRequests,
      results,
    },
  };
}

/**
 * 6. 非白名单请求测试（模拟）
 * 注意：此测试实际测试的是 API 返回的错误，
 * 真实的白名单限制需要服务端配合
 */
async function testNonWhitelistScenario() {
  // 模拟一个被风控拦截的场景
  // 这里我们测试发送异常频繁的请求来触发风控
  const messages = [
    { role: "user", content: "测试风控" },
  ];

  const results = [];
  const numRequests = 10;

  // 快速连续发送请求，尝试触发 429 限流
  for (let i = 0; i < numRequests; i++) {
    const result = await chatCompletion(messages);
    results.push({
      index: i + 1,
      ok: result.ok,
      httpStatus: result.httpStatus,
      errorCode: result.errorCode,
    });
    await sleep(100); // 100ms 间隔
  }

  const has429 = results.some((r) => r.httpStatus === 429);
  const hasRateLimitError = results.some((r) => r.errorCode === "RATE_LIMITED" || r.errorCode === "429");

  return {
    name: "非白名单/风控测试",
    description: "快速连续发送请求，测试风控限流机制",
    status: TestStatus.SKIP, // 暂时跳过，因为可能影响其他测试
    durationMs: 0,
    metadata: {
      requestCount: numRequests,
      triggered429: has429,
      triggeredRateLimit: hasRateLimitError,
      note: "此测试可能触发真实限流，建议在测试环境运行",
    },
  };
}

// ---------- 主测试流程 ----------

async function runTests() {
  console.log("=".repeat(60));
  console.log("阿里云百炼 API 调试测试");
  console.log("=".repeat(60));
  console.log(`API URL: ${ENDPOINT}`);
  console.log(`Model: ${MODEL}`);
  console.log(`API Key: ${maskKey(API_KEY) || "(未设置)"}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);
  console.log("=".repeat(60));

  if (!API_KEY) {
    console.warn("\n⚠️  警告：未设置 AI_API_KEY 环境变量，部分测试将被跳过\n");
  }

  const tests = [
    {
      name: "正常调用测试",
      fn: testNormalCall,
      enabled: Boolean(API_KEY),
    },
    {
      name: "错误 Key 测试",
      fn: testWrongKey,
      enabled: true, // 即使没有 API_KEY 也测试
    },
    {
      name: "错误模型测试",
      fn: testWrongModel,
      enabled: Boolean(API_KEY),
    },
    {
      name: "超时测试",
      fn: testTimeout,
      enabled: Boolean(API_KEY),
    },
    {
      name: "连续请求测试",
      fn: testConsecutiveRequests,
      enabled: Boolean(API_KEY),
    },
    {
      name: "非白名单/风控测试",
      fn: testNonWhitelistScenario,
      enabled: false, // 默认禁用，可能影响其他测试
    },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n▶ 执行测试：${test.name}`);
    
    if (!test.enabled) {
      console.log(`  ⏭️  跳过（未启用）`);
      results.push({
        name: test.name,
        status: TestStatus.SKIP,
        description: "测试未启用",
      });
      continue;
    }

    try {
      const result = await test.fn();
      results.push(result);

      const statusIcon = {
        [TestStatus.PASS]: "✅",
        [TestStatus.FAIL]: "❌",
        [TestStatus.SKIP]: "⏭️",
        [TestStatus.ERROR]: "💥",
      }[result.status] || "?";

      console.log(`  ${statusIcon} 状态: ${result.status}`);
      if (result.durationMs) {
        console.log(`  ⏱️  耗时: ${result.durationMs}ms`);
      }
      if (result.httpStatus) {
        console.log(`  📡 HTTP: ${result.httpStatus}`);
      }
      if (result.errorCode) {
        console.log(`  🔢 错误码: ${result.errorCode}`);
      }
      if (result.errorMessage) {
        console.log(`  📝 错误: ${result.errorMessage.slice(0, 100)}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`  💥 执行异常: ${errorMsg}`);
      results.push({
        name: test.name,
        status: TestStatus.ERROR,
        description: test.fn.toString().slice(0, 50),
        errorMessage: errorMsg,
      });
    }
  }

  // 输出汇总
  console.log("\n" + "=".repeat(60));
  console.log("测试结果汇总");
  console.log("=".repeat(60));

  const passCount = results.filter((r) => r.status === TestStatus.PASS).length;
  const failCount = results.filter((r) => r.status === TestStatus.FAIL).length;
  const skipCount = results.filter((r) => r.status === TestStatus.SKIP).length;
  const errorCount = results.filter((r) => r.status === TestStatus.ERROR).length;

  for (const result of results) {
    const statusIcon = {
      [TestStatus.PASS]: "✅",
      [TestStatus.FAIL]: "❌",
      [TestStatus.SKIP]: "⏭️",
      [TestStatus.ERROR]: "💥",
    }[result.status] || "?";
    console.log(`  ${statusIcon} ${result.name}: ${result.status}`);
  }

  console.log("=".repeat(60));
  console.log(`通过: ${passCount} | 失败: ${failCount} | 跳过: ${skipCount} | 错误: ${errorCount}`);
  console.log("=".repeat(60));

  // 输出 JSON 格式结果（方便程序解析）
  const structuredOutput = {
    timestamp: new Date().toISOString(),
    config: {
      endpoint: ENDPOINT,
      model: MODEL,
      maskedApiKey: maskKey(API_KEY),
      timeoutMs: TIMEOUT_MS,
    },
    summary: {
      total: results.length,
      pass: passCount,
      fail: failCount,
      skip: skipCount,
      error: errorCount,
    },
    results,
  };

  console.log("\n📄 结构化输出（JSON）:");
  console.log(JSON.stringify(structuredOutput, null, 2));

  // 返回退出码
  process.exit(failCount > 0 || errorCount > 0 ? 1 : 0);
}

// 执行测试
runTests().catch((err) => {
  console.error("测试执行失败:", err);
  process.exit(1);
});
