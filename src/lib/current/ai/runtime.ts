import "server-only";

import type { CurrentPageRepository } from "@/lib/current/contracts";
import type { CurrentVisitorAiAuditHooks } from "@/lib/current/ai/audit";
import { createEnvCurrentVisitorAiProvider, type CurrentVisitorAiProvider } from "@/lib/current/ai/provider";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";

export interface CurrentVisitorAiRuntime {
  pageRepository: CurrentPageRepository;
  provider?: CurrentVisitorAiProvider;
  audit?: CurrentVisitorAiAuditHooks;
}

let currentVisitorAiRuntime: CurrentVisitorAiRuntime | null = null;

function createDefaultCurrentVisitorAiRuntime(): CurrentVisitorAiRuntime {
  return {
    pageRepository: new PrismaCurrentPageRepository(),
    provider: createEnvCurrentVisitorAiProvider(),
  };
}

export function registerCurrentVisitorAiRuntime(runtime: CurrentVisitorAiRuntime) {
  currentVisitorAiRuntime = runtime;
}

export function getCurrentVisitorAiRuntime(): CurrentVisitorAiRuntime {
  currentVisitorAiRuntime ??= createDefaultCurrentVisitorAiRuntime();
  return currentVisitorAiRuntime;
}
