"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const serverPath = path.join(standaloneDir, "server.js");
const port = Number(process.env.RELEASE_SMOKE_PORT || 3000);
const baseUrl = `http://127.0.0.1:${port}`;

function ensureDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Required runtime asset directory is missing: ${path.relative(root, source)}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
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
      const response = await request("/api/health");
      if (response.status === 200) return response;
      lastError = new Error(`health returned ${response.status}`);
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

async function main() {
  if (!fs.existsSync(serverPath)) {
    throw new Error("Missing .next/standalone/server.js. Run npm run build first.");
  }

  ensureDirectory(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
  ensureDirectory(path.join(root, "public"), path.join(standaloneDir, "public"));

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
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });

  try {
    const healthResponse = await waitUntilReady();
    const health = await healthResponse.json();
    if (health.status !== "ok" || health.database !== "ok") {
      throw new Error("Health endpoint did not confirm application and database readiness");
    }

    const homeResponse = await request("/");
    if (homeResponse.status !== 200) {
      throw new Error(`Homepage returned ${homeResponse.status}`);
    }
    const html = await homeResponse.text();

    const staticAsset = firstAsset(html, "/_next/static/");
    if (!staticAsset) throw new Error("Homepage did not reference a /_next/static/ asset");
    const staticResponse = await request(staticAsset);
    if (staticResponse.status !== 200) throw new Error(`Static asset returned ${staticResponse.status}`);

    const brandAsset = firstAsset(html, "/brand/");
    if (!brandAsset) throw new Error("Homepage did not reference a /brand/ asset");
    const brandResponse = await request(brandAsset);
    if (brandResponse.status !== 200) throw new Error(`Brand asset returned ${brandResponse.status}`);

    console.log("[release:smoke] standalone homepage, health, static and brand assets passed");
  } finally {
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

  if (child.exitCode && child.exitCode !== 0 && child.exitCode !== null) {
    throw new Error(`Standalone server exited unexpectedly (${child.exitCode}). ${output.slice(-500)}`);
  }
}

main().catch((error) => {
  console.error(`[release:smoke] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
