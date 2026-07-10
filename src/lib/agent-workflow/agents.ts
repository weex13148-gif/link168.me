/**
 * 多代理协作工作流 - 4个代理角色实现（P0: 接入真实 LLM）
 * 架构师 / 工程师 / 审稿人 / 优化者
 * 每个代理优先调用 LLM，失败时回退到 Mock 模式
 */

import {
  AgentRole,
  AgentRoleName,
  AgentRoleDescription,
  WorkflowStage,
  type TaskContext,
  type AgentOutput,
  type IAgent,
  type ILlmService,
} from './types';

/** 基础抽象代理类 */
abstract class BaseAgent implements IAgent {
  abstract readonly role: AgentRole;
  protected llm?: ILlmService;

  get name(): string {
    return AgentRoleName[this.role];
  }

  get description(): string {
    return AgentRoleDescription[this.role];
  }

  /** 注入 LLM 服务 */
  setLlmService(llm: ILlmService): void {
    this.llm = llm;
  }

  abstract execute(
    context: TaskContext,
    previousOutputs?: AgentOutput[]
  ): Promise<AgentOutput>;

  protected createOutput(
    stage: WorkflowStage,
    content: string,
    options?: Partial<Omit<AgentOutput, 'role' | 'stage' | 'content' | 'timestamp'>>
  ): AgentOutput {
    return {
      role: this.role,
      stage,
      content,
      timestamp: new Date(),
      ...options,
    };
  }

  /** 调用 LLM，失败返回 null */
  protected async callLlm(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string | null> {
    if (!this.llm || this.llm.mockMode) return null;
    const result = await this.llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    if (result.ok) return result.text;
    console.warn(`[${this.name}] LLM 调用失败: ${result.error}`);
    return null;
  }
}

/** 架构师代理 - 设计系统 */
export class ArchitectAgent extends BaseAgent {
  readonly role = AgentRole.ARCHITECT;

  private readonly systemPrompt = `你是一位资深系统架构师，精通 Next.js + TypeScript + PostgreSQL 技术栈。
你的职责是为给定任务设计清晰、可扩展、可维护的系统架构。
输出要求：
- 使用中文 Markdown 格式
- 包含系统分层、核心模块、接口契约、数据流、技术选型
- 模块边界清晰，耦合度低
- 预留扩展点`;

  async execute(
    context: TaskContext,
    _previousOutputs?: AgentOutput[]
  ): Promise<AgentOutput> {
    const { description, requirements, constraints } = context;

    const userPrompt = this.buildArchitectPrompt(description, requirements, constraints);
    const llmResult = await this.callLlm(this.systemPrompt, userPrompt);

    const architecture = llmResult ?? this.mockArchitecture(description, requirements);

    return this.createOutput(WorkflowStage.ARCHITECTURE, architecture, {
      artifacts: ['模块划分图', '接口契约定义', '数据流设计', '技术选型说明'],
      suggestions: [
        '采用分层架构，关注点分离',
        '定义清晰的模块边界，降低耦合度',
        '预留扩展点，支持未来功能迭代',
      ],
    });
  }

  private buildArchitectPrompt(
    description: string,
    requirements: string[],
    constraints?: string[]
  ): string {
    const lines = [
      `请为以下任务设计系统架构：`,
      ``,
      `**任务描述**: ${description}`,
      ``,
      `**需求列表**:`,
      ...requirements.map((r, i) => `${i + 1}. ${r}`),
    ];
    if (constraints && constraints.length > 0) {
      lines.push('', `**约束条件**:`, ...constraints.map((c, i) => `${i + 1}. ${c}`));
    }
    lines.push('', `请输出完整的架构设计文档。`);
    return lines.join('\n');
  }

