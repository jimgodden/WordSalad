<#
.SYNOPSIS
    Comprehensive deployment script for Linguistic Linguini on Windows Server 2025 Azure VM.
    
.DESCRIPTION
    Automates complete setup:
    1. Validates Administrator privileges
    2. Installs runtime prerequisites (Node.js, Git, etc.)
    3. Configures Windows Firewall
    4. Installs and configures PM2 for process management
    5. Deploys application, builds frontend, starts server
    6. Sets up automatic restart on reboot
    
.PARAMETER AppPort
    Port number for the application (default: 3000)
    
.PARAMETER SkipRestart
    Skip final reboot (default: $false)

.EXAMPLE
    .\setup_vm.ps1 -AppPort 8080

.NOTES
    Must be run as Administrator on Windows Server 2025.
    Requires internet connection for package installation.
#>

param(
    [int]$AppPort = 3000,
    [switch]$SkipRestart
)

# ============================================================================
# Configuration
# ============================================================================
$PROJECT_DIR = "$PSScriptRoot\.."
$SERVER_FILE = "server/index.js"
$APP_NAME = "linguistic-linguini"
$LOG_DIR = "C:\Logs\$APP_NAME"
$LOG_FILE = "$LOG_DIR\deployment_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

# ============================================================================
# Helper Functions
# ============================================================================
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

function Check-Administrator {
    $isAdmin = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    if (!$isAdmin.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
        exit 1
    }
}

function Refresh-EnvironmentVariables {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Install-Chocolatey {
    if (Test-Command choco) {
        Write-Log "Chocolatey already installed" "INFO"
        return $true
    }
    
    Write-Log "Installing Chocolatey..." "INFO"
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        $null = Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Refresh-EnvironmentVariables
        Write-Log "✅ Chocolatey installed successfully" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Failed to install Chocolatey: $_" "ERROR"
        return $false
    }
}

function Install-NodeJS {
    if (Test-Command node) {
        $version = node --version
        Write-Log "Node.js already installed: $version" "INFO"
        return $true
    }
    
    Write-Log "Installing Node.js via Chocolatey..." "INFO"
    try {
        & choco install nodejs -y --force
        Refresh-EnvironmentVariables
        $version = node --version
        Write-Log "✅ Node.js installed: $version" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Failed to install Node.js: $_" "ERROR"
        return $false
    }
}

function Install-PM2 {
    Write-Log "Installing PM2 globally..." "INFO"
    try {
        & npm install -g pm2
        Write-Log "✅ PM2 installed successfully" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Failed to install PM2: $_" "ERROR"
        return $false
    }
}

function Configure-Firewall {
    param([int]$Port)
    Write-Log "Configuring Windows Firewall for port $Port..." "INFO"
    
    try {
        $ruleName = "Allow-$APP_NAME-Port-$Port"
        
        # Remove existing rule if present
        $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        if ($existingRule) {
            Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
        }
        
        # Create new inbound rule
        New-NetFirewallRule -DisplayName $ruleName `
            -Direction Inbound `
            -Action Allow `
            -Protocol TCP `
            -LocalPort $Port | Out-Null
            
        Write-Log "✅ Firewall rule created for port $Port" "SUCCESS"
        return $true
    } catch {
        Write-Log "⚠️  Failed to configure firewall: $_" "WARNING"
        return $false
    }
}

function Build-Application {
    Write-Log "Installing npm dependencies..." "INFO"
    try {
        Push-Location $PROJECT_DIR
        
        Write-Log "Running npm install..." "INFO"
        & npm install
        
        Write-Log "Building frontend..." "INFO"
        & npm run build
        
        Pop-Location
        Write-Log "✅ Application built successfully" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Failed to build application: $_" "ERROR"
        Pop-Location
        return $false
    }
}

function Start-Application {
    Write-Log "Starting application with PM2..." "INFO"
    try {
        # Stop any existing instances
        $null = & pm2 delete $APP_NAME -ErrorAction SilentlyContinue
        
        Push-Location $PROJECT_DIR
        
        # Start the application
        & pm2 start $SERVER_FILE --name $APP_NAME --port $AppPort
        
        # Save PM2 configuration
        & pm2 save
        
        Pop-Location
        Write-Log "✅ Application started successfully" "SUCCESS"
        return $true
    } catch {
        Write-Log "❌ Failed to start application: $_" "ERROR"
        Pop-Location
        return $false
    }
}

function Create-LogDirectory {
    if (!(Test-Path $LOG_DIR)) {
        New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
    }
}

