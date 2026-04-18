<#
.SYNOPSIS
    Quick update and deployment script for Linguistic Linguini
    
.DESCRIPTION
    Performs a quick update: pulls latest code, rebuilds, and restarts
    
.PARAMETER SkipGitPull
    Skip git pull (useful if code is already updated locally)
    
.EXAMPLE
    .\quick_update.ps1
    .\quick_update.ps1 -SkipGitPull

.NOTES
    Run from the deploy directory
#>

param(
    [switch]$SkipGitPull
)

$APP_NAME = "linguistic-linguini"
$PROJECT_DIR = "$PSScriptRoot\.."

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Linguistic Linguini - Quick Update              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

try {
    Push-Location $PROJECT_DIR
    
    # Step 1: Git pull (if not skipped)
    if (!$SkipGitPull) {
        Write-Host "Step 1: Pulling latest code..." -ForegroundColor Yellow
        & git pull
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Git pull encountered an issue. Continuing anyway..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Step 1: Skipping git pull" -ForegroundColor Gray
    }
    
    # Step 2: Install dependencies
    Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow
    & npm install --production
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    
    # Step 3: Build frontend
    Write-Host "Step 3: Building frontend..." -ForegroundColor Yellow
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }
    
    # Step 4: Restart application
    Write-Host "Step 4: Restarting application..." -ForegroundColor Yellow
    & pm2 restart $APP_NAME
    if ($LASTEXITCODE -ne 0) {
        throw "pm2 restart failed"
    }
    
    Pop-Location
    
    # Success message
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║           ✅ Update Complete Successfully!            ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application Status:" -ForegroundColor Cyan
    & pm2 status
    Write-Host ""
    Write-Host "💡 Tip: View logs with: pm2 logs $APP_NAME" -ForegroundColor Gray
    
} catch {
    Pop-Location
    Write-Host ""
    Write-Host "❌ Update failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Manual recovery steps:" -ForegroundColor Yellow
    Write-Host "  1. Check logs: pm2 logs $APP_NAME" -ForegroundColor Gray
    Write-Host "  2. Restart app: pm2 restart $APP_NAME" -ForegroundColor Gray
    Write-Host "  3. Use manage_app.ps1 for more options" -ForegroundColor Gray
    exit 1
}
