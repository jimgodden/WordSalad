# Linguistic Linguini - Windows Server 2025 Deployment Guide

## Overview
This guide walks you through deploying the Linguistic Linguini application to an Azure VM running Windows Server 2025.

## Prerequisites

### Azure VM Requirements
- **OS**: Windows Server 2025
- **CPU**: 2+ cores (for dev/test), 4+ cores recommended for production
- **RAM**: 4GB minimum, 8GB+ recommended
- **Disk**: 30GB minimum free space
- **Network**: Allow inbound traffic on port 3000 (or your chosen port)

### Before Starting
1. Create an Azure VM with Windows Server 2025
2. Ensure you have Remote Desktop (RDP) access to the VM
3. Have Administrator privileges on the VM

## Deployment Steps

### Step 1: Connect to Your VM
```powershell
# Open Remote Desktop Connection and connect to your VM
# Use: <your-vm-ip> as the server address
```

### Step 2: Download or Clone the Application

**Option A: Using Git (if installed)**
```powershell
cd C:\
git clone https://github.com/yourusername/WordSalad.git
cd WordSalad
```

**Option B: Manual Upload**
- Zip the application files locally
- Upload via RDP file transfer
- Extract to `C:\WordSalad`

### Step 3: Run the Deployment Script

Open PowerShell **as Administrator** and execute:

```powershell
# Navigate to the deploy folder
cd C:\WordSalad\deploy

# Run the setup script
.\setup_vm.ps1

# Or specify a custom port:
.\setup_vm.ps1 -AppPort 8080

# Or skip the final reboot:
.\setup_vm.ps1 -SkipRestart
```

**What the script does:**
1. ✅ Validates Administrator privileges
2. ✅ Installs Chocolatey package manager
3. ✅ Installs Node.js (LTS version)
4. ✅ Configures Windows Firewall for your app port
5. ✅ Installs PM2 (process manager)
6. ✅ Builds the frontend (npm run build)
7. ✅ Starts the application
8. ✅ Configures auto-start on reboot
9. ✅ Reboots the system

### Step 4: Verify Deployment

After the VM reboots, reconnect via RDP and run:

```powershell
cd C:\WordSalad\deploy

# Check application status
.\manage_app.ps1 -Action status

# Run health check
.\manage_app.ps1 -Action health
```

You should see output showing your application is running.

### Step 5: Access the Application

In your browser, navigate to:
```
http://<your-vm-public-ip>:3000
```

Replace `<your-vm-public-ip>` with your Azure VM's public IP address.

---

## Common Management Tasks

### View Application Status
```powershell
.\manage_app.ps1 -Action status
```

### View Application Logs
```powershell
# Last 30 lines
.\manage_app.ps1 -Action logs

# Last 100 lines
.\manage_app.ps1 -Action logs -Lines 100

# Real-time logs (Ctrl+C to exit)
pm2 logs linguistic-linguini --follow
```

### Restart the Application
```powershell
.\manage_app.ps1 -Action restart
```

### Stop the Application
```powershell
.\manage_app.ps1 -Action stop
```

### Start the Application
```powershell
.\manage_app.ps1 -Action start
```

### Monitor Performance
```powershell
# Shows CPU and memory usage (refreshes every 5 seconds)
.\manage_app.ps1 -Action monitor -Interval 5
```

### Update the Application
When you want to deploy new code:

```powershell
cd C:\WordSalad

# Pull latest changes
git pull

# Or manually update files, then run:
cd deploy
.\manage_app.ps1 -Action update
```

### Run Health Check
```powershell
.\manage_app.ps1 -Action health
```

---

## Troubleshooting

### Application won't start

**Check logs:**
```powershell
.\manage_app.ps1 -Action logs
```

**Common issues:**
- Port already in use: Change port with `.\setup_vm.ps1 -AppPort 8080`
- Missing dependencies: Run `npm install` in the project root
- Build errors: Check `npm run build` output

### Cannot access application from outside

**Check firewall rule:**
```powershell
Get-NetFirewallRule -DisplayName "Allow-*-Port-*"
```