  private mockArchitecture(task: string, requirements: string[]): string {
    const lines: string[] = [
      `## 架构设计: ${task}`,
      '',
      '### 1. 系统分层',
      '- 表现层 (Presentation): UI组件、页面路由',
      '- 业务层 (Business): 领域逻辑、服务编排',
      '- 数据层 (Data): 数据访问、外部集成',
      '',
      '### 2. 核心模块',
    ];
    for (let i = 0; i < requirements.length; i++) {
      lines.push(`- 模块${i + 1}: ${requirements[i]}`);
    }
    lines.push(
      '',
      '### 3. 接口契约',
      '- 输入: 标准化DTO，参数校验',
      '- 输出: 统一响应格式，错误码规范',
      '- 事件: 异步消息，解耦依赖',
      '',
      '### 4. 数据流',
      '用户请求 → 路由分发 → 业务处理 → 数据持久化 → 响应返回',
      '',
      '### 5. 技术选型',
      '- 框架: Next.js + TypeScript',
      '- 样式: Tailwind CSS',
      '- 状态: React Hooks',
      '- 构建: Turbopack',
      ''
    );
    return lines.join('\n');
  }
}

/** 工程师代理 - 开发实现 */
export class EngineerAgent extends BaseAgent {
  readonly role = AgentRole.ENGINEER;

  private readonly systemPrompt = `你是一位资深 TypeScript 工程师，擅长编写高质量、类型安全的代码。
你的职责是根据架构设计实现具体的业务代码。
输出要求：
- 使用中文 Markdown 格式
- 包含 TypeScript 代码示例
- 遵循 SOLID 原则
- 添加充分的错误处理
- 保持函数单一职责`;

  async execute(
    context: TaskContext,
    previousOutputs?: AgentOutput[]
  ): Promise<AgentOutput> {
    const { description, requirements } = context;
    const architecture = previousOutputs?.find(
      (o) => o.stage === WorkflowStage.ARCHITECTURE
    );

    const userPrompt = this.buildEngineerPrompt(description, requirements, architecture?.content);
    const llmResult = await this.callLlm(this.systemPrompt, userPrompt);

    const implementation = llmResult ?? this.mockImplementation(description, requirements, architecture?.content);

    return this.createOutput(WorkflowStage.IMPLEMENTATION, implementation, {
      artifacts: ['核心逻辑代码', '类型定义', '单元测试', '使用示例'],
      suggestions: [
        '代码遵循 SOLID 原则',
        '添加充分的错误处理',
        '保持函数单一职责',
      ],
    });
  }

  private buildEngineerPrompt(
    description: string,
    requirements: string[],
    architecture?: string
  ): string {
    const lines = [
      `请根据以下架构设计实现代码：`,
      ``,
      `**任务描述**: ${description}`,
      ``,
      `**需求列表**:`,
      ...requirements.map((r, i) => `${i + 1}. ${r}`),
    ];
    if (architecture) {
      lines.push('', `**架构设计**:\n${architecture}`);
    }
    lines.push('', `请输出完整的 TypeScript 实现代码，包含核心逻辑、类型定义和关键函数。`);
    return lines.join('\n');
  }

  private mockImplementation(
    task: string,
    requirements: string[],
    architecture?: string
  ): string {
    const lines: string[] = [
      `## 实现: ${task}`,
      '',
      '### 代码结构',
    ];
    if (architecture) {
      lines.push('基于架构设计进行实现...', '');
    }
    for (let i = 0; i < requirements.length; i++) {
      lines.push(`\`\`\`typescript`);
      lines.push(`// 模块${i + 1}: ${requirements[i]}`);
      lines.push(`export function module${i + 1}() {`);
      lines.push(`  // 实现逻辑`);
      lines.push(`  return { status: 'ok' };`);
      lines.push(`}`);
      lines.push(`\`\`\``);
      lines.push('');
    }
    lines.push(
      '### 关键实现要点',
      '- 类型安全: 使用 TypeScript 严格模式',
      '- 错误处理: try-catch + 统一错误码',
      '- 性能: 避免不必要的重渲染',
      '- 可测试: 纯函数 + 依赖注入',
      ''
    );
    return lines.join('\n');
  }
}

/** 审稿人代理 - 质量控制 */
export class ReviewerAgent extends BaseAgent {
  readonly role = AgentRole.REVIEWER;

  private readonly systemPrompt = `你是一位严格的代码审查员，擅长发现代码质量问题、安全漏洞和逻辑错误。
你的职责是审查代码并给出客观的质量评分。
输出要求：
- 使用中文 Markdown 格式
- 列出发现的具体问题（带编号）
- 给出可执行的改进建议
- 在最后一行输出评分：\`评分: XX/100\`
- 评分标准：90-100优秀，80-89良好，70-79一般，60-69及格，<60不及格`;

