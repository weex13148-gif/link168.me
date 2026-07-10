/**
 * 多代理协作工作流 - 演示脚本
 * 演示4个代理的协作流程: 架构师 → 工程师 → 审稿人 → 优化者
 *
 * 运行方式:
 *   npx tsx scripts/agent-workflow-demo.ts
 *   或
 *   npx ts-node --esm scripts/agent-workflow-demo.ts
 */

import {
  createWorkflowEngine,
  createDefaultAgents,
  createLlmService,
  AgentRoleName,
  WorkflowStageName,
  type TaskContext,
  type WorkflowEvent,
} from '../src/lib/agent-workflow';

/** 打印分隔线 */
function printSeparator(title: string): void {
  const width = 60;
  const pad = Math.max(0, Math.floor((width - title.length - 4) / 2));
  const line = '='.repeat(width);
  const header = `${'='.repeat(pad)} ${title} ${'='.repeat(pad)}`;
  console.log('\n' + line);
  console.log(header);
  console.log(line + '\n');
}

/** 打印代理产出 */
function printOutput(output: import('../src/lib/agent-workflow').AgentOutput): void {
  const roleName = AgentRoleName[output.role];
  const stageName = WorkflowStageName[output.stage];

  console.log(`\n📋 [${stageName}] ${roleName}`);
  console.log('─'.repeat(50));
  console.log(output.content);

  if (output.score !== undefined) {
    const color = output.score >= 80 ? '\x1b[32m' : output.score >= 60 ? '\x1b[33m' : '\x1b[31m';
    console.log(`\n${color}⭐ 质量评分: ${output.score}/100\x1b[0m`);
  }

  if (output.issues && output.issues.length > 0) {
    console.log('\n⚠️  发现问题:');
    for (const issue of output.issues) {
      console.log(`   - ${issue}`);
    }
  }

  if (output.suggestions && output.suggestions.length > 0) {
    console.log('\n💡 建议:');
    for (const suggestion of output.suggestions) {
      console.log(`   - ${suggestion}`);
    }
  }

  if (output.artifacts && output.artifacts.length > 0) {
    console.log('\n📦 产出物:');
    for (const artifact of output.artifacts) {
      console.log(`   📄 ${artifact}`);
    }
  }
}

/** 主函数 */
async function main(): Promise<void> {
  printSeparator('Claude 多代理协作工作流演示');

  // 定义任务: 实现一个用户认证模块
  const task: TaskContext = {
    taskId: 'demo-auth-module-001',
    description: '实现用户认证模块（登录/注册/密码重置）',
    requirements: [
      '支持邮箱+密码登录',
      '支持手机号验证码注册',
      '支持密码重置流程',
      'JWT Token 认证机制',
      '登录状态持久化',
    ],
    constraints: [
      '符合 OWASP 安全规范',
      '响应时间 < 200ms',
      '支持并发 1000 QPS',
    ],
  };

  console.log('🎯 任务描述:', task.description);
  console.log('📋 需求列表:');
  for (const req of task.requirements) {
    console.log(`   - ${req}`);
  }
  console.log('⛓️ 约束条件:');
  for (const constraint of task.constraints ?? []) {
    console.log(`   - ${constraint}`);
  }

  // 初始化 LLM 服务
  const llmService = await createLlmService();
  const modeText = llmService.mockMode ? '模拟模式 (Mock)' : '真实 LLM 模式';
  const modeEmoji = llmService.mockMode ? '🤖' : '🧠';
  console.log(`${modeEmoji} 当前运行模式: ${modeText}`);
  if (!llmService.mockMode) {
    console.log('   代理将调用真实的 AI 模型生成内容');
  } else {
    console.log('   代理将使用内置模板生成内容（LLM 未配置）');
  }

  // 创建工作流引擎
  const engine = createWorkflowEngine({
    maxIterations: 2,
    enableReviewLoop: true,
    enableOptimizeLoop: true,
    minReviewScore: 80,
  });

  // 注入 LLM 服务
  engine.setLlmService(llmService);

  // 注册4个代理
  const agents = createDefaultAgents();
  engine.registerAgents(agents);

  // 订阅事件
  engine.onEvent((event: WorkflowEvent) => {
    if (event.type === 'stage_start' && event.stage && event.agent) {
      const stageName = WorkflowStageName[event.stage];
      const roleName = AgentRoleName[event.agent];
      console.log(`\n🚀 开始阶段: [${stageName}] ${roleName} 工作中...`);
    }
  });

  printSeparator('开始执行工作流');

  // 执行工作流
  const startTime = Date.now();
  const result = await engine.execute(task);
  const duration = Date.now() - startTime;

  printSeparator('工作流执行结果');

  // 打印各阶段产出
  for (const output of result.stages) {
    printOutput(output);
  }

  printSeparator('总结');

  console.log(`✅ 任务ID: ${result.taskId}`);
  console.log(`📝 任务描述: ${result.taskDescription}`);
  console.log(`🔄 总阶段数: ${result.totalStages}`);
  console.log(`⏱️  执行耗时: ${result.durationMs}ms`);
  console.log(`🏁 完成时间: ${result.completedAt.toLocaleString('zh-CN')}`);

  // 最终评分
  const reviewStage = result.stages.find((s) => s.stage === 'review');
  const finalScore = reviewStage?.score ?? 0;
  const scoreColor = finalScore >= 80 ? '\x1b[32m' : finalScore >= 60 ? '\x1b[33m' : '\x1b[31m';
  console.log(`\n${scoreColor}🏆 最终质量评分: ${finalScore}/100\x1b[0m`);

  if (finalScore >= 80) {
    console.log('\x1b[32m✅ 质量达标，可以发布！\x1b[0m');
  } else if (finalScore >= 60) {
    console.log('\x1b[33m⚠️  质量一般，建议修复后发布\x1b[0m');
  } else {
    console.log('\x1b[31m❌ 质量不达标，需要重新开发\x1b[0m');
  }

  printSeparator('演示结束');
}

// 运行
main().catch((error) => {
  console.error('❌ 执行失败:', error);
  process.exit(1);
});
