#!/bin/bash
set -e

echo "=== Step 2: 创建临时构建目录 ==="

TEMP_DIR="/tmp/link168-build"
SOURCE_DIR="/www/link168-new"
PATCH_FILE="/tmp/dashboard-page.tsx"

if [ -d "$TEMP_DIR" ]; then
  echo "清理旧临时目录..."
  rm -rf "$TEMP_DIR"
fi

mkdir -p "$TEMP_DIR"

echo "复制项目文件 (排除 .next 和 node_modules)..."
cd "$SOURCE_DIR"
find . -maxdepth 1 -not -name '.next' -not -name 'node_modules' -not -name '.' -exec cp -r {} "$TEMP_DIR/" \;

for d in src prisma public app scripts lib components types; do
  if [ -d "$SOURCE_DIR/$d" ]; then
    cp -r "$SOURCE_DIR/$d" "$TEMP_DIR/"
  fi
done

cp "$SOURCE_DIR"/package.json "$TEMP_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR"/package-lock.json "$TEMP_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR"/tsconfig.json "$TEMP_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR"/next.config.* "$TEMP_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR"/postcss.config.* "$TEMP_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR"/tailwind.config.* "$TEMP_DIR/" 2>/dev/null || true
cp "$SOURCE_DIR"/.env* "$TEMP_DIR/" 2>/dev/null || true

echo "链接 node_modules..."
rm -rf "$TEMP_DIR/node_modules"
ln -s "$SOURCE_DIR/node_modules" "$TEMP_DIR/node_modules"

echo "应用补丁..."
cp "$PATCH_FILE" "$TEMP_DIR/src/app/dashboard/page.tsx"

echo "验证补丁已应用..."
RESENDING_LINE=$(grep -n 'const \[resendingEmail' "$TEMP_DIR/src/app/dashboard/page.tsx" | head -1 | cut -d: -f1)
LOADING_LINE=$(grep -n 'if (state.loading)' "$TEMP_DIR/src/app/dashboard/page.tsx" | head -1 | cut -d: -f1)
echo "  resendingEmail 行: $RESENDING_LINE"
echo "  loading return 行: $LOADING_LINE"

echo ""
echo "临时目录大小: $(du -sh "$TEMP_DIR" | cut -f1)"
echo "临时目录路径: $TEMP_DIR"
echo "PM2 状态: $(pm2 status link168 --no-color 2>/dev/null | grep link168 | awk '{print $10}')"
echo ""
echo "=== 准备构建 ==="
