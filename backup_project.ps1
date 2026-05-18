# Set error action to stop
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  NEXOS HEALTH - PRE-REINSTALL BACKUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$root = $PSScriptRoot
$backupDirName = "_backup_reinstall_temp"
$backupPath = Join-Path $root $backupDirName
$zipName = "nexos_reinstall_backup.zip"
$zipPath = Join-Path $root $zipName

# Files to backup
$filesToBackup = @(
    @{ Source = "backend/.env"; DestSub = "backend" },
    @{ Source = "frontend/.env"; DestSub = "frontend" },
    @{ Source = "backend/health.db"; DestSub = "backend" },
    @{ Source = "backend/health.db-wal"; DestSub = "backend" },
    @{ Source = "backend/health.db-shm"; DestSub = "backend" },
    @{ Source = "backend/health_assistant.db"; DestSub = "backend" }
)

# 1. Clean previous backup ZIP or temp folder
if (Test-Path $zipPath) {
    Write-Host "Removing existing backup ZIP..." -ForegroundColor Yellow
    Remove-Item $zipPath -Force
}
if (Test-Path $backupPath) {
    Remove-Item $backupPath -Recurse -Force
}

# Create temp folder
New-Item -ItemType Directory -Path $backupPath | Out-Null

Write-Host "Gathering ignored configuration and database files..." -ForegroundColor Gray

# 2. Copy files to temp folder
$backedUpCount = 0
foreach ($item in $filesToBackup) {
    $srcFile = Join-Path $root $item.Source
    if (Test-Path $srcFile) {
        $destFolder = Join-Path $backupPath $item.DestSub
        if (-not (Test-Path $destFolder)) {
            New-Item -ItemType Directory -Path $destFolder | Out-Null
        }
        $destFile = Join-Path $destFolder (Split-Path $srcFile -Leaf)
        Copy-Item -Path $srcFile -Destination $destFile -Force
        Write-Host "  [SUCCESS] Copied: $($item.Source)" -ForegroundColor Green
        $backedUpCount++
    } else {
        if ($item.Source -like "*.db-wal" -or $item.Source -like "*.db-shm" -or $item.Source -like "*_assistant.db") {
            # Optional database files, skip silently if not present
        } else {
            Write-Host "  [WARNING] File not found: $($item.Source)" -ForegroundColor Yellow
        }
    }
}

if ($backedUpCount -eq 0) {
    Write-Host "Error: No files were found to back up!" -ForegroundColor Red
    Exit 1
}

# 3. Compress files into ZIP
Write-Host "Compressing backup staging directory..." -ForegroundColor Gray
Compress-Archive -Path (Join-Path $backupPath "*") -DestinationPath $zipPath -Force

# 4. Clean up temp folder
Remove-Item $backupPath -Recurse -Force

# Get ZIP size
$zipFile = Get-Item $zipPath
$zipSizeMB = [Math]::Round($zipFile.Length / 1MB, 2)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  BACKUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Backup Package: $zipName" -ForegroundColor White
Write-Host "  Location:       $zipPath" -ForegroundColor White
Write-Host "  Size:           $zipSizeMB MB" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANT INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "  1. Copy '$zipName' to a USB drive or upload it to your Cloud storage." -ForegroundColor Yellow
Write-Host "  2. The source code itself is safe on GitHub, but you MUST also copy this" -ForegroundColor Yellow
Write-Host "     ZIP file to be able to restore your database and environment settings." -ForegroundColor Yellow
Write-Host "  3. Refer to RESTORATION_GUIDE.md for complete recovery steps." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
