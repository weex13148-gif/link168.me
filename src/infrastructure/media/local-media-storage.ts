import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function resolveStoragePath(root: string, storageKey: string) {
  if (!storageKey || path.isAbsolute(storageKey) || storageKey.includes("\\")) {
    throw new Error("INVALID_MEDIA_STORAGE_KEY");
  }

  const segments = storageKey.split("/");
  if (
    segments.some(
      (segment) =>
        !segment || segment === "." || segment === ".." || !/^[a-zA-Z0-9._-]+$/.test(segment),
    )
  ) {
    throw new Error("INVALID_MEDIA_STORAGE_KEY");
  }

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  if (!resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("INVALID_MEDIA_STORAGE_KEY");
  }
  return resolvedPath;
}

export function createLocalMediaStorage(root: string) {
  return Object.freeze({
    async write(storageKey: string, data: Buffer) {
      const filePath = resolveStoragePath(root, storageKey);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, data, { flag: "wx" });
      return Object.freeze({ storageKey, filePath, sizeBytes: data.byteLength });
    },

    async read(storageKey: string) {
      return readFile(resolveStoragePath(root, storageKey));
    },

    async delete(storageKey: string) {
      await rm(resolveStoragePath(root, storageKey), { force: true });
    },

    resolve(storageKey: string) {
      return resolveStoragePath(root, storageKey);
    },
  });
}
