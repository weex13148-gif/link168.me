"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

function copyRuntimeDirectory(name, source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing ${name} source: ${path.relative(root, source)}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function main() {
  const serverPath = path.join(standaloneDir, "server.js");
  if (!fs.existsSync(serverPath)) {
    throw new Error("Missing .next/standalone/server.js. Run next build before packaging runtime assets.");
  }

  copyRuntimeDirectory(
    "Next static assets",
    path.join(root, ".next", "static"),
    path.join(standaloneDir, ".next", "static"),
  );
  copyRuntimeDirectory(
    "public assets",
    path.join(root, "public"),
    path.join(standaloneDir, "public"),
  );

  console.log("[prepare-standalone] packaged static and public runtime assets");
}

try {
  main();
} catch (error) {
  console.error(`[prepare-standalone] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
