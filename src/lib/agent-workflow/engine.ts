/**
 * 多代理协作工作流 - 引擎核心
 * 编排4个代理的顺序执行与循环迭代
 */

import {
  AgentRole,
  WorkflowStage,
  WorkflowStageName,
  type TaskContext,
  type AgentOutput,
  type WorkflowResult,
  type WorkflowEngineConfig,
  type WorkflowEvent,
  type WorkflowEventListener,
  type IAgent,
  type ILlmService,
} from './types';

/** 默认配置 */
const DEFAULT_CONFIG: Required<WorkflowEngineConfig> = {
  maxIterations: 3,
  enableReviewLoop: true,
  enableOptimizeLoop: true,
  minReviewScore: 80,
};

/** 阶段到主导代理的映射 */
const stageToAgent: Record<WorkflowStage, AgentRole> = {
  [WorkflowStage.ARCHITECTURE]: AgentRole.ARCHITECT,
  [WorkflowStage.IMPLEMENTATION]: AgentRole.ENGINEER,
  [WorkflowStage.REVIEW]: AgentRole.REVIEWER,
  [WorkflowStage.OPTIMIZATION]: AgentRole.OPTIMIZER,
};

/** Agent 可能具有注入 LLM 的能力 */
interface ILlmInjectable {
  setLlmService(llm: ILlmService): void;
}

function isLlmInjectable(agent: IAgent): agent is IAgent & ILlmInjectable {
  return 'setLlmService' in agent && typeof (agent as unknown as ILlmInjectable).setLlmService === 'function';
}

/** 工作流引擎 */
export class WorkflowEngine {
  private agents: Map<AgentRole, IAgent> = new Map();
  private config: Required<WorkflowEngineConfig>;
  private listeners: WorkflowEventListener[] = [];
  private llm?: ILlmService;

  constructor(config: WorkflowEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 注入 LLM 服务 */
  setLlmService(llm: ILlmService): void {
    this.llm = llm;
    // 为已注册的代理注入
    for (const agent of this.agents.values()) {
      if (isLlmInjectable(agent)) {
        agent.setLlmService(llm);
      }
    }
  }

  /** 注册代理 */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.role, agent);
    if (this.llm && isLlmInjectable(agent)) {
      agent.setLlmService(this.llm);
    }
  }

  /** 注册多个代理 */
  registerAgents(agents: IAgent[]): void {
    for (const agent of agents) {
      this.registerAgent(agent);
    }
  }

  /** 订阅事件 */
  onEvent(listener: WorkflowEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  /** 触发事件 */
  private async emit(event: WorkflowEvent): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch {
        // 监听器错误不影响主流程
      }
    }
  }

  /** 获取指定阶段的代理 */
  private getAgentForStage(stage: WorkflowStage): IAgent {
    const role = stageToAgent[stage];
    const agent = this.agents.get(role);
    if (!agent) {
      throw new Error(`阶段 "${WorkflowStageName[stage]}" 需要的代理 "${role}" 未注册`);
    }
    return agent;
  }

  /** 执行单阶段 */
  private async executeStage(
    stage: WorkflowStage,
    context: TaskContext,
    previousOutputs: AgentOutput[]
  ): Promise<AgentOutput> {
    const agent = this.getAgentForStage(stage);

    await this.emit({
      type: 'stage_start',
      stage,
      agent: agent.role,
      timestamp: new Date(),
    });

    try {
      const output = await agent.execute(context, previousOutputs);

      await this.emit({
        type: 'stage_complete',
        stage,
        agent: agent.role,
        output,
        timestamp: new Date(),
      });

      return output;
    } catch (error) {
      await this.emit({
        type: 'stage_failed',
        stage,
        agent: agent.role,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /** 执行完整工作流 */
  async execute(task: TaskContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    const outputs: AgentOutput[] = [];

    // 阶段1: 架构设计
    const architectureOutput = await this.executeStage(
      WorkflowStage.ARCHITECTURE,
      task,
      outputs
    );
    outputs.push(architectureOutput);

    // 阶段2: 开发实施
    const implementationOutput = await this.executeStage(
      WorkflowStage.IMPLEMENTATION,
      task,
      outputs
    );
    outputs.push(implementationOutput);

    // 阶段3: 审稿反馈 (支持循环)
    let reviewOutput = await this.executeStage(
      WorkflowStage.REVIEW,
      task,
      outputs
    );
    outputs.push(reviewOutput);

    // 审稿不通过则循环回实施阶段
    let iterations = 0;
    while (
      this.config.enableReviewLoop &&
      reviewOutput.score !== undefined &&
      reviewOutput.score < this.config.minReviewScore &&
      iterations < this.config.maxIterations
    ) {
      iterations++;
      console.log(`[Workflow] 审稿评分 ${reviewOutput.score} 低于阈值 ${this.config.minReviewScore}，进入第 ${iterations} 轮迭代`);

      // 重新实施
      const reImplementation = await this.executeStage(
        WorkflowStage.IMPLEMENTATION,
        task,
        outputs
      );
      outputs.push(reImplementation);

      // 重新审稿
      reviewOutput = await this.executeStage(
        WorkflowStage.REVIEW,
        task,
        outputs
      );
      outputs.push(reviewOutput);
    }

    // 阶段4: 最终优化
    const optimizationOutput = await this.executeStage(
      WorkflowStage.OPTIMIZATION,
      task,
      outputs
    );
    outputs.push(optimizationOutput);

    const endTime = Date.now();

    const result: WorkflowResult = {
      taskId: task.taskId,
      taskDescription: task.description,
      stages: outputs,
      finalOutput: optimizationOutput,
      totalStages: outputs.length,
      completedAt: new Date(),
      durationMs: endTime - startTime,
    };

    await this.emit({
      type: 'workflow_complete',
      timestamp: new Date(),
    });

    return result;
  }
}

/** 创建默认引擎实例的工厂函数 */
export function createWorkflowEngine(config?: WorkflowEngineConfig): WorkflowEngine {
  return new WorkflowEngine(config);
}
