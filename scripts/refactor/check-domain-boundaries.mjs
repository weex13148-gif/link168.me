import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const rootArgument = process.argv.find((argument) => argument.startsWith("--root="));
const domainRoot = path.resolve(
  process.cwd(),
  rootArgument ? rootArgument.slice("--root=".length) : "src/domains",
);
const forbiddenPrefixes = ["@/app/", "@/components/", "@/infrastructure/"];

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function moduleSpecifierFor(node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }

  if (ts.isCallExpression(node) && node.arguments.length === 1) {
    const [argument] = node.arguments;
    const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const isRequire =
      ts.isIdentifier(node.expression) && node.expression.text === "require";
    if ((isDynamicImport || isRequire) && ts.isStringLiteralLike(argument)) {
      return argument;
    }
  }

  return null;
}

const violations = [];
for (const filePath of collectSourceFiles(domainRoot)) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    const moduleSpecifier = moduleSpecifierFor(node);
    if (
      moduleSpecifier &&
      forbiddenPrefixes.some((prefix) => moduleSpecifier.text.startsWith(prefix))
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(
        moduleSpecifier.getStart(sourceFile),
      );
      violations.push({
        file: path.relative(process.cwd(), filePath).replaceAll(path.sep, "/"),
        line: position.line + 1,
        module: moduleSpecifier.text,
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `DOMAIN_BOUNDARY_VIOLATION ${violation.file}:${violation.line} ${violation.module}`,
    );
  }
  process.exit(1);
}

console.log("DOMAIN_BOUNDARIES_OK");
