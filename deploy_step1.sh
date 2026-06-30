#!/bin/bash
set -e

echo "=== Step 1: 验证补丁和服务器状态 ==="

if [ ! -f /tmp/dashboard-page.tsx ]; then
  echo "ERROR: /tmp/dashboard-page.tsx not found"
  exit 1
fi
echo "补丁文件: $(ls -lh /tmp/dashboard-page.tsx | awk '{print $5, $9}')"

LOADING_LINE=$(grep -n 'if (state.loading)' /tmp/dashboard-page.tsx | head -1 | cut -d: -f1)
RESENDING_LINE=$(grep -n 'const \[resendingEmail' /tmp/dashboard-page.tsx | head -1 | cut -d: -f1)
HANDLE_LINE=$(grep -n 'handleResendVerificationEmail = useCallback' /tmp/dashboard-page.tsx | head -1 | cut -d: -f1)

echo "loading return 行: $LOADING_LINE"
echo "resendingEmail useState 行: $RESENDING_LINE"
echo "handleResendVerificationEmail 行: $HANDLE_LINE"

if [ "$RESENDING_LINE" -lt "$LOADING_LINE" ]; then
  echo "OK: resendingEmail 在 loading return 之前"
else
  echo "ERROR: resendingEmail 在 loading return 之后"
  exit 1
fi

if [ "$HANDLE_LINE" -lt "$LOADING_LINE" ]; then
  echo "OK: handleResendVerificationEmail 在 loading return 之前"
else
  echo "ERROR: handleResendVerificationEmail 在 loading return 之后"
  exit 1
fi

echo ""
echo "=== PM2 状态 ==="
pm2 status link168 --no-color 2>&1 | head -10

echo ""
echo "=== 项目目录 ==="
ls -la /www/link168-new/ | head -15