  async execute(
    _context: TaskContext,
    previousOutputs?: AgentOutput[]
  ): Promise<AgentOutput> {
    const implementation = previousOutputs?.find(
      (o) => o.stage === WorkflowStage.IMPLEMENTATION
    );
    const architecture = previousOutputs?.find(
      (o) => o.stage === WorkflowStage.ARCHITECTURE
    );

    const userPrompt = this.buildReviewerPrompt(architecture?.content, implementation?.content);
    const llmResult = await this.callLlm(this.systemPrompt, userPrompt);

    let reviewText: string;
    let score: number;
    let issues: string[];
    let suggestions: string[];

    if (llmResult) {
      const parsed = this.parseLlmReview(llmResult);
      reviewText = parsed.report;
      score = parsed.score;
      issues = parsed.issues;
      suggestions = parsed.suggestions;
    } else {
      const mock = this.mockReview(architecture?.content, implementation?.content);
      reviewText = mock.report;
      score = mock.score;
      issues = mock.issues;
      suggestions = mock.suggestions;
    }

    return this.createOutput(WorkflowStage.REVIEW, reviewText, {
      score,
      issues,
      suggestions,
    });
  }

  private buildReviewerPrompt(architecture?: string, implementation?: string): string {
    const lines = [`请审查以下代码并给出质量评估：`];
    if (architecture) {
      lines.push('', `**架构设计**:\n${architecture}`);
    }
    if (implementation) {
      lines.push('', `**实现代码**:\n${implementation}`);
    }
    lines.push(
      '',
      `请输出审查报告，包含：`,
      `1. 发现的问题列表`,
      `2. 改进建议`,
      `3. 质量评分（最后一行必须是：评分: XX/100）`
    );
    return lines.join('\n');
  }

  private parseLlmReview(raw: string): {
    report: string;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    // 提取评分
    const scoreMatch = raw.match(/评分[:：]\s*(\d{1,3})\s*\/\s*100/);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 75;

    // 尝试提取问题列表（- 或 1. 开头的行）
    const issues: string[] = [];
    const suggestions: string[] = [];

    const lines = raw.split('\n');
    let inIssues = false;
    let inSuggestions = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (/发现问题|问题列表|Issues/i.test(trimmed)) {
        inIssues = true;
        inSuggestions = false;
        continue;
      }
      if (/改进建议|Suggestions|建议/i.test(trimmed)) {
        inIssues = false;
        inSuggestions = true;
        continue;
      }
      if (/评分[:：]|总结/i.test(trimmed)) {
        inIssues = false;
        inSuggestions = false;
        continue;
      }

      if (inIssues && (/^[-\d*]/.test(trimmed) || trimmed.length > 10)) {
        const clean = trimmed.replace(/^[-\d*.\s]+/, '').trim();
        if (clean) issues.push(clean);
      }
      if (inSuggestions && (/^[-\d*]/.test(trimmed) || trimmed.length > 10)) {
        const clean = trimmed.replace(/^[-\d*.\s]+/, '').trim();
        if (clean) suggestions.push(clean);
      }
    }

    // 兜底：如果解析为空，做简单启发式提取
    if (issues.length === 0) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^[-*]\s+/.test(trimmed) && !trimmed.includes('评分')) {
          const clean = trimmed.replace(/^[-*\s]+/, '').trim();
          if (clean.length > 5 && clean.length < 200) issues.push(clean);
        }
      }
    }

    return { report: raw, score, issues, suggestions };
  }

  private mockReview(
    architecture?: string,
    implementation?: string
  ): { report: string; score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!architecture) issues.push('缺少架构设计文档');
    if (!implementation) issues.push('缺少实现代码');

    const possibleIssues = [
      '某些函数缺少输入参数校验',
      '错误处理不够完善，部分路径未覆盖',
      '缺少必要的注释说明',
      '变量命名可以更语义化',
      '建议添加边界条件测试',
    ];
    const issueCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < issueCount; i++) issues.push(possibleIssues[i]);

    suggestions.push(
      '添加输入参数的类型守卫',
      '完善错误处理分支',
      '补充 JSDoc 注释',
      '优化变量命名'
    );

    const score = Math.max(60, 95 - issueCount * 15);

    const lines: string[] = [
      '## 代码审查报告',
      '',
      `### 发现问题: ${issues.length} 个`,
      ...issues.map((issue, i) => `${i + 1}. ${issue}`),
      ...(issues.length === 0 ? ['✅ 代码质量良好，未发现问题'] : []),
      '',
      '### 改进建议',
      ...suggestions.map((s, i) => `${i + 1}. ${s}`),
      '',
      `### 质量评分: ${score}/100`,
      '',
    ];

    return { report: lines.join('\n'), score, issues, suggestions };
  }
}

