// Part 1: helpers + cover + sections 1-6
const fs = require("fs");
const path = require("path");
const { Document, Paragraph, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ImageRun, TextRun, BorderStyle, PageBreak } = require("docx");

const SHOTS_DIR = path.resolve(__dirname, "..", "temp-screenshots");

function p(text, indent) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 100, after: 100, line: 360 },
    indent: indent ? { firstLine: 480 } : undefined,
    children: [new TextRun({ text, font: "Microsoft YaHei", size: 21, color: "333333" })],
  });
}

function heading(text, level) {
  const sizeMap = { 1: 40, 2: 28, 3: 24 };
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 160, line: 360 },
    children: [new TextRun({ text, font: "Microsoft YaHei", size: sizeMap[level] || 24, bold: true, color: "1F3864" })],
  });
}

function buildTable(headers, rows, widths) {
  const mkCell = (text, opts) => new TableCell({
    width: { size: opts.width || 2500, type: WidthType.DXA },
    verticalAlign: "center",
    shading: opts.header ? { fill: "1F3864" } : opts.alt ? { fill: "F2F2F2" } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 320 }, children: [new TextRun({ text: String(text), font: "Microsoft YaHei", size: 20, bold: !!opts.header, color: opts.header ? "FFFFFF" : "333333" })] })],
  });
  const w = widths || headers.map(() => Math.floor(9000 / headers.length));
  const headerRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => mkCell(h, { header: true, width: w[i] })) });
  const bodyRows = rows.map((r, idx) => new TableRow({ children: r.map((c, i) => mkCell(c, { alt: idx % 2 === 1, width: w[i] })) }));
  return new Table({ width: { size: 9000, type: WidthType.DXA }, rows: [headerRow, ...bodyRows], borders: { top: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB" }, left: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB" }, right: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB" }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } } });
}

function imageParagraph(fileName, caption, widthInches = 5.2) {
  const filePath = path.join(SHOTS_DIR, fileName);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 4096) {
    return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120 }, children: [new TextRun({ text: `【截图待补：${fileName}】`, italics: true, font: "Microsoft YaHei", size: 18, color: "999999" })] })];
  }
  const buf = fs.readFileSync(filePath);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 }, children: [new ImageRun({ data: buf, transformation: { width: widthInches, height: widthInches * 0.62 } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 200 }, children: [new TextRun({ text: caption, font: "Microsoft YaHei", size: 18, italics: true, color: "555555" })] }),
  ];
}

module.exports = { p, heading, buildTable, imageParagraph };
