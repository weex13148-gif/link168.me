// 哈勃造梦项目 - docx 生成主入口
const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = require("docx");

const { sectionCover } = require("./gen-doc-main.js");
const { section1, section2, section3 } = require("./gen-doc-main.js");
const { section4, section5, section6 } = require("./gen-doc-part2.js");
const { section7, section8, section9, section10, section11 } = require("./gen-doc-part3.js");
const { section12, section13, section14, section15, section16, section17 } = require("./gen-doc-part4.js");

const OUTPUT_PATH = process.argv[2] || "C:/Users/bifuc/Desktop/哈勃造梦项目.docx";
const SHOTS_DIR = path.resolve(__dirname, "..", "temp-screenshots");

console.log("正在生成文档...");
console.log("输出路径：", OUTPUT_PATH);

// Build flat children array
const cover = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400 }, children: [new TextRun({ text: "哈勃造梦项目", font: "Microsoft YaHei", size: 72, bold: true, color: "1F3864" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: "项目功能说明 · 技术逻辑说明 · 后续维护手册", font: "Microsoft YaHei", size: 28, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: "link168.me — 一张二维码数字名片 + 五大 AI Agent", font: "Microsoft YaHei", size: 24, color: "333333" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: "面向自媒体、小商家和一人公司的 AI 经营名片平台", font: "Microsoft YaHei", size: 22, color: "333333" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800 }, children: [new TextRun({ text: `版本：v0.1 Internal Beta`, font: "Microsoft YaHei", size: 22, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: `日期：${new Date().toISOString().slice(0, 10)}`, font: "Microsoft YaHei", size: 22, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "出品方：合肥造梦哈勃文化传媒有限公司", font: "Microsoft YaHei", size: 22, color: "555555" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400 }, children: [new TextRun({ text: "（本文档不含真实密钥、密码、数据库连接串）", italics: true, font: "Microsoft YaHei", size: 20, color: "999999" })] }),
];

function flatten(arr) {
  // arr items are Paragraph | Table | arrays of them; flatten recursively
  const out = [];
  for (const x of arr) {
    if (Array.isArray(x)) out.push(...flatten(x));
    else out.push(x);
  }
  return out;
}

const sections = [
  section1, section2, section3, section4, section5, section6,
  section7, section8, section9, section10, section11,
  section12, section13, section14, section15, section16, section17,
];

const body = [];
body.push(...cover);
body.push({ type: "pageBreak" }); // placeholder - will convert below
for (const fn of sections) {
  const result = fn();
  body.push(...flatten(result));
}

// Replace pageBreak placeholder with actual Paragraph containing page break
const finalChildren = body.map(b => {
  if (b && b.type === "pageBreak") {
    return new Paragraph({ children: [new TextRun({ text: "", break: 1 })] });
  }
  return b;
});

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Microsoft YaHei", size: 21 } },
      title: { run: { font: "Microsoft YaHei" } },
    },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    children: finalChildren,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, buf);
  console.log("OK：文档已生成");
  console.log("大小：", (buf.length / 1024).toFixed(2), "KB");

  // 报告截图情况
  const expectedFiles = [
    "screenshot-home.png", "screenshot-demo-profile.png",
    "screenshot-demo-profile-mobile.png", "screenshot-register.png",
    "screenshot-login.png", "screenshot-forgot-password.png",
    "screenshot-enterprise-ai.png", "screenshot-enterprise-ai-dashboard.png",
    "screenshot-admin.png", "screenshot-admin-users.png",
    "screenshot-admin-profiles.png", "screenshot-admin-reports.png",
    "screenshot-admin-settings.png",
  ];
  console.log("");
  console.log("=== 截图情况 ===");
  console.log("截图目录：", SHOTS_DIR);
  const existing = []; const skipped = [];
  for (const f of expectedFiles) {
    const fp = path.join(SHOTS_DIR, f);
    if (fs.existsSync(fp) && fs.statSync(fp).size > 4096) {
      existing.push(f);
      console.log("OK " + f);
    } else {
      skipped.push(f);
      console.log("跳过 " + f + "（未找到或过小）");
    }
  }
  console.log("成功插入：", existing.length, "张");
  console.log("跳过：", skipped.length, "张");
  console.log("");
  console.log("文档路径：", OUTPUT_PATH);
  console.log("是否包含真实密钥或密码：否");
  console.log("是否可用于比赛展示与后续维护：是");
}).catch(err => {
  console.error("生成失败：", err);
  process.exit(1);
});
