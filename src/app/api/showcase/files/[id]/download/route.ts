import { createReadStream, statSync } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SHOWCASE_COOKIE_NAME, getShowcaseConfig, hasValidShowcaseCookie } from "@/lib/showcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "competition-files");

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const config = await getShowcaseConfig();
  const cookieStore = await cookies();
  const authed = hasValidShowcaseCookie(cookieStore.get(SHOWCASE_COOKIE_NAME)?.value, config);

  if (!config.enabled) return new Response("比赛展示中心暂未启用", { status: 403 });
  if (!authed) return new Response("需要输入比赛访问密码", { status: 401 });

  const { id } = await context.params;
  const file = await db.competitionFile.findFirst({ where: { id, isDeleted: false } });
  if (!file) return new Response("文件不存在", { status: 404 });

  const base = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(UPLOAD_DIR, file.storedName);
  if (!resolved.startsWith(`${base}${path.sep}`)) return new Response("路径非法", { status: 403 });

  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(resolved);
  } catch {
    return new Response("文件不存在", { status: 404 });
  }
  if (!stats.isFile()) return new Response("不是有效文件", { status: 400 });

  const chunks: Uint8Array[] = [];
  for await (const chunk of createReadStream(resolved)) chunks.push(chunk as Uint8Array);
  const buffer = Buffer.concat(chunks);
  const safeName = encodeURIComponent(file.originalName);

  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${safeName}`,
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
