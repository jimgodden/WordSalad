<#
.SYNOPSIS
    Management and troubleshooting script for Linguistic Linguini application on Windows Server.
    
.DESCRIPTION
    Provides common operations:
    - Start/Stop/Restart the application
    - View logs and status
    - Update the application
    - Monitor performance
    
.EXAMPLE
    .\manage_app.ps1 -Action status
    .\manage_app.ps1 -Action restart
    .\manage_app.ps1 -Action logs -Lines 50
    .\manage_app.ps1 -Action update
    .\manage_app.ps1 -Action monitor -Interval 5

.NOTES
    Some operations require Administrator privileges.
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('status', 'start', 'stop', 'restart', 'logs', 'update', 'monitor', 'health')]
    [string]$Action,
    
    [int]$Lines = 30,
    [int]$Interval = 5
)

$APP_NAME = "linguistic-linguini"
$PROJECT_DIR = "$PSScriptRoot\.."
$SERVER_FILE = "server/index.js"

function Check-Administrator {
    $isAdmin = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    if (!$isAdmin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "⚠️  This script requires Administrator privileges for some operations." -ForegroundColor Yellow
    }
}

function Show-Status {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Application Status" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    & pm2 status
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    # Try to connect and show app is responsive
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Application is responding on port 3000" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Application may not be responding. Check logs for details." -ForegroundColor Yellow
    }
}

function Start-App {
    Write-Host "Starting application..." -ForegroundColor Yellow
    Push-Location $PROJECT_DIR
    & pm2 start $SERVER_FILE --name $APP_NAME --force
    Pop-Location
    Write-Host "✅ Application started" -ForegroundColor Green
}

function Stop-App {
    Write-Host "Stopping application..." -ForegroundColor Yellow
    & pm2 stop $APP_NAME
    Write-Host "✅ Application stopped" -ForegroundColor Green
}

function Restart-App {
    Write-Host "Restarting application..." -ForegroundColor Yellow
    Push-Location $PROJECT_DIR
    & pm2 restart $APP_NAME
    Pop-Location
    Write-Host "✅ Application restarted" -ForegroundColor Green
}

function Show-Logs {
    Write-Host "Showing last $Lines lines of logs..." -ForegroundColor Cyan
    Write-Host ""
    & pm2 logs $APP_NAME --lines $Lines --nostream
}

function Update-App {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Updating Application" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Push-Location $PROJECT_DIR
        
        Write-Host "1️⃣  Stopping application..." -ForegroundColor Yellow
        & pm2 stop $APP_NAME
        
        Write-Host "2️⃣  Installing dependencies..." -ForegroundColor Yellow
        & npm install
        
        Write-Host "3️⃣  Building frontend..." -ForegroundColor Yellow
        & npm run build
        
        Write-Host "4️⃣  Restarting application..." -ForegroundColor Yellow
        & pm2 restart $APP_NAME
        
        Pop-Location
        Write-Host "✅ Update complete" -ForegroundColor Green
    } catch {
        Pop-Location
        Write-Host "❌ Update failed: $_" -ForegroundColor Red
    }
}

function Monitor-App {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Monitoring Application (Refreshing every $Interval seconds)" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    $count = 0
    while ($true) {
        Clear-Host
        Write-Host "Monitoring $APP_NAME - Iteration: $($count + 1) - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
        Write-Host ""
        
        & pm2 status
        
        Write-Host ""
        Write-Host "Memory and CPU Usage:" -ForegroundColor Cyan
        & pm2 monit --nostream
        
        $count++
        Start-Sleep -Seconds $Interval
    }
}

function Check-Health {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Health Check" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
    
    $healthy = $true
    
    # Check if Node.js is installed
    Write-Host "Checking Node.js..." -ForegroundColor Yellow
    try {
        $nodeVersion = & node --version
        Write-Host "  ✅ Node.js $nodeVersion installed" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Node.js not found" -ForegroundColor Red
        $healthy = $false
    }
    
    # Check if PM2 is installed
    Write-Host "Checking PM2..." -ForegroundColor Yellow
    try {
        $pm2Version = & pm2 --version
        Write-Host "  ✅ PM2 $pm2Version installed" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ PM2 not found" -ForegroundColor Red
        $healthy = $false
    }
    
    # Check if application is running
    Write-Host "Checking application status..." -ForegroundColor Yellow
    try {
        $status = & pm2 status
        if ($status -match $APP_NAME) {
            Write-Host "  ✅ Application is registered with PM2" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Application not found in PM2" -ForegroundColor Yellow
            $healthy = $false
        }
    } catch {
        Write-Host "  ❌ Could not check PM2 status" -ForegroundColor Red
        $healthy = $false
    }
    
    # Check firewall rule
    Write-Host "Checking firewall rule..." -ForegroundColor Yellow
    try {
        $rule = Get-NetFirewallRule -DisplayName "Allow-*-Port-3000" -ErrorAction SilentlyContinue
        if ($rule) {
            Write-Host "  ✅ Firewall rule exists for port 3000" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Firewall rule for port 3000 not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not check firewall" -ForegroundColor Yellow
    }
    
    # Check if port is listening
    Write-Host "Checking port availability..." -ForegroundColor Yellow
    try {
        $port = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Measure-Object).Count
        if ($port -gt 0) {
            Write-Host "  ✅ Port 3000 is listening" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Port 3000 is not listening" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not check port status" -ForegroundColor Yellow
    }
    
    # Check HTTP response
    Write-Host "Checking HTTP response..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        Write-Host "  ✅ Application responding with HTTP $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Application not responding to HTTP requests" -ForegroundColor Red
        $healthy = $false
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    if ($healthy) {
        Write-Host "✅ All health checks passed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some health checks failed. Review above for details." -ForegroundColor Yellow
    }
}

# Main execution
Check-Administrator

switch ($Action) {
    'status' { Show-Status }
    'start' { Start-App }
    'stop' { Stop-App }
    'restart' { Restart-App }
    'logs' { Show-Logs }
    'update' { Update-App }
    'monitor' { Monitor-App }
    'health' { Check-Health }
}