function Setup-AutoStart {
    Write-Log "Setting up automatic restart on reboot..." "INFO"
    try {
        # Create scheduled task for PM2 resurrection
        $taskName = "PM2-$APP_NAME-Resurrect"
        $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c pm2 resurrect"
        $trigger = New-ScheduledTaskTrigger -AtStartup
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        # Remove existing task if present
        $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existingTask) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        }
        
        Register-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -TaskName $taskName `
            -Description "Auto-starts PM2 and managed applications" -Force | Out-Null
            
        Write-Log "✅ Auto-start scheduled task created" "SUCCESS"
        return $true
    } catch {
        Write-Log "⚠️  Failed to create scheduled task: $_" "WARNING"
        return $false
    }
}

function Get-ApplicationStatus {
    try {
        $status = & pm2 status
        return $status
    } catch {
        Write-Log "Failed to retrieve PM2 status: $_" "WARNING"
        return $null
    }
}

# ============================================================================
# Main Execution
# ============================================================================
function Main {
    Clear-Host
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   Linguistic Linguini - Windows Server 2025 Deployment  ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    Create-LogDirectory
    Write-Log "Starting deployment process" "INFO"
    Write-Log "Application Port: $AppPort" "INFO"
    Write-Log "Project Directory: $PROJECT_DIR" "INFO"
    
    # 1. Validate prerequisites
    Write-Host ""
    Write-Host "Step 1: Validating prerequisites..." -ForegroundColor Yellow
    Check-Administrator
    
    # 2. Install Chocolatey
    Write-Host ""
    Write-Host "Step 2: Installing Chocolatey..." -ForegroundColor Yellow
    if (!(Install-Chocolatey)) {
        Write-Log "Deployment failed at Chocolatey installation" "ERROR"
        exit 1
    }
    
    # 3. Install Node.js
    Write-Host ""
    Write-Host "Step 3: Installing Node.js..." -ForegroundColor Yellow
    if (!(Install-NodeJS)) {
        Write-Log "Deployment failed at Node.js installation" "ERROR"
        exit 1
    }
    
    # 4. Configure Firewall
    Write-Host ""
    Write-Host "Step 4: Configuring Windows Firewall..." -ForegroundColor Yellow
    Configure-Firewall -Port $AppPort
    
    # 5. Install PM2
    Write-Host ""
    Write-Host "Step 5: Installing PM2..." -ForegroundColor Yellow
    if (!(Install-PM2)) {
        Write-Log "Deployment failed at PM2 installation" "ERROR"
        exit 1
    }
    
    # 6. Build Application
    Write-Host ""
    Write-Host "Step 6: Building application..." -ForegroundColor Yellow
    if (!(Build-Application)) {
        Write-Log "Deployment failed at application build" "ERROR"
        exit 1
    }
    
    # 7. Start Application
    Write-Host ""
    Write-Host "Step 7: Starting application..." -ForegroundColor Yellow
    if (!(Start-Application)) {
        Write-Log "Deployment failed at application start" "ERROR"
        exit 1
    }
    
    # 8. Setup Auto-start
    Write-Host ""
    Write-Host "Step 8: Setting up auto-start..." -ForegroundColor Yellow
    Setup-AutoStart
    
    # Display final status
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              🎉 Deployment Complete! 🎉                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application Status:" -ForegroundColor Cyan
    $status = Get-ApplicationStatus
    Write-Host $status
    Write-Host ""
    Write-Host "Access your application at:" -ForegroundColor Green
    Write-Host "  http://localhost:$AppPort" -ForegroundColor Green
    Write-Host "  http://<YOUR_VM_IP>:$AppPort" -ForegroundColor Green
    Write-Host ""
    Write-Host "Useful PM2 Commands:" -ForegroundColor Cyan
    Write-Host "  pm2 status              - View running processes" -ForegroundColor Gray
    Write-Host "  pm2 logs $APP_NAME        - View application logs" -ForegroundColor Gray
    Write-Host "  pm2 restart $APP_NAME     - Restart application" -ForegroundColor Gray
    Write-Host "  pm2 stop $APP_NAME        - Stop application" -ForegroundColor Gray
    Write-Host "  pm2 delete $APP_NAME      - Remove from PM2" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Log file saved to: $LOG_FILE" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Log "Deployment completed successfully" "SUCCESS"
    
    if (!$SkipRestart) {
        Write-Host "System will reboot in 30 seconds to complete setup..." -ForegroundColor Magenta
        Write-Log "Initiating system reboot" "INFO"
        Start-Sleep -Seconds 30
        Restart-Computer -Force
    } else {
        Write-Host "⚠️  Note: Consider rebooting to ensure all components are fully active" -ForegroundColor Yellow
    }
}

# ============================================================================
# Run Main
# ============================================================================
Main
