// 执行 30 天未验证邮箱账号冻结任务
import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import { batchSyncEmailVerificationRestrictions } from "@/lib/auth";

export const runtime = "nodejs";

// 默认每次处理 100 条
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const startTime = Date.now();

  try {
    // 支持自定义批次大小
    let batchSize = DEFAULT_BATCH_SIZE;
    try {
      const body = await request.clone().json();
      if (body.batchSize && typeof body.batchSize === "number") {
        batchSize = Math.min(Math.max(1, body.batchSize), MAX_BATCH_SIZE);
      }
    } catch {
      // 没有 body 或解析失败，使用默认批次
    }

    const result = await batchSyncEmailVerificationRestrictions(batchSize);
    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        executed: true,
        task: "cleanup_unverified_emails",
        checked: result.checked,
        created: result.created,
        errors: result.errors,
        batchSize,
        executionTimeMs,
        executedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EMAIL_FREEZE_EXECUTION_ERROR",
          message: error instanceof Error ? error.message : "邮箱冻结任务执行失败",
          executionTimeMs,
        },
      },
      { status: 500 },
    );
  }
}
