/**
 * Legacy path compatibility only.
 *
 * The dashboard route owns authentication, validation, persistence, cache
 * invalidation, and the public-safe response contract.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export { GET, PUT } from "@/app/api/dashboard/ai-service-config/route";
