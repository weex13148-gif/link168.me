#!/bin/bash
set -e

echo "=== 清理临时构建目录 ==="
rm -rf /www/link168-build-tmp
echo "已清理 /www/link168-build-tmp"

echo ""
echo "=== 当前 PM2 状态 ==="
pm2 status link168 --no-color | grep link168

echo ""
echo "=== 备份正式目录源码 ==="
cp /www/link168-new/src/app/dashboard/page.tsx /tmp/dashboard-page-original.tsx
echo "原始源码已备份到 /tmp/dashboard-page-original.tsx"

echo ""
echo "=== 应用补丁到正式目录源码 ==="
cp /tmp/dashboard-page.tsx /www/link168-new/src/app/dashboard/page.tsx
echo "补丁已应用"

RESENDING_LINE=$(grep -n 'const \[resendingEmail' /www/link168-new/src/app/dashboard/page.tsx | head -1 | cut -d: -f1)
LOADING_LINE=$(grep -n 'if (state.loading)' /www/link168-new/src/app/dashboard/page.tsx | head -1 | cut -d: -f1)
echo "resendingEmail 行: $RESENDING_LINE"
echo "loading return 行: $LOADING_LINE"

if [ "$RESENDING_LINE" -lt "$LOADING_LINE" ]; then
  echo "OK: Hook 在早期返回之前"
else
  echo "ERROR: Hook 在早期返回之后"
  exit 1
fi

echo ""
echo "=== 准备在正式目录构建（PM2 保持运行）==="
echo "注意：构建期间 PM2 运行的是已加载的旧 .next，不受影响"
