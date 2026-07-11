import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

const rootFiles = [
  'PRODUCT_CONSTITUTION.md',
  'PRD.md',
  'PROJECT_RULES.md',
  'DOCUMENT_INDEX.md',
  'README.md',
];

const governanceFiles = [
  'docs/governance/02_CODE_MAP.md',
  'docs/governance/03_MODULE_BOUNDARY.md',
  'docs/governance/04_VERSION_FREEZE.md',
  'docs/governance/05_AGENT_GOVERNANCE.md',
  'docs/governance/06_NAMING_STANDARD.md',
  'docs/governance/07_ARCHITECTURE_DECISIONS.md',
  'docs/governance/08_DEVELOPMENT_RULES.md',
  'docs/governance/09_SECURITY_DATA_OPERATIONS.md',
];

const requiredFiles = [...rootFiles, ...governanceFiles];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`缺少必需文件: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function extractVersion(relativePath, content) {
  const match = content.match(/\*\*版本：\*\*\s*([^\s]+)/u);
  if (!match) {
    errors.push(`无法读取版本号: ${relativePath}`);
    return null;
  }
  return match[1].trim();
}

const contents = new Map(requiredFiles.map((file) => [file, read(file)]));

const constitutionVersion = extractVersion(
  'PRODUCT_CONSTITUTION.md',
  contents.get('PRODUCT_CONSTITUTION.md'),
);
const prdVersion = extractVersion('PRD.md', contents.get('PRD.md'));
const projectRulesVersion = extractVersion(
  'PROJECT_RULES.md',
  contents.get('PROJECT_RULES.md'),
);

for (const file of governanceFiles) {
  const content = contents.get(file);
  if (!content) continue;

  const requiredReferences = [
    ['PRODUCT_CONSTITUTION.md', constitutionVersion],
    ['PRD.md', prdVersion],
    ['PROJECT_RULES.md', projectRulesVersion],
  ];

  if (!content.includes('上位规则')) {
    errors.push(`${file} 缺少“上位规则”声明`);
  }

  for (const [name, version] of requiredReferences) {
    if (!content.includes(name)) {
      errors.push(`${file} 未引用 ${name}`);
    }
    if (version && !content.includes(version)) {
      errors.push(`${file} 未引用 ${name} 当前版本 ${version}`);
    }
  }
}

const indexContent = contents.get('DOCUMENT_INDEX.md');
const readmeContent = contents.get('README.md');
for (const file of governanceFiles) {
  if (indexContent && !indexContent.includes(file)) {
    errors.push(`DOCUMENT_INDEX.md 未登记 ${file}`);
  }

  const readmeEntry = path.basename(file);
  if (readmeContent && !readmeContent.includes(readmeEntry)) {
    errors.push(`README.md 未列出 ${readmeEntry}`);
  }
}

const governanceDir = path.join(root, 'docs', 'governance');
if (fs.existsSync(governanceDir)) {
  const numberedFiles = fs
    .readdirSync(governanceDir)
    .filter((name) => /^\d{2}_.+\.md$/u.test(name));
  const prefixes = new Map();
  for (const name of numberedFiles) {
    const prefix = name.slice(0, 2);
    if (prefixes.has(prefix)) {
      errors.push(`治理文件编号重复: ${prefixes.get(prefix)} 与 ${name}`);
    } else {
      prefixes.set(prefix, name);
    }
  }
}

const rootMarkdownFiles = fs
  .readdirSync(root)
  .filter((name) => name.endsWith('.md'));
const shadowConstitutions = rootMarkdownFiles.filter(
  (name) =>
    name !== 'PRODUCT_CONSTITUTION.md' &&
    /^PRODUCT_CONSTITUTION.*\.md$/u.test(name),
);
const shadowPrds = rootMarkdownFiles.filter(
  (name) => name !== 'PRD.md' && /^PRD(?:_|-).*\.md$/u.test(name),
);
for (const name of shadowConstitutions) {
  errors.push(`根目录存在并行产品宪法: ${name}`);
}
for (const name of shadowPrds) {
  errors.push(`根目录存在并行 PRD: ${name}`);
}

if (errors.length > 0) {
  console.error('治理检查失败:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `治理检查通过：${requiredFiles.length} 个必需文件存在，版本引用、索引与编号一致。`,
);
