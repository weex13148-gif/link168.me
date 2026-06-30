#!/bin/bash
echo "=== 构建进程状态 ==="
ps aux | grep -E 'next|npm|node' | grep -v grep | head -10
echo ""
echo "=== PM2 状态 ==="
pm2 status link168 --no-color | grep link168
echo ""
echo "=== 首页 HTTP ==="
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/ --max-time 5
echo ""
echo "=== .next 目录大小 ==="
du -sh /www/link168-new/.next 2>/dev/null || echo "no .next yet"
