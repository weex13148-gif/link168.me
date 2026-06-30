#!/bin/bash
set -e

echo "=== Link168 Dashboard Hook #310 修复部署脚本 ==="
echo ""

SOURCE_DIR="/www/link168-new"
PATCH_FILE="/tmp/dashboard-page.tsx"
TEMP_DIR="/tmp/link168-build-$$"
PM2_APP="link168"
TARGET_FILE="src/app/dashboard/page.tsx"

echo "[1/8] 检查补丁文件..."
if [ ! -f "$PATCH_FILE" ]; then
  echo "错误: 补丁文件不存在: $PATCH_FILE"
  exit 1
fi
echo "  补丁文件存在: $PATCH_FILE"

echo ""
echo "[2/8] 检查补丁中 Hook 位置..."
LOADING_LINE=$(grep -n "if (state.loading)" "$PATCH_FILE" | head -1 | cut -d: -f1)
RESENDING_LINE=$(grep -n "const \[resendingEmail" "$PATCH_FILE" | head -1 | cut -d: -f1)
HANDLE_LINE=$(grep -n "handleResendVerificationEmail = useCallback" "$PATCH_FILE" | head -1 | cut -d: -f1)

if [ -z "$LOADING_LINE" ] || [ -z "$RESENDING_LINE" ] || [ -z "$HANDLE_LINE" ]; then
  echo "错误: 无法在补丁文件中找到关键代码"
  exit 1
fi

if [ "$RESENDING_LINE" -gt "$LOADING_LINE" ]; then
  echo "错误: resendingEmail useState 仍然在 loading return 之后！"
  echo "  useState 行: $RESENDING_LINE"
  echo "  loading return 行: $LOADING_LINE"
  exit 1
fi

if [ "$HANDLE_LINE" -gt "$LOADING_LINE" ]; then
  echo "错误: handleResendVerificationEmail 仍然在 loading return 之后！"
  echo "  handle 行: $HANDLE_LINE"
  echo "  loading return 行: $LOADING_LINE"
  exit 1
fi

echo "  验证通过: resendingEmail useState (行$RESENDING_LINE) 在 loading return (行$LOADING_LINE) 之前"
echo "  验证通过: handleResendVerificationEmail (行$HANDLE_LINE) 在 loading return (行$LOADING_LINE) 之前"

echo ""
echo "[3/8] 检查 PM2 状态..."
if pm2 status "$PM2_APP" 2>/dev/null | grep -q "online\|errored\|stopped"; then
  pm2 status "$PM2_APP" | grep "$PM2_APP" | head -1
else
  echo "警告: 无法获取 PM2 状态，继续..."
fi

echo ""
echo "[4/8] 创建临时构建目录 (排除 .next 和 node_modules)..."
mkdir -p "$TEMP_DIR"
rsync -a --exclude='.next' --exclude='node_modules' "$SOURCE_DIR/" "$TEMP_DIR/"
echo "  临时目录: $TEMP_DIR"
echo "  文件大小: $(du -sh "$TEMP_DIR" | cut -f1)"

echo ""
echo "[5/8] 链接 node_modules 并应用补丁..."
rm -rf "$TEMP_DIR/node_modules"
ln -s "$SOURCE_DIR/node_modules" "$TEMP_DIR/node_modules"
cp "$PATCH_FILE" "$TEMP_DIR/$TARGET_FILE"
echo "  补丁已应用到: $TEMP_DIR/$TARGET_FILE"

echo ""
echo "[6/8] 开始构建 (PM2 保持运行)..."
cd "$TEMP_DIR"

export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

BUILD_START=$(date +%s)
if npm run build 2>&1; then
  BUILD_END=$(date +%s)
  BUILD_DURATION=$((BUILD_END - BUILD_START))
  echo "  构建成功，耗时 ${BUILD_DURATION} 秒"
else
  BUILD_EXIT=$?
  echo "  构建失败 (exit code: $BUILD_EXIT)"
  echo ""
  echo "=== 构建失败，保持现有网站运行 ==="
  echo "临时目录保留在: $TEMP_DIR"
  echo "请检查上述错误后手动清理"
  exit $BUILD_EXIT
fi

echo ""
echo "[7/8] 替换正式 .next 和源码 (短暂停机)..."

pm2 stop "$PM2_APP" 2>/dev/null || true
sleep 2

rm -rf "$SOURCE_DIR/.next"
mv "$TEMP_DIR/.next" "$SOURCE_DIR/.next"

cp "$PATCH_FILE" "$SOURCE_DIR/$TARGET_FILE"

pm2 start "$PM2_APP" --update-env 2>/dev/null || pm2 restart "$PM2_APP" --update-env 2>/dev/null || true
sleep 3

pm2 save 2>/dev/null || true

echo ""
echo "[8/8] 验证部署..."

PM2_STATUS=$(pm2 status "$PM2_APP" 2>/dev/null | grep "$PM2_APP" | head -1)
echo "  PM2 状态: $PM2_STATUS"

sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "000")
echo "  本机首页 HTTP: $HTTP_CODE"

LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/login 2>/dev/null || echo "000")
echo "  登录页 HTTP: $LOGIN_CODE"

echo ""
echo "=== 清理临时文件 ==="
rm -rf "$TEMP_DIR"
rm -f /tmp/dashboard-hook310-* 2>/dev/null || true
echo "  已清理临时构建目录"

echo ""
echo "=========================================="
echo "  部署完成！"
echo "  PM2 应用: $PM2_APP"
echo "  修复文件: $TARGET_FILE"
echo "  额外费用: 0 元"
echo "=========================================="
echo ""
echo "请在浏览器中验证:"
echo "  1. 登录后访问 /dashboard"
echo "  2. 刷新页面"
echo "  3. 检查控制台是否还有 React error #310"
echo ""
