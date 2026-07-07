# Link168 数据库备份脚本（PowerShell / Windows）
# 使用方法：
#   .\scripts\db\backup-db.ps1 -OutputDir "..\backups"
# 环境变量要求：
#   DATABASE_URL（必需，PostgreSQL 连接串）
#   PGPASSWORD（可选，若未提供则从 DATABASE_URL 解析）
# 本脚本不打印完整 DATABASE_URL，仅在出现错误时输出"已截断"的连接串前缀。
param(
    [string]$OutputDir = "$(Get-Location)\backups"
)

$ErrorActionPreference = "Stop"

function Write-Timestamp([string]$Message) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[${ts}] ${Message}"
}

function Redact-ConnectionString([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return "<missing>" }
    # 只保留最多前 12 个字符 + "****"，避免泄漏完整连接串
    if ($Value.Length -le 12) { return "****" }
    return ($Value.Substring(0, 12) + "****")
}

if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
    Write-Error "环境变量 DATABASE_URL 未设置，无法备份。"
    exit 2
}

# 解析 DATABASE_URL：postgresql://user:password@host:port/dbname
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

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timeStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDir "link168-${dbName}-${timeStamp}.sql"
$compressedFile = "${backupFile}.gz"

Write-Timestamp "开始备份 PostgreSQL：host=${dbHost}:${dbPort} db=${dbName} user=${dbUser}（DATABASE_URL=$(Redact-ConnectionString $connectionUrl)）"

# 1. 使用 pg_dump 导出纯文本
$pgDumpArgs = @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--username=$dbUser",
    "--dbname=$dbName",
    "--no-owner",
    "--no-privileges",
    "--no-acl",
    "--clean",
    "--if-exists",
    "--file=$backupFile"
)

try {
    & pg_dump @pgDumpArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "pg_dump 返回非零退出码：${LASTEXITCODE}"
        exit 3
    }
} catch {
    Write-Error "pg_dump 执行失败：$_"
    exit 3
}

$uncompressedSize = (Get-Item $backupFile).Length

# 2. 使用 gzip 压缩（通过 PowerShell 调用 gzip，若系统未提供则内置 .NET GZipStream）
$haveGzip = $false
try {
    $null = Get-Command gzip -ErrorAction Stop
    $haveGzip = $true
} catch {
    $haveGzip = $false
}

if ($haveGzip) {
    & gzip -9 -f $backupFile
    if ($LASTEXITCODE -ne 0) {
        Write-Error "gzip 返回非零退出码：${LASTEXITCODE}"
        exit 4
    }
} else {
    Write-Timestamp "未检测到 gzip 命令，使用 .NET GZipStream 压缩。"
    try {
        $sourceStream = [System.IO.File]::OpenRead($backupFile)
        $destStream = [System.IO.File]::Create($compressedFile)
        $gzipStream = New-Object System.IO.Compression.GZipStream($destStream, [System.IO.Compression.CompressionMode]::Compress)
        $sourceStream.CopyTo($gzipStream)
        $gzipStream.Dispose()
        $destStream.Dispose()
        $sourceStream.Dispose()
        Remove-Item $backupFile -Force
    } catch {
        Write-Error "GZipStream 压缩失败：$_"
        exit 4
    }
}

$compressedSize = (Get-Item $compressedFile).Length
Write-Timestamp "备份完成：${compressedFile}（原始=$([math]::Round($uncompressedSize/1KB,2))KB 压缩后=$([math]::Round($compressedSize/1KB,2))KB）"