/** 优化者代理 - 性能改进 */
export class OptimizerAgent extends BaseAgent {
  readonly role = AgentRole.OPTIMIZER;

  private readonly systemPrompt = `你是一位性能优化专家，精通前端性能优化、数据库查询优化和系统架构优化。
你的职责是分析代码和系统瓶颈，给出具体的优化策略。
输出要求：
- 使用中文 Markdown 格式
- 列出具体的优化策略（带编号）
- 给出可量化的性能对比预估
- 列出最终交付物清单`;

  async execute(
    _context: TaskContext,
    previousOutputs?: AgentOutput[]
  ): Promise<AgentOutput> {
    const implementation = previousOutputs?.find(
      (o) => o.stage === WorkflowStage.IMPLEMENTATION
    );
    const review = previousOutputs?.find(
      (o) => o.stage === WorkflowStage.REVIEW
    );

    const userPrompt = this.buildOptimizerPrompt(
      implementation?.content,
      review?.issues,
      review?.suggestions
    );
    const llmResult = await this.callLlm(this.systemPrompt, userPrompt);

    const optimization = llmResult ?? this.mockOptimization(implementation?.content, review?.issues);

    return this.createOutput(WorkflowStage.OPTIMIZATION, optimization, {
      artifacts: ['优化后代码', '性能基准测试', '优化对比报告'],
      suggestions: [
        '使用 React.memo 减少不必要渲染',
        '大数据列表使用虚拟滚动',
        '图片资源懒加载 + WebP 格式',
        'API 请求添加缓存策略',
        '使用 useMemo/useCallback 优化计算',
      ],
    });
  }

  private buildOptimizerPrompt(
    implementation?: string,
    issues?: string[],
    reviewSuggestions?: string[]
  ): string {
    const lines = [`请对以下代码和系统进行性能优化分析：`];
    if (implementation) {
      lines.push('', `**实现代码**:\n${implementation}`);
    }
    if (issues && issues.length > 0) {
      lines.push('', `**已知问题**:\n${issues.map((i) => `- ${i}`).join('\n')}`);
    }
    if (reviewSuggestions && reviewSuggestions.length > 0) {
      lines.push('', `**审查建议**:\n${reviewSuggestions.map((s) => `- ${s}`).join('\n')}`);
    }
    lines.push(
      '',
      `请输出性能优化报告，包含：`,
      `1. 优化策略列表`,
      `2. 性能对比预估（优化前后）`,
      `3. 最终交付物清单`
    );
    return lines.join('\n');
  }

  private mockOptimization(implementation?: string, issues?: string[]): string {
    const suggestions: string[] = [
      '使用 React.memo 减少不必要渲染',
      '大数据列表使用虚拟滚动',
      '图片资源懒加载 + WebP 格式',
      'API 请求添加缓存策略',
      '使用 useMemo/useCallback 优化计算',
    ];

    const lines: string[] = [
      '## 性能优化报告',
      '',
      '### 优化策略',
      ...suggestions.map((s, i) => `${i + 1}. ${s}`),
      '',
      '### 优化前后对比',
      '| 指标 | 优化前 | 优化后 | 提升 |',
      '|------|--------|--------|------|',
      '| 首屏加载 | 2.5s | 1.2s | -52% |',
      '| 交互响应 | 180ms | 45ms | -75% |',
      '| 内存占用 | 85MB | 52MB | -39% |',
      '',
      '### 待修复问题',
      ...(issues && issues.length > 0
        ? issues.map((issue) => `- [ ] ${issue}`)
        : ['- [x] 无待修复问题']),
      '',
      '### 最终交付物',
      '- ✅ 优化后的生产代码',
      '- ✅ 性能测试报告',
      '- ✅ 部署检查清单',
      '',
    ];

    return lines.join('\n');
  }
}

/** 创建默认的4个代理实例 */
export function createDefaultAgents(): IAgent[] {
  return [
    new ArchitectAgent(),
    new EngineerAgent(),
    new ReviewerAgent(),
    new OptimizerAgent(),
  ];
}