**Verify port is listening:**
```powershell
netstat -ano | findstr :3000
```

**Add firewall rule manually:**
```powershell
New-NetFirewallRule -DisplayName "Allow App Port 3000" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

### Application crashes repeatedly

**Check for errors:**
```powershell
pm2 logs linguistic-linguini --lines 50
```

**Restart Node.js:**
```powershell
.\manage_app.ps1 -Action restart
```

**If persistent, delete and restart:**
```powershell
pm2 delete linguistic-linguini
pm2 start server/index.js --name linguistic-linguini
```

### High memory/CPU usage

**Monitor in real-time:**
```powershell
.\manage_app.ps1 -Action monitor
```

**Check for memory leaks in logs and restart if needed:**
```powershell
pm2 restart linguistic-linguini
```

### Deployment script fails

**Run with verbose logging:**
```powershell
$VerbosePreference = "Continue"
.\setup_vm.ps1 -Verbose
```

**Check deployment log:**
```powershell
Get-Content C:\Logs\linguistic-linguini\deployment_*.log
```

---

## Advanced Configuration

### Change Application Port

**Option 1: During initial setup**
```powershell
.\setup_vm.ps1 -AppPort 8080
```

**Option 2: After deployment**
1. Update firewall rule (remove old, add new)
2. Edit PM2 configuration or restart with new port
3. Update any reverse proxy rules

### Enable HTTPS

For production, set up a reverse proxy (IIS or nginx) with SSL/TLS certificates.

### Scheduled Backups

Create a PowerShell scheduled task:
```powershell
# Backup code daily
$trigger = New-ScheduledTaskTrigger -Daily -At 2AM
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-Command `"Compress-Archive -Path C:\WordSalad\* -DestinationPath C:\Backups\WordSalad_$(Get-Date -Format yyyyMMdd).zip -Force`""
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "BackupWordSalad" -Description "Daily backup of WordSalad app"
```

### Enable Application Insights (Monitoring)

1. Create Application Insights resource in Azure
2. Update server code with instrumentation key
3. Deploy with `.\manage_app.ps1 -Action update`

---

## Useful PM2 Commands

```powershell
# View all processes
pm2 status

# Start a process
pm2 start server/index.js --name linguistic-linguini

# Stop a process
pm2 stop linguistic-linguini

# Restart a process
pm2 restart linguistic-linguini

# Delete a process
pm2 delete linguistic-linguini

# View logs
pm2 logs linguistic-linguini

# Real-time monitoring
pm2 monit

# Save current configuration
pm2 save

# Resurrect saved configuration
pm2 resurrect

# Clear all logs
pm2 flush
```

---

## Production Best Practices

1. **Use a Reverse Proxy**: Set up IIS or nginx as a reverse proxy for SSL/TLS termination
2. **Enable Logging**: Ensure application logs are being captured for troubleshooting
3. **Monitor Resources**: Set up Azure VM monitoring and alerts
4. **Backup Strategy**: Regular backups of application data and configurations
5. **Auto-Recovery**: PM2 is configured to auto-restart on reboot
6. **Security**: 
   - Disable unnecessary services
   - Keep Windows Server updated
   - Use NSG rules to restrict access
   - Consider using managed identity for Azure resources

---

## Support & Troubleshooting

### Useful Paths
- **App Directory**: `C:\WordSalad`
- **Logs**: `C:\Logs\linguistic-linguini\`
- **Deploy Scripts**: `C:\WordSalad\deploy\`
- **Node Modules**: `C:\WordSalad\node_modules\`

### Check System Requirements
```powershell
# Node.js version
node --version

# npm version
npm --version

# PM2 version
pm2 --version

# Available disk space
Get-Volume
```

### Get System Info
```powershell
Get-ComputerInfo
```

---

## Next Steps

1. ✅ Run the deployment script
2. ✅ Verify application is accessible
3. ✅ Set up monitoring/alerts in Azure
4. ✅ Configure backup strategy
5. ✅ Set up SSL/TLS for production
6. ✅ Test auto-recovery (restart VM and verify app restarts)

Good luck! 🚀
