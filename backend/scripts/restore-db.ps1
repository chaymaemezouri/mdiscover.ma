# Restauration PostgreSQL (Windows PowerShell)
# Usage: .\scripts\restore-db.ps1 backups\mdiscover_YYYYMMDD_HHMMSS.sql

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $PSScriptRoot
$Container = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { 'mdiscover-postgres' }

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$EnvFile = Join-Path $RootDir '.env'
$PgUser = 'mdiscover'
$PgDb = 'mdiscover'
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*POSTGRES_USER=(.+)$') { $PgUser = $Matches[1].Trim() }
    if ($_ -match '^\s*POSTGRES_DB=(.+)$') { $PgDb = $Matches[1].Trim() }
  }
}

Write-Host "Restore $BackupFile → $Container / $PgDb"
Get-Content -Path $BackupFile -Raw | docker exec -i $Container psql -U $PgUser -d $PgDb
Write-Host "OK"
