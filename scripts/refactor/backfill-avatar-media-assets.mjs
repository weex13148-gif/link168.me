import crypto from "node:crypto";
import { createRequire } from "node:module";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../../src/generated/prisma/client.js");

function parseArguments(argv) {
  let apply = false;
  for (const argument of argv) {
    if (argument === "--apply") {
      apply = true;
      continue;
    }
    if (argument === "--dry-run") continue;
    if (argument === "--database-url" || argument.startsWith("--database-url=")) {
      throw new Error("DATABASE_URL_OVERRIDE_FORBIDDEN");
    }
    throw new Error(`UNKNOWN_ARGUMENT: ${argument}`);
  }
  return Object.freeze({ apply });
}

function projectRootFromCwd() {
  const cwd = process.cwd();
  const marker = `${path.sep}.next${path.sep}standalone`;
  const markerIndex = cwd.lastIndexOf(marker);
  return markerIndex >= 0 ? cwd.slice(0, markerIndex) : cwd;
}

function resolveUploadRoot() {
  const configured = process.env.LINK168_UPLOAD_ROOT?.trim() || process.env.UPLOAD_ROOT?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(projectRootFromCwd(), configured);
  }
  return path.join(projectRootFromCwd(), "storage", "uploads");
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

function normalizeProfileId(value) {
  return String(value || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
}

function isExternalUrl(value) {
  return /^(?:https?:)?\/\//i.test(String(value || "").trim());
}

function mimeTypeFromPath(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  return null;
}

async function collectFiles(root) {
  const files = [];
  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  await visit(root);
  return files;
}

function relativeStorageKey(uploadRoot, filePath) {
  const relative = path.relative(uploadRoot, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("LEGACY_AVATAR_OUTSIDE_UPLOAD_ROOT");
  }
  return relative.split(path.sep).join("/");
}

async function applyCandidate({ db, profile, uploadRoot, candidate }) {
  const data = await readFile(candidate.path);
  const mimeType = mimeTypeFromPath(candidate.path);
  if (!mimeType) throw new Error("UNSUPPORTED_LEGACY_AVATAR_MIME");
  const storageKey = relativeStorageKey(uploadRoot, candidate.path);
  const checksumSha256 = crypto.createHash("sha256").update(data).digest("hex");

  return db.$transaction(async (tx) => {
    const current = await tx.profile.findFirst({
      where: {
        id: profile.id,
        userId: profile.userId,
        avatarAssetId: null,
      },
      select: { id: true },
    });
    if (!current) return false;

    let asset = await tx.mediaAsset.findUnique({ where: { storageKey } });
    if (asset) {
      if (
        asset.ownerUserId !== profile.userId ||
        asset.profileId !== profile.id ||
        asset.purpose !== "avatar" ||
        asset.status === "deleted"
      ) {
        throw new Error("LEGACY_STORAGE_KEY_CONFLICT");
      }
    } else {
      asset = await tx.mediaAsset.create({
        data: {
          id: crypto.randomUUID(),
          ownerUserId: profile.userId,
          profileId: profile.id,
          purpose: "avatar",
          storageProvider: "local",
          storageKey,
          originalName: path.basename(candidate.path),
          mimeType,
          sizeBytes: data.byteLength,
          checksumSha256,
          status: "approved",
          moderationReason: "legacy_backfill",
        },
      });
    }

    const assigned = await tx.profile.updateMany({
      where: {
        id: profile.id,
        userId: profile.userId,
        avatarAssetId: null,
      },
      data: {
        avatarAssetId: asset.id,
        avatarUrl: `/api/avatar/${profile.username}`,
        avatarModerationStatus: "approved",
      },
    });
    if (assigned.count !== 1) throw new Error("LEGACY_AVATAR_ASSIGNMENT_CONFLICT");
    return true;
  });
}

export async function runAvatarMediaAssetBackfill({ db, uploadRoot, apply = false }) {
  const summary = {
    mode: apply ? "apply" : "dry-run",
    scanned: 0,
    wouldCreate: 0,
    created: 0,
    missing: 0,
    duplicates: 0,
    externalSkipped: 0,
    errors: 0,
  };

  const [profiles, files] = await Promise.all([
    db.profile.findMany({
      where: {
        avatarUrl: { not: null },
        avatarAssetId: null,
      },
      select: {
        id: true,
        userId: true,
        username: true,
        avatarUrl: true,
      },
      orderBy: { id: "asc" },
    }),
    collectFiles(uploadRoot),
  ]);

  summary.scanned = profiles.length;

  const indexedFiles = await Promise.all(
    files.map(async (filePath) => ({
      path: filePath,
      name: path.basename(filePath).toLowerCase(),
      metadata: await stat(filePath),
    })),
  );

  for (const profile of profiles) {
    try {
      if (isExternalUrl(profile.avatarUrl)) {
        summary.externalSkipped += 1;
        continue;
      }

      const prefix = `${normalizeUsername(profile.username)}-${normalizeProfileId(profile.id).toLowerCase()}-`;
      const matches = indexedFiles
        .filter((file) => file.name.startsWith(prefix) && mimeTypeFromPath(file.path))
        .sort((left, right) => right.metadata.mtimeMs - left.metadata.mtimeMs);

      if (matches.length === 0) {
        summary.missing += 1;
        continue;
      }
      if (matches.length > 1) {
        summary.duplicates += 1;
        continue;
      }

      if (!apply) {
        summary.wouldCreate += 1;
        continue;
      }

      const created = await applyCandidate({
        db,
        profile,
        uploadRoot,
        candidate: matches[0],
      });
      if (created) summary.created += 1;
    } catch (error) {
      summary.errors += 1;
      console.error(
        JSON.stringify({
          profileId: profile.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  return Object.freeze(summary);
}

async function main() {
  const { apply } = parseArguments(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ["error"],
  });
  try {
    const summary = await runAvatarMediaAssetBackfill({
      db,
      uploadRoot: resolveUploadRoot(),
      apply,
    });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } finally {
    await db.$disconnect();
  }
}

const isDirectExecution = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
