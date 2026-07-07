const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
function log(msg) { console.log('[TEST]', msg); }

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    ignoreHTTPSErrors: true,
  });

  // ============== TEST 2 重试: /pricing ==============
  try {
    const page = await context.newPage();
    log('TEST 2(重试): 访问 /pricing (使用 domcontentloaded)');
    const resp = await page.goto(BASE + '/pricing', { waitUntil: 'domcontentloaded', timeout: 30000 });
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(4000);
    const title = await page.title();
    log('  页面标题: ' + title);

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    log('  body 前300字符: ' + bodyText.slice(0, 300).replace(/\s+/g, ' '));

    const hasPrice = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        hasPrice: /价格|会员|套餐|VIP|premium|pricing|元|月|年/i.test(t),
        hasAmount: /\d+\s*(元|￥|¥|\$)/i.test(t),
        hasMember: /会员|membership/i.test(t),
      };
    });
    log('  价格关键词: ' + JSON.stringify(hasPrice));

    const shot = path.join(SHOT_DIR, '02-pricing.png');
    await page.screenshot({ path: shot, fullPage: true });
    log('  截图保存: ' + shot);

    const status = (resp && resp.ok() && hasPrice.hasPrice) ? 'PASS' : (resp && resp.ok() ? 'WARN' : 'FAIL');
    results.push({ test: '2-Pricing页面', status, http: resp ? resp.status() : 'N/A', title, hasPrice, bodyPreview: bodyText.slice(0, 300), screenshot: shot });
    await page.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '2-Pricing页面', status: 'FAIL', error: e.message });
  }

  // ============== TEST 5 重试: /jeepwork/settings/ai ==============
  try {
    const page = await context.newPage();
    log('TEST 5(重试): 访问 /jeepwork/settings/ai (使用 domcontentloaded)');
    const resp = await page.goto(BASE + '/jeepwork/settings/ai', { waitUntil: 'domcontentloaded', timeout: 30000 });
    log('  最终URL: ' + page.url());
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(4000);
    const title = await page.title();
    log('  页面标题: ' + title);

    const finalUrl = page.url();
    const redirectedToLogin = /login|signin|auth/i.test(finalUrl);

    const bodyText = await page.evaluate(() => document.body.innerText);
    log('  body 前400字符: ' + bodyText.slice(0, 400).replace(/\s+/g, ' '));

    const checks = {
      hasManualReview: bodyText.includes('人工复核模式'),
      hasManualReviewShort: bodyText.includes('人工复核'),
      hasContentSafety: /内容安全|内容审核|安全审核|内容安全审核/.test(bodyText),
      hasAiSettings: /AI\s*设置|AI\s*配置|AI\s*审核|人工智能/.test(bodyText),
      hasModeration: /moderation|review/i.test(bodyText),
      hasJeepwork: /jeepwork|内容平台|发布/i.test(bodyText),
    };
    log('  关键词检查: ' + JSON.stringify(checks, null, 2));

    const shot = path.join(SHOT_DIR, '05-jeepwork-settings-ai.png');
    await page.screenshot({ path: shot, fullPage: true });
    log('  截图保存: ' + shot);

    let status;
    if (redirectedToLogin) {
      status = 'PASS(重定向登录)';
    } else if (checks.hasManualReview) {
      status = 'PASS';
    } else if (checks.hasManualReviewShort || checks.hasContentSafety) {
      status = 'WARN(部分关键词命中)';
    } else {
      status = 'FAIL(未找到"人工复核模式")';
    }
    results.push({ test: '5-AI设置-人工复核模式', status, http: resp ? resp.status() : 'N/A', title, finalUrl, redirectedToLogin, checks, bodyPreview: bodyText.slice(0, 400), screenshot: shot });
    await page.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '5-AI设置-人工复核模式', status: 'FAIL', error: e.message });
  }

  await browser.close();

  console.log('\n========== 重试结果汇总 ==========');
  for (const r of results) {
    console.log(`\n【${r.test}】状态: ${r.status.toUpperCase()}`);
    if (r.http !== undefined) console.log('  HTTP: ' + r.http);
    if (r.title) console.log('  标题: ' + r.title);
    if (r.finalUrl) console.log('  最终URL: ' + r.finalUrl);
    if (r.redirectedToLogin !== undefined) console.log('  重定向到登录: ' + r.redirectedToLogin);
    if (r.hasPrice) console.log('  价格关键词: ' + JSON.stringify(r.hasPrice));
    if (r.checks) console.log('  关键词: ' + JSON.stringify(r.checks));
    if (r.bodyPreview) console.log('  body预览: ' + r.bodyPreview.replace(/\s+/g, ' '));
    if (r.screenshot) console.log('  截图: ' + r.screenshot);
    if (r.error) console.log('  错误: ' + r.error);
  }

  fs.writeFileSync(path.join(__dirname, 'results-retry.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('\n结果已写入: ' + path.join(__dirname, 'results-retry.json'));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
