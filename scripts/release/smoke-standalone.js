"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const serverPath = path.join(standaloneDir, "server.js");
const port = Number(process.env.RELEASE_SMOKE_PORT || 3000);
const baseUrl = `http://127.0.0.1:${port}`;
const requireDatabase = String(process.env.RELEASE_SMOKE_REQUIRE_DB || "").toLowerCase() === "true";

function requireRuntimeDirectory(target) {
  if (!fs.existsSync(target)) {
    throw new Error(`Required packaged runtime asset directory is missing: ${path.relative(root, target)}`);
  }
}

async function request(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  return response;
}

async function waitUntilReady() {
  const deadline = Date.now() + 30000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await request("/");
      if (response.status === 200) return response;
      lastError = new Error(`homepage returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError instanceof Error ? lastError : new Error("standalone server did not become ready");
}

function firstAsset(html, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`[\"'](${escaped}[^\"']+)[\"']`));
  return match ? match[1].replace(/&amp;/g, "&") : null;
}

function isUnexpectedStandaloneExit(exitCode, signalCode, shutdownRequested) {
  return !shutdownRequested && (exitCode !== null || signalCode !== null);
}

async function main() {
  if (!fs.existsSync(serverPath)) {
    throw new Error("Missing .next/standalone/server.js. Run npm run build first.");
  }

  requireRuntimeDirectory(path.join(standaloneDir, ".next", "static"));
  requireRuntimeDirectory(path.join(standaloneDir, "public"));

  const child = spawn(process.execPath, [serverPath], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  let shutdownRequested = false;
  let unexpectedExit = null;
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  child.on("exit", (exitCode, signalCode) => {
    if (isUnexpectedStandaloneExit(exitCode, signalCode, shutdownRequested)) {
      unexpectedExit = { exitCode, signalCode };
    }
  });

  try {
    const homeResponse = await waitUntilReady();
    const html = await homeResponse.text();

    const staticAsset = firstAsset(html, "/_next/static/");
    if (!staticAsset) throw new Error("Homepage did not reference a /_next/static/ asset");
    const staticResponse = await request(staticAsset);
    if (staticResponse.status !== 200) throw new Error(`Static asset returned ${staticResponse.status}`);

    const brandResponse = await request("/brand/link168-logo.png");
    if (brandResponse.status !== 200) throw new Error(`Brand asset returned ${brandResponse.status}`);

    if (requireDatabase) {
      const healthResponse = await request("/api/health");
      if (healthResponse.status !== 200) {
        throw new Error(`Health endpoint returned ${healthResponse.status}`);
      }
      const health = await healthResponse.json();
      if (health.status !== "ok" || health.database !== "ok") {
        throw new Error("Health endpoint did not confirm application and database readiness");
      }
    }

    console.log(
      `[release:smoke] packaged standalone homepage, static and brand assets passed${requireDatabase ? "; database health passed" : ""}`,
    );
  } finally {
    shutdownRequested = true;
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  if (unexpectedExit) {
    const detail = unexpectedExit.signalCode || unexpectedExit.exitCode;
    throw new Error(`Standalone server exited unexpectedly (${detail}). ${output.slice(-500)}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[release:smoke] ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

module.exports = { isUnexpectedStandaloneExit };
