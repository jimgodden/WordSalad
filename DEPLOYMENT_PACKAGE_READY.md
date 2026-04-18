# 🚀 Deployment Package Ready

Your Linguistic Linguini app is ready for deployment to Windows Server 2025!

## What's Included

### 1. **setup_vm.ps1** - Main Deployment Script
Complete one-time setup that:
- ✅ Installs Node.js, npm, Chocolatey
- ✅ Configures Windows Firewall
- ✅ Installs PM2 process manager
- ✅ Builds and starts your application
- ✅ Sets up auto-restart on reboot
- ✅ Provides detailed logging

**Usage:**
```powershell
cd deploy
.\setup_vm.ps1                    # Default (port 3000)
.\setup_vm.ps1 -AppPort 8080      # Custom port
.\setup_vm.ps1 -SkipRestart       # Don't reboot
```

### 2. **manage_app.ps1** - Management Script
Day-to-day operations:
```powershell
.\manage_app.ps1 -Action status    # Check status
.\manage_app.ps1 -Action logs      # View logs
.\manage_app.ps1 -Action restart   # Restart app
.\manage_app.ps1 -Action update    # Update & restart
.\manage_app.ps1 -Action health    # Run health checks
.\manage_app.ps1 -Action monitor   # Monitor resources
```

### 3. **quick_update.ps1** - Fast Updates
Quick deployment of new code:
```powershell
.\quick_update.ps1                 # Pull, build, restart
.\quick_update.ps1 -SkipGitPull    # Just build & restart
```

### 4. **DEPLOYMENT_GUIDE.md** - Complete Documentation
- Full step-by-step deployment instructions
- Troubleshooting guide
- Common commands reference
- Production best practices
- Advanced configuration options

### 5. **README.md** - Quick Reference
- File overview
- Common commands table
- Quick troubleshooting
- Parameter reference

## Deployment Workflow

### Initial Setup (One Time)
```
1. Connect to VM via RDP
2. Copy application files to C:\WordSalad
3. Open PowerShell as Administrator
4. Run: .\setup_vm.ps1
5. Wait for reboot
6. Verify: .\manage_app.ps1 -Action health
```

### Verify It's Working
```powershell
# Should show app running
pm2 status

# Should show all checks passing
.\manage_app.ps1 -Action health

# Access in browser: http://<your-vm-ip>:3000
```

### Regular Updates
```powershell
cd deploy

# Quick update
.\quick_update.ps1

# Or use the full management script
.\manage_app.ps1 -Action update
```

## Key Information

| Item | Details |
|------|---------|
| **Port** | 3000 (default, customizable) |
| **Application Name** | linguistic-linguini |
| **Process Manager** | PM2 |
| **Auto-Restart** | ✅ Enabled |
| **Server File** | server/index.js |
| **Build Output** | dist/ (frontend) |
| **Logs Location** | C:\Logs\linguistic-linguini\ |
| **Access URL** | http://<vm-ip>:3000 |

## Features

✨ **Automatic Features Included:**
- ✅ Automatic restart on crash
- ✅ Automatic restart on VM reboot
- ✅ Detailed deployment logging
- ✅ Health check monitoring
- ✅ Firewall configuration
- ✅ Production-ready PM2 setup

🔧 **Management Features:**
- ✅ View real-time logs
- ✅ Monitor CPU/memory
- ✅ One-command restart
- ✅ One-command update
- ✅ Health status verification

## Azure VM Setup (Before Running Scripts)

1. **Create VM in Azure Portal:**
   - Image: Windows Server 2025 Datacenter
   - Size: Standard_B2s minimum (2 vCPU, 4 GB RAM)
   - Enable public IP or use Azure Bastion

2. **Network Configuration:**
   - Open inbound port 3000 (or custom port)
   - NSG Rule: Allow TCP 3000 from your IP (or 0.0.0.0/0 for public)

3. **Connect to VM:**
   - Download RDP file from portal
   - Or use Remote Desktop with IP address
   - Username: azureuser (default)

## Example: Complete Deployment

```powershell
# 1. On your local machine, prepare app files
cd WordSalad
git init
git add .
git commit -m "initial"

# 2. Upload to VM (or push to Git and pull on VM)

# 3. Connect to VM via RDP

# 4. On VM, open PowerShell as Administrator:
cd C:\WordSalad\deploy

# 5. Run deployment (takes ~5-10 minutes)
.\setup_vm.ps1

# 6. VM will reboot automatically

# 7. After reboot, verify:
.\manage_app.ps1 -Action health

# 8. Access app:
# Open browser: http://<your-vm-ip>:3000
```

## Troubleshooting Quick Links

| Problem | Command |
|---------|---------|
| App won't start | `.\manage_app.ps1 -Action logs` |
| Can't connect from outside | `Get-NetFirewallRule -DisplayName "Allow-*"` |
| Check if app is running | `pm2 status` |
| Restart app | `.\manage_app.ps1 -Action restart` |
| View real-time logs | `pm2 logs linguistic-linguini --follow` |
| Port already in use | Change port with `-AppPort` parameter |

## Next Steps

1. **Prepare Your Azure VM** - Create Windows Server 2025 VM in Azure
2. **Copy Files** - Transfer application to C:\WordSalad
3. **Run Setup** - Execute `.\setup_vm.ps1` as Administrator
4. **Verify** - Run `.\manage_app.ps1 -Action health`
5. **Access App** - Open http://<your-vm-ip>:3000
6. **Configure** - Set up monitoring and backups as needed

## Support Resources

📖 **Full Documentation**: See `DEPLOYMENT_GUIDE.md`

🔧 **Command Reference**: See `README.md`

💻 **Scripts with Help:**
```powershell
Get-Help .\setup_vm.ps1 -Full
Get-Help .\manage_app.ps1 -Full
```

## Application Features

Your app includes:
- ⚡ React frontend with Vite
- 🎮 Game server with Express
- 🔌 Real-time Socket.IO for multiplayer
- 🎨 Tailwind CSS styling
- 📝 TypeScript for type safety

## Customization Options

### Change Application Port
```powershell
.\setup_vm.ps1 -AppPort 8080
```

### Use Git for Updates
```powershell
# On VM:
cd C:\WordSalad
git pull
cd deploy
.\quick_update.ps1
```

### Enable HTTPS
1. Set up IIS or nginx as reverse proxy
2. Configure SSL certificate
3. Point traffic to http://localhost:3000

## Architecture

```
┌─────────────────────────────┐
│    Windows Server 2025      │
├─────────────────────────────┤
│  Firewall (Port 3000)       │
│         ↓                   │
│  PM2 (Process Manager)      │
│         ↓                   │
│  Node.js Application        │
│  ├─ Express Server          │
│  ├─ Socket.IO               │
│  └─ React Frontend (dist/)  │
└─────────────────────────────┘
```

---

## Summary

You now have:
✅ **Ready-to-use deployment scripts**
✅ **Complete documentation**
✅ **Day-to-day management tools**
✅ **Auto-restart and logging**
✅ **Health monitoring**

**You're ready to deploy!** 🚀

For detailed instructions, see `DEPLOYMENT_GUIDE.md`
