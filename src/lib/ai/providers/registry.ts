// AI Provider 注册表
// 管理所有 AI Provider 适配器的注册与发现

import type { IAiProvider } from "./types";
import { BailianProvider } from "./bailian";

/**
 * Provider 注册表
 * 根据配置动态选择合适的 Provider 适配器
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, IAiProvider> = new Map();

  private constructor() {
    // 注册默认 Provider
    this.register(new BailianProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * 注册 Provider
   */
  public register(provider: IAiProvider): void {
    this.providers.set(provider.getName(), provider);
  }

  /**
   * 获取 Provider
   */
  public get(name: string): IAiProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 根据配置获取合适的 Provider
   */
  public resolve(providerName: string): IAiProvider | undefined {
    // 直接按名称查找
    const direct = this.providers.get(providerName);
    if (direct) return direct;

    // 兼容处理：bailian 和 qwen 都使用百炼
    if (providerName === "qwen" || providerName === "bailian") {
      const bailian = this.providers.get("bailian");
      if (bailian) return bailian;
    }

    // openai-compatible 默认回退到 bailian（如果配置了百炼 endpoint）
    if (providerName === "openai-compatible") {
      return this.providers.get("bailian");
    }

    return undefined;
  }

  /**
   * 获取所有已注册的 Provider 名称
   */
  public listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * 获取 Provider 注册表单例
 */
export function getProviderRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}
