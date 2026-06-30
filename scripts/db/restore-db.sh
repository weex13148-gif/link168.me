#!/usr/bin/env bash
# Link168 数据库恢复脚本（Bash / Linux & macOS）
# 使用方法：
#   bash scripts/db/restore-db.sh --backup-file backups/link168-xxxx.sql.gz
#   # 如需覆盖生产数据库，需显式添加：--confirm-overwrite-prod
# 环境变量要求：
#   DATABASE_URL（必需，PostgreSQL 连接串）
#   PGPASSWORD（可选，若未提供则从 DATABASE_URL 解析）
# 安全说明：
#   * 默认不覆盖生产数据库（host 包含 prod/production 或 db 名以 prod 开头视为生产）
#   * 本脚本不打印完整 DATABASE_URL

set -euo pipefail

BACKUP_FILE=""
CONFIRM_OVERWRITE_PROD="no"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --backup-file|-f)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --confirm-overwrite-prod)
            CONFIRM_OVERWRITE_PROD="yes"
            shift
            ;;
        --help|-h)
            echo "用法：bash scripts/db/restore-db.sh --backup-file <file> [--confirm-overwrite-prod]"
            exit 0
            ;;
        *)
            echo "未知参数：$1" >&2
            exit 2
            ;;
    esac
done

ts() {
    date '+%Y-%m-%d %H:%M:%S'
}

redact_cs() {
    local value="$1"
    if [ -z "$value" ]; then echo "<missing>"; return; fi
    echo "${value:0:12}****"
}

if [ -z "$BACKUP_FILE" ]; then
    echo "[$(ts)] 必须通过 --backup-file 指定备份文件路径。" >&2
    exit 2
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "[$(ts)] 环境变量 DATABASE_URL 未设置，无法恢复。" >&2
    exit 2
fi

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

# 生产数据库检测
is_prod="no"
if [[ "$DB_HOST" =~ prod(uction)? || "$DB_NAME" =~ ^prod ]]; then
    is_prod="yes"
fi

if [ "$is_prod" = "yes" ] && [ "$CONFIRM_OVERWRITE_PROD" != "yes" ]; then
    echo "[$(ts)] 检测到生产数据库（host=$(redact_cs "$DB_HOST") db=$(redact_cs "$DB_NAME")），必须显式添加 --confirm-overwrite-prod 参数才能继续。" >&2
    exit 5
fi

if [ "$is_prod" = "yes" ]; then
    echo "[$(ts)] WARNING：将覆盖生产数据库。请确保已完成最新备份！"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[$(ts)] 备份文件不存在：${BACKUP_FILE}" >&2
    exit 3
fi

BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${BACKUP_FILE}.restore-${TIMESTAMP}.log"
TEMP_SQL="/tmp/link168-restore-${TIMESTAMP}.sql"

case "$BACKUP_FILE" in
    *.gz) IS_GZ="yes" ;;
    *) IS_GZ="no" ;;
esac

if [ "$IS_GZ" = "yes" ]; then
    echo "[$(ts)] 使用 gzip 解压：${BACKUP_FILE}"
    if ! gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"; then
        echo "[$(ts)] 解压备份失败：${BACKUP_FILE}" >&2
        rm -f "$TEMP_SQL"
        exit 4
    fi
else
    cp "$BACKUP_FILE" "$TEMP_SQL"
fi

echo "[$(ts)] 开始恢复 PostgreSQL：host=${DB_HOST}:${DB_PORT} db=${DB_NAME} user=${DB_USER}"
echo "[$(ts)] 来源备份文件：${BACKUP_FILE}"

if ! command -v psql >/dev/null 2>&1; then
    echo "[$(ts)] 未检测到 psql 命令，请先安装 PostgreSQL 客户端。" >&2
    rm -f "$TEMP_SQL"
    exit 3
fi

set +e
psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --file="$TEMP_SQL" > "$LOG_FILE" 2>&1
PSQL_EXIT=$?
set -e

rm -f "$TEMP_SQL"

if [ "$PSQL_EXIT" -ne 0 ]; then
    echo "[$(ts)] psql 返回非零退出码：${PSQL_EXIT}，日志：${LOG_FILE}" >&2
    exit 6
fi

echo "[$(ts)] 恢复完成：${BACKUP_FILE}（日志：${LOG_FILE}）"
