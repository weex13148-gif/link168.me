import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

function listTypeScriptFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(absolute));
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

function isDbProductCall(node: ts.CallExpression): boolean {
  const expression = node.expression;
  if (!ts.isPropertyAccessExpression(expression)) return false;
  const modelAccess = expression.expression;
  return ts.isPropertyAccessExpression(modelAccess)
    && ts.isIdentifier(modelAccess.expression)
    && modelAccess.expression.text === "db"
    && modelAccess.name.text === "product";
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function legacyProductFieldLocations(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings: string[] = [];

  function inspectArgument(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && propertyNameText(node.name) === "isActive") {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push(`${path.relative(process.cwd(), filePath)}:${position.line + 1}`);
    }
    ts.forEachChild(node, inspectArgument);
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && isDbProductCall(node)) {
      for (const argument of node.arguments) inspectArgument(argument);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

describe("Phase 2 Product status persistence cutover", () => {
  test("no Prisma Product operation reads or writes the removed isActive field", () => {
    const findings = listTypeScriptFiles(path.join(process.cwd(), "src"))
      .flatMap(legacyProductFieldLocations)
      .sort();

    expect(findings).toEqual([]);
  });
});
