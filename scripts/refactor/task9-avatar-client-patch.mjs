import { readFile, writeFile, rm } from "node:fs/promises";

async function replaceOne(path, before, after, label) {
  const source = await readFile(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`);
  await writeFile(path, source.replace(before, after));
}

await replaceOne(
  "src/components/dashboard-v1/core-store.ts",
  'import type { CustomTheme } from "@/components/theme/types";\n',
  'import type { CustomTheme } from "@/components/theme/types";\n\nconst MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;\nconst MAX_AVATAR_UPLOAD_BYTES = 2 * 1024 * 1024;\n',
  "core constants",
);

await replaceOne(
  "src/components/dashboard-v1/core-store.ts",
  '    if (file.size > 2 * 1024 * 1024) { showToast("头像图片不能超过 2MB。", "error"); return; }\n',
  '    if (file.size > MAX_AVATAR_SOURCE_BYTES) { showToast("原始头像图片不能超过 10MB。", "error"); return; }\n',
  "core source limit",
);

await replaceOne(
  "src/components/dashboard-v1/core-store.ts",
  `      let uploadFile = file;\n      try {\n        uploadFile = await compressAvatarImage(file);\n      } catch {\n        uploadFile = file;\n      }\n\n      const result = await uploadAvatarRequest(uploadFile);\n      if (!result.ok) { setSaveState("error"); showToast(result.error, "error"); return; }\n      const nextProfile = withAvatarCacheBust(result.data);\n      setProfile(nextProfile);\n      setUsername(nextProfile.username);\n      setDisplayName(nextProfile.display_name || "");\n      setBio(nextProfile.bio || "");\n      setSaveState("saved");\n      showToast("头像已更新，并已同步到预览和公开主页。");\n`,
  `      let uploadFile = file;\n      try {\n        uploadFile = await compressAvatarImage(file);\n      } catch {\n        if (file.size > MAX_AVATAR_UPLOAD_BYTES) {\n          setSaveState("error");\n          showToast("头像压缩失败，请更换图片后重试。", "error");\n          return;\n        }\n      }\n\n      if (uploadFile.size > MAX_AVATAR_UPLOAD_BYTES) {\n        setSaveState("error");\n        showToast("压缩后的头像仍超过 2MB，请更换图片后重试。", "error");\n        return;\n      }\n\n      const result = await uploadAvatarRequest(uploadFile);\n      if (!result.ok) { setSaveState("error"); showToast(result.error, "error"); return; }\n      const nextProfile = withAvatarCacheBust(result.data.profile);\n      setProfile(nextProfile);\n      setUsername(nextProfile.username);\n      setDisplayName(nextProfile.display_name || "");\n      setBio(nextProfile.bio || "");\n      setSaveState("saved");\n      showToast(result.message || (result.data.moderationStatus === "approved"\n        ? "头像已更新。"\n        : "头像已上传，审核通过后将在公开主页生效。"));\n`,
  "core upload flow",
);

await replaceOne(
  "src/components/dashboard-v1/dashboard-api.ts",
  `export async function uploadAvatarRequest(file: File): Promise<ApiResult<DashboardProfile>> {\n  const formData = new FormData();\n  formData.append("avatar", file);\n  const response = await fetch("/api/dashboard/avatar", { method: "POST", body: formData, cache: "no-store" });\n  const data = await readJson<{ success?: boolean; profile?: DashboardProfile; error?: string }>(response);\n  if (!response.ok || !data.success || !data.profile) return { ok: false, error: data.error || "头像上传失败。", status: response.status };\n  return { ok: true, data: data.profile };\n}\n`,
  `export type AvatarUploadData = {\n  profile: DashboardProfile;\n  moderationStatus: "approved" | "pending_review";\n  publicEffective: boolean;\n};\n\nexport async function uploadAvatarRequest(file: File): Promise<ApiResult<AvatarUploadData>> {\n  const formData = new FormData();\n  formData.append("avatar", file);\n  const response = await fetch("/api/dashboard/avatar", { method: "POST", body: formData, cache: "no-store" });\n  const data = await readJson<{\n    success?: boolean;\n    profile?: DashboardProfile;\n    moderationStatus?: "approved" | "pending_review";\n    publicEffective?: boolean;\n    error?: string;\n    message?: string;\n  }>(response);\n  if (!response.ok || !data.success || !data.profile || !data.moderationStatus) {\n    return { ok: false, error: data.error || "头像上传失败。", status: response.status };\n  }\n  return {\n    ok: true,\n    data: {\n      profile: data.profile,\n      moderationStatus: data.moderationStatus,\n      publicEffective: Boolean(data.publicEffective),\n    },\n    message: data.message,\n  };\n}\n`,
  "dashboard api upload result",
);

await replaceOne(
  "tests/refactor/phase1/avatar-pipeline.test.ts",
  '      path.join(process.cwd(), "src/app/api/avatar/[username]/route.ts"),\n',
  '      path.join(process.cwd(), "src/infrastructure/media/avatar-read.ts"),\n',
  "test exact read source",
);

await rm("scripts/refactor/task9-avatar-client-patch.mjs", { force: true });
