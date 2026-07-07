#!/usr/bin/env bash
# Link168 数据库备份脚本（Bash / Linux & macOS）
# 使用方法：
#   bash scripts/db/backup-db.sh [output-dir]
# 环境变量要求：
#   DATABASE_URL（必需，PostgreSQL 连接串）
#   PGPASSWORD（可选，若未提供则从 DATABASE_URL 解析）
# 本脚本不打印完整 DATABASE_URL，仅在出现错误时输出"已截断"的连接串前缀。

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"

ts() {
    date '+%Y-%m-%d %H:%M:%S'
}

redact_cs() {
    local value="$1"
    if [ -z "$value" ]; then
        echo "<missing>"
        return
    fi
    local prefix="${value:0:12}"
    echo "${prefix}****"
}

if [ -z "${DATABASE_URL:-}" ]; then
    echo "[$(ts)] 环境变量 DATABASE_URL 未设置，无法备份。" >&2
    exit 2
fi

# 解析 DATABASE_URL：postgresql://user:password@host:port/dbname
if ! [[ "$DATABASE_URL" =~ ^postgresql://([^:@/?#]+):?([^@/?#]*)@([A-Za-z0-9._-]+):?([0-9]*)/([A-Za-z0-9_-]+) ]]; then
    echo "[$(ts)] DATABASE_URL 无法解析为 PostgreSQL 连接串（got=$(redact_cs "$DATABASE_URL")）" >&2
    exit 2
fi

DB_USER="${BASH_REMATCH[1]}"
DB_PASSWORD="${BASH_REMATCH[2]}"
DB_HOST="${BASH_REMATCH[3]}"
DB_PORT="${BASH_REMATCH[4]:-5432}"
DB_NAME="${BASH_REMATCH[5]}"

if [ -n "$DB_PASSWORD" ] && [ -z "${PGPASSWORD:-}" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${OUTPUT_DIR}/link168-${DB_NAME}-${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "[$(ts)] 开始备份 PostgreSQL：host=${DB_HOST}:${DB_PORT} db=${DB_NAME} user=${DB_USER}（DATABASE_URL=$(redact_cs "$DATABASE_URL")）"

if ! command -v pg_dump >/dev/null 2>&1; then
    echo "[$(ts)] 未检测到 pg_dump 命令，请先安装 PostgreSQL 客户端。" >&2
    exit 3
fi

pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-owner --no-privileges --no-acl \
    --clean --if-exists \
    --file="$BACKUP_FILE"

UNCOMPRESSED_SIZE="$(wc -c <"$BACKUP_FILE" | tr -d ' ')"

if command -v gzip >/dev/null 2>&1; then
    gzip -9 -f "$BACKUP_FILE"
else
    echo "[$(ts)] 未检测到 gzip 命令，保持未压缩文件。" >&2
    COMPRESSED_FILE="$BACKUP_FILE"
fi

if [ -f "$COMPRESSED_FILE" ]; then
    COMPRESSED_SIZE="$(wc -c <"$COMPRESSED_FILE" | tr -d ' ')"
    echo "[$(ts)] 备份完成：${COMPRESSED_FILE}（原始=${UNCOMPRESSED_SIZE}B 压缩后=${COMPRESSED_SIZE}B）"
else
    echo "[$(ts)] 备份失败：未发现输出文件 ${COMPRESSED_FILE}" >&2
    exit 4
fi
