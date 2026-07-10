/**
 * 多代理协作工作流 - 类型定义
 * 参考: Claude 多代理工作流程
 * 4个协作代理: 架构师 / 工程师 / 审稿人 / 优化者
 */

/** 代理角色枚举 */
export enum AgentRole {
  ARCHITECT = 'architect',   // 架构师 - 设计系统
  ENGINEER = 'engineer',     // 工程师 - 开发实现
  REVIEWER = 'reviewer',     // 审稿人 - 质量控制
  OPTIMIZER = 'optimizer',   // 优化者 - 性能改进
}

/** 代理角色中文名称 */
export const AgentRoleName: Record<AgentRole, string> = {
  [AgentRole.ARCHITECT]: '架构师',
  [AgentRole.ENGINEER]: '工程师',
  [AgentRole.REVIEWER]: '审稿人',
  [AgentRole.OPTIMIZER]: '优化者',
};

/** 代理角色职责描述 */
export const AgentRoleDescription: Record<AgentRole, string> = {
  [AgentRole.ARCHITECT]: '设计系统架构，定义模块边界、接口契约和数据流',
  [AgentRole.ENGINEER]: '根据架构设计进行代码实现，编写业务逻辑',
  [AgentRole.REVIEWER]: '审查代码质量，检查规范合规性、安全漏洞和逻辑错误',
  [AgentRole.OPTIMIZER]: '性能分析与优化，提升执行效率和资源利用率',
};

/** 工作流阶段 */
export enum WorkflowStage {
  ARCHITECTURE = 'architecture',   // 架构设计
  IMPLEMENTATION = 'implementation', // 开发实施
  REVIEW = 'review',               // 审稿反馈
  OPTIMIZATION = 'optimization',   // 最终优化
}

/** 工作流阶段中文名称 */
export const WorkflowStageName: Record<WorkflowStage, string> = {
  [WorkflowStage.ARCHITECTURE]: '架构设计',
  [WorkflowStage.IMPLEMENTATION]: '开发实施',
  [WorkflowStage.REVIEW]: '审稿反馈',
  [WorkflowStage.OPTIMIZATION]: '最终优化',
};

/** 任务上下文 */
export interface TaskContext {
  taskId: string;
  description: string;
  requirements: string[];
  constraints?: string[];
  metadata?: Record<string, unknown>;
}

/** 代理产出物 */
export interface AgentOutput {
  role: AgentRole;
  stage: WorkflowStage;
  content: string;
  artifacts?: string[];      // 生成的文件/代码片段
  suggestions?: string[];    // 建议
  issues?: string[];         // 发现的问题
  score?: number;            // 质量评分 0-100
  timestamp: Date;
}

/** 工作流结果 */
export interface WorkflowResult {
  taskId: string;
  taskDescription: string;
  stages: AgentOutput[];
  finalOutput: AgentOutput;
  totalStages: number;
  completedAt: Date;
  durationMs: number;
}

/** 代理接口 */
export interface IAgent {
  readonly role: AgentRole;
  readonly name: string;
  readonly description: string;
  execute(context: TaskContext, previousOutputs?: AgentOutput[]): Promise<AgentOutput>;
}

/** LLM 服务接口（供 Agent 调用） */
export interface ILlmService {
  readonly mockMode: boolean;
  chat(messages: import("@/lib/ai/provider").ChatMessage[]): Promise<
    | { ok: true; text: string; tokens?: number }
    | { ok: false; error: string }
  >;
}

/** 工作流引擎配置 */
export interface WorkflowEngineConfig {
  maxIterations?: number;      // 最大迭代次数
  enableReviewLoop?: boolean;  // 是否启用审稿循环
  enableOptimizeLoop?: boolean;// 是否启用优化循环
  minReviewScore?: number;     // 审稿通过最低分数
}

/** 工作流事件 */
export interface WorkflowEvent {
  type: 'stage_start' | 'stage_complete' | 'stage_failed' | 'workflow_complete';
  stage?: WorkflowStage;
  agent?: AgentRole;
  output?: AgentOutput;
  error?: Error;
  timestamp: Date;
}

/** 事件监听器 */
export type WorkflowEventListener = (event: WorkflowEvent) => void | Promise<void>;
