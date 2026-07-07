const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];

function log(msg) {
  console.log('[TEST]', msg);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
    ignoreHTTPSErrors: true,
  });

  // ============== TEST 1: Homepage ==============
  try {
    const page = await context.newPage();
    log('TEST 1: 访问首页 ' + BASE);
    const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(1500);
    const title = await page.title();
    log('  页面标题: ' + title);

    // 检测是否有明显的应用内容
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    log('  body 前200字符: ' + bodyText.slice(0, 200).replace(/\s+/g, ' '));

    const shot1 = path.join(SHOT_DIR, '01-home-desktop.png');
    await page.screenshot({ path: shot1, fullPage: true });
    log('  截图保存: ' + shot1);

    const status1 = resp && resp.ok() ? 'PASS' : 'FAIL';
    results.push({ test: '1-首页访问', status: status1, http: resp ? resp.status() : 'N/A', title, screenshot: shot1 });
    await page.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '1-首页访问', status: 'FAIL', error: e.message });
  }

  // ============== TEST 2: /pricing ==============
  try {
    const page = await context.newPage();
    log('TEST 2: 访问 /pricing');
    const resp = await page.goto(BASE + '/pricing', { waitUntil: 'networkidle', timeout: 30000 });
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(1500);
    const title = await page.title();
    log('  页面标题: ' + title);

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 600));
    log('  body 前200字符: ' + bodyText.slice(0, 200).replace(/\s+/g, ' '));

    // 检查价格/会员相关关键词
    const hasPrice = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        hasPrice: /价格|会员|套餐|VIP|premium|pricing|元|月|年/i.test(t),
        hasAmount: /\d+\s*(元|￥|¥|\$)/i.test(t),
      };
    });
    log('  含价格关键词: ' + JSON.stringify(hasPrice));

    const shot2 = path.join(SHOT_DIR, '02-pricing.png');
    await page.screenshot({ path: shot2, fullPage: true });
    log('  截图保存: ' + shot2);

    const status2 = (resp && resp.ok() && hasPrice.hasPrice) ? 'PASS' : (resp && resp.ok() ? 'WARN' : 'FAIL');
    results.push({ test: '2-Pricing页面', status: status2, http: resp ? resp.status() : 'N/A', title, hasPrice, screenshot: shot2 });
    await page.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '2-Pricing页面', status: 'FAIL', error: e.message });
  }

  // ============== TEST 3: /workbench/membership ==============
  try {
    const page = await context.newPage();
    log('TEST 3: 访问 /workbench/membership (可能需要登录)');
    const resp = await page.goto(BASE + '/workbench/membership', { waitUntil: 'networkidle', timeout: 30000 });
    log('  最终URL: ' + page.url());
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(1500);
    const title = await page.title();
    log('  页面标题: ' + title);

    const finalUrl = page.url();
    const redirectedToLogin = /login|signin|auth/i.test(finalUrl);
    log('  是否重定向到登录: ' + redirectedToLogin);

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
    log('  body 前200字符: ' + bodyText.slice(0, 200).replace(/\s+/g, ' '));

    const shot3 = path.join(SHOT_DIR, '03-workbench-membership.png');
    await page.screenshot({ path: shot3, fullPage: true });
    log('  截图保存: ' + shot3);

    // 如果重定向到登录页，记录为 PASS（预期行为）；否则若能访问也 PASS
    const status3 = resp && (resp.ok() || resp.status() >= 300 && resp.status() < 400) ? 'PASS' : 'FAIL';
    results.push({ test: '3-Workbench/membership', status: status3, http: resp ? resp.status() : 'N/A', title, finalUrl, redirectedToLogin, screenshot: shot3 });
    await page.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '3-Workbench/membership', status: 'FAIL', error: e.message });
  }

  // ============== TEST 4: 390px Mobile + horizontal overflow ==============
  try {
    const mobCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });
    const page = await mobCtx.newPage();
    log('TEST 4: 390px 手机宽度访问首页');
    const resp = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(2000);

    // 检测横向溢出
    const overflow = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      const vw = window.innerWidth;
      const htmlScrollW = html.scrollWidth;
      const bodyScrollW = body.scrollWidth;
      // 找出最宽的元素
      let maxRight = 0;
      let offender = '';
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const r = el.getBoundingClientRect();
        const right = r.right;
        if (right > maxRight) {
          maxRight = right;
          offender = el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '');
        }
      }
      return {
        viewportWidth: vw,
        htmlScrollWidth: htmlScrollW,
        bodyScrollWidth: bodyScrollW,
        overflowX: htmlScrollW - vw,
        hasHorizontalScrollbar: htmlScrollW > vw,
        maxElementRight: maxRight,
        offender,
      };
    });
    log('  横向溢出检测结果: ' + JSON.stringify(overflow));

    const shot4 = path.join(SHOT_DIR, '04-home-mobile-390.png');
    await page.screenshot({ path: shot4, fullPage: true });
    log('  截图保存: ' + shot4);

    const status4 = overflow.hasHorizontalScrollbar ? 'FAIL' : 'PASS';
    results.push({ test: '4-390px横向溢出', status: status4, overflow, screenshot: shot4 });
    await page.close();
    await mobCtx.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '4-390px横向溢出', status: 'FAIL', error: e.message });
  }

  // ============== TEST 5: /jeepwork/settings/ai 人工复核模式 ==============
  try {
    const page = await context.newPage();
    log('TEST 5: 访问 /jeepwork/settings/ai (后台 AI 设置)');
    const resp = await page.goto(BASE + '/jeepwork/settings/ai', { waitUntil: 'networkidle', timeout: 30000 });
    log('  最终URL: ' + page.url());
    log('  HTTP 状态: ' + (resp ? resp.status() : 'N/A'));
    await page.waitForTimeout(2000);
    const title = await page.title();
    log('  页面标题: ' + title);

    const finalUrl = page.url();
    const redirectedToLogin = /login|signin|auth/i.test(finalUrl);

    const bodyText = await page.evaluate(() => document.body.innerText);
    log('  body 前300字符: ' + bodyText.slice(0, 300).replace(/\s+/g, ' '));

    // 检查"人工复核模式"和"内容安全审核"
    const checks = {
      hasManualReview: bodyText.includes('人工复核模式'),
      hasContentSafety: /内容安全|内容审核|安全审核|内容安全审核/.test(bodyText),
      hasAiSettings: /AI\s*设置|AI\s*配置|AI\s*审核|人工智能/.test(bodyText),
      hasModeration: /moderation|review/i.test(bodyText),
    };
    log('  关键词检查: ' + JSON.stringify(checks, null, 2));

    const shot5 = path.join(SHOT_DIR, '05-jeepwork-settings-ai.png');
    await page.screenshot({ path: shot5, fullPage: true });
    log('  截图保存: ' + shot5);

    let status5;
    if (redirectedToLogin) {
      status5 = 'PASS(重定向登录)';
    } else if (checks.hasManualReview) {
      status5 = 'PASS';
    } else {
      status5 = 'FAIL(未找到"人工复核模式")';
    }
    results.push({ test: '5-AI设置-人工复核模式', status: status5, http: resp ? resp.status() : 'N/A', title, finalUrl, redirectedToLogin, checks, screenshot: shot5, bodyPreview: bodyText.slice(0, 300) });
    await page.close();
  } catch (e) {
    log('  ERROR: ' + e.message);
    results.push({ test: '5-AI设置-人工复核模式', status: 'FAIL', error: e.message });
  }

  await browser.close();

  // ============== 汇总 ==============
  console.log('\n========== 测试结果汇总 ==========');
  let passCount = 0, failCount = 0, warnCount = 0;
  for (const r of results) {
    const s = r.status.toUpperCase();
    console.log(`\n【${r.test}】状态: ${s}`);
    if (s.startsWith('PASS')) passCount++;
    else if (s.startsWith('WARN')) warnCount++;
    else failCount++;
    if (r.http !== undefined) console.log('  HTTP: ' + r.http);
    if (r.title) console.log('  标题: ' + r.title);
    if (r.finalUrl) console.log('  最终URL: ' + r.finalUrl);
    if (r.redirectedToLogin !== undefined) console.log('  重定向到登录: ' + r.redirectedToLogin);
    if (r.overflow) console.log('  溢出: ' + JSON.stringify(r.overflow));
    if (r.checks) console.log('  关键词: ' + JSON.stringify(r.checks));
    if (r.screenshot) console.log('  截图: ' + r.screenshot);
    if (r.error) console.log('  错误: ' + r.error);
  }
  console.log(`\n合计: PASS=${passCount}  WARN=${warnCount}  FAIL=${failCount}`);

  // 写出 JSON 结果
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('结果已写入: ' + path.join(__dirname, 'results.json'));
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
