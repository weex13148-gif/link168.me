# Link168 数据库恢复脚本（PowerShell / Windows）
# 使用方法：
#   .\scripts\db\restore-db.ps1 -BackupFile "backups\link168-xxxx.sql.gz"
# 环境变量要求：
#   DATABASE_URL（必需，PostgreSQL 连接串）
#   PGPASSWORD（可选，若未提供则从 DATABASE_URL 解析）
# 安全说明：
#   * 默认不覆盖生产数据库（通过 --confirm-overwrite-prod 显式确认后才会覆盖）
#   * 生产数据库检测：host 包含 "prod" / "production" / 数据库名以 "prod" 开头
#   * 本脚本不打印完整 DATABASE_URL
param(
    [Parameter(Mandatory=$true)][string]$BackupFile,
    [switch]$ConfirmOverwriteProd = $false
)

$ErrorActionPreference = "Stop"

function Write-Timestamp([string]$Message) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[${ts}] ${Message}"
}

function Redact-ConnectionString([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return "<missing>" }
    if ($Value.Length -le 12) { return "****" }
    return ($Value.Substring(0, 12) + "****")
}

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
    Write-Error "环境变量 DATABASE_URL 未设置，无法恢复。"
    exit 2
}

$connectionUrl = $env:DATABASE_URL
$match = [regex]::Match($connectionUrl, "^postgresql://([^:@/?#]+)(?::([^@/?#]*))?@([A-Za-z0-9\.\-_]+)(?::(\d+))?/([A-Za-z0-9_\-]+)")
if (-not $match.Success) {
    Write-Error "DATABASE_URL 无法解析为 PostgreSQL 连接串（got=$(Redact-ConnectionString $connectionUrl)）"
    exit 2
}

$dbUser = $match.Groups[1].Value
$dbPasswordRaw = $match.Groups[2].Value
$dbHost = $match.Groups[3].Value
$dbPortRaw = $match.Groups[4].Value
$dbName = $match.Groups[5].Value
$dbPort = if ([string]::IsNullOrWhiteSpace($dbPortRaw)) { "5432" } else { $dbPortRaw }

if (-not [string]::IsNullOrWhiteSpace($dbPasswordRaw) -and [string]::IsNullOrWhiteSpace($env:PGPASSWORD)) {
    $env:PGPASSWORD = $dbPasswordRaw
}

# 检测生产数据库
$isProd = ($dbHost -match "(prod(uction)?)") -or ($dbName -match "^prod")
if ($isProd) {
    if (-not $ConfirmOverwriteProd) {
        Write-Error "检测到生产数据库（host=$(Redact-ConnectionString $dbHost)，必须显式添加 -ConfirmOverwriteProd 参数后才能继续。"
        exit 5
    }
    Write-Timestamp "WARNING：将覆盖生产数据库。请确保已完成最新备份！"
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "备份文件不存在：${BackupFile}"
    exit 3
}

$BackupFile = (Resolve-Path $BackupFile).Path
$timeStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = "$($BackupFile).restore-${timeStamp}.log"
$tempSql = "$env:TEMP\link168-restore-${timeStamp}.sql"
$isGz = $BackupFile -like "*.gz"

if ($isGz) {
    Write-Timestamp "使用 gzip 解压：${BackupFile}"
    try {
        $sourceStream = [System.IO.File]::OpenRead($BackupFile)
        $destStream = [System.IO.File]::Create($tempSql)
        $gzipStream = New-Object System.IO.Compression.GZipStream($sourceStream, [System.IO.Compression.CompressionMode]::Decompress)
        $gzipStream.CopyTo($destStream)
        $gzipStream.Dispose()
        $destStream.Dispose()
        $sourceStream.Dispose()
    } catch {
        Write-Error "解压备份失败：$_"
        exit 4
    }
} else {
    Copy-Item $BackupFile $tempSql
}

Write-Timestamp "开始恢复 PostgreSQL：host=${dbHost}:${dbPort} db=${dbName} user=${dbUser}"
Write-Timestamp "来源备份文件：${BackupFile}"

try {
    $psqlArgs = @(
        "--host=$dbHost",
        "--port=$dbPort",
        "--username=$dbUser",
        "--dbname=$dbName",
        "--file=$tempSql"
    )
    $output = & psql @psqlArgs 2>&1
    $exitCode = $LASTEXITCODE
    $output | Out-File -FilePath $logFile -Encoding utf8
    if ($exitCode -ne 0) {
        Write-Error "psql 返回非零退出码：${exitCode}，日志：${logFile}"
        exit 6
    }
    Write-Timestamp "恢复完成：${BackupFile}（日志：${logFile}）"
} finally {
    if (Test-Path $tempSql) { Remove-Item $tempSql -Force }
}
