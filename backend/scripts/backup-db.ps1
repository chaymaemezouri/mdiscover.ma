# Sauvegarde PostgreSQL (Windows PowerShell)
# Usage: .\scripts\backup-db.ps1
# Conteneur par défaut: mdiscover-postgres (dev) — override: $env:POSTGRES_CONTAINER

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $PSScriptRoot
$BackupDir = Join-Path $RootDir 'backups'
$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$Container = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { 'mdiscover-postgres' }

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Load simple KEY=VALUE from .env
$EnvFile = Join-Path $RootDir '.env'
$PgUser = 'mdiscover'
$PgDb = 'mdiscover'
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*POSTGRES_USER=(.+)$') { $PgUser = $Matches[1].Trim() }
    if ($_ -match '^\s*POSTGRES_DB=(.+)$') { $PgDb = $Matches[1].Trim() }
  }
}

$File = Join-Path $BackupDir "mdiscover_${Timestamp}.sql"
Write-Host "Backup → $File (container=$Container)"
docker exec $Container pg_dump -U $PgUser -d $PgDb | Set-Content -Path $File -Encoding utf8
Write-Host "OK"
