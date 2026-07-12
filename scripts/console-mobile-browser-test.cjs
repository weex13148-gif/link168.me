const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium, request } = require("playwright");

const baseUrl = process.env.CONSOLE_TEST_BASE_URL || "http://127.0.0.1:3000";
const password = "ConsoleBrowser-2026!";
const widths = [360, 390, 430];
const routes = [
  "/console",
  "/console/card",
  "/console/customers",
  "/console/ai",
  "/console/account",
];
const expectedLabels = ["首页", "名片", "客户", "AI", "我的"];
const screenshotDir = path.resolve("artifacts/console-mobile");

function routeSlug(route) {
  return route === "/console" ? "home" : route.replace("/console/", "").replaceAll("/", "-");
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });

  // Use a dedicated RFC 5737 test address so this test does not share the
  // registration rate-limit bucket with earlier API integration suites.
  const api = await request.newContext({
    baseURL: baseUrl,
    extraHTTPHeaders: { "x-forwarded-for": "192.0.2.88" },
  });
  const email = `console-browser-${Date.now()}-${crypto.randomBytes(4).toString("hex")}@example.com`;
  const registration = await api.post("/api/auth/register", {
    data: {
      email,
      password,
      confirmPassword: password,
      agreeTerms: true,
    },
  });
  assert.equal(registration.status(), 200, `registration failed: ${await registration.text()}`);
  const storageState = await api.storageState();
  await api.dispose();

  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        storageState,
        deviceScaleFactor: 1,
      });

      try {
        for (const route of routes) {
          const page = await context.newPage();
          const response = await page.goto(`${baseUrl}${route}`, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          assert.ok(response, `${route} did not return a browser response at ${width}px`);
          assert.equal(response.status(), 200, `${route} returned ${response.status()} at ${width}px`);
          await page.waitForTimeout(500);

          const dimensions = await page.evaluate(() => ({
            viewport: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
          }));
          const renderedWidth = Math.max(dimensions.documentWidth, dimensions.bodyWidth);
          assert.ok(
            renderedWidth <= dimensions.viewport + 1,
            `${route} overflows horizontally at ${width}px: viewport=${dimensions.viewport}, rendered=${renderedWidth}`,
          );

          const mobileNav = page.getByRole("navigation", { name: "手机端控制台导航" });
          assert.equal(await mobileNav.count(), 1, `${route} is missing the mobile Console navigation at ${width}px`);
          const labels = (await mobileNav.locator("a").allTextContents()).map((label) => label.replace(/\s+/g, "").trim());
          assert.deepEqual(labels, expectedLabels, `${route} has the wrong mobile navigation at ${width}px`);
          assert.equal(
            await page.locator('a[href^="/jeepwork"]').count(),
            0,
            `${route} exposes Jeepwork at ${width}px`,
          );

          await page.screenshot({
            path: path.join(screenshotDir, `${width}-${routeSlug(route)}.png`),
            fullPage: true,
          });
          await page.close();
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log("PASS Console primary routes have no document-level horizontal overflow at 360px, 390px and 430px");
  console.log("PASS all tested mobile pages show exactly 首页、名片、客户、AI、我的");
  console.log("PASS Jeepwork is absent from real mobile browser navigation");
  console.log(`PASS screenshots saved to ${screenshotDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
