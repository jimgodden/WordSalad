# 🚀 Ubuntu 24 Deployment Package Ready

Your Linguistic Linguini app is ready for deployment to Ubuntu 24 on Azure!

## What's Included

### 1. **setup_vm.sh** - Main Deployment Script
Complete one-time setup that:
- ✅ Updates system packages
- ✅ Installs Node.js 22 LTS
- ✅ Configures UFW firewall
- ✅ Installs PM2 process manager
- ✅ Builds and starts your application
- ✅ Sets up auto-restart on reboot
- ✅ Provides detailed logging

**Usage:**
```bash
sudo ./setup_vm.sh                    # Default (port 3000)
sudo ./setup_vm.sh --port 8080        # Custom port
sudo ./setup_vm.sh --skip-reboot      # Don't reboot
```

### 2. **manage_app.sh** - Management Script
Day-to-day operations:
```bash
./manage_app.sh status                # Check status
./manage_app.sh logs                  # View logs
./manage_app.sh restart               # Restart app
./manage_app.sh update                # Update & restart
./manage_app.sh health                # Run health checks
./manage_app.sh monitor               # Monitor resources
```

### 3. **quick_update.sh** - Fast Updates
Quick deployment of new code:
```bash
./quick_update.sh                     # Pull, build, restart
./quick_update.sh --skip-git-pull     # Just build & restart
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
1. Create Ubuntu 24 VM in Azure
2. SSH into VM
3. Clone/upload application files
4. Run: sudo ./setup_vm.sh
5. Wait for reboot
6. Verify: ./manage_app.sh health
```

### Verify It's Working
```bash
# Should show app running
pm2 status

# Should show all checks passing
./manage_app.sh health

# Access in browser: http://<your-vm-ip>:3000
```

### Regular Updates
```bash
cd deploy

# Quick update
./quick_update.sh

# Or use the full management script
./manage_app.sh update
```

## Key Information

| Item | Details |
|------|---------|
| **OS** | Ubuntu 24.04 LTS |
| **Port** | 3000 (default, customizable) |
| **Application Name** | linguistic-linguini |
| **Process Manager** | PM2 |
| **Auto-Restart** | ✅ Enabled |
| **Server File** | server/index.js |
| **Build Output** | dist/ (frontend) |
| **Logs Location** | /var/log/linguistic-linguini/ |
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
   - Image: Ubuntu 24.04 LTS
   - Size: Standard_B1s minimum (1 vCPU, 2 GB RAM)
   - Enable public IP

2. **Network Configuration:**
   - Open inbound port 3000 (or custom port)
   - NSG Rule: Allow TCP 3000 from your IP

3. **Connect to VM:**
   - Use SSH from terminal
   - Or use Azure Bastion
   - Default user: azureuser

## Example: Complete Deployment

```bash
# 1. On your local machine, prepare app files
git init
git add .
git commit -m "initial"

# 2. Push to GitHub (or upload files)
git push origin main

# 3. SSH into the Azure VM
ssh azureuser@<your-vm-ip>

# 4. Clone the app
cd ~
git clone https://github.com/yourusername/WordSalad.git

# 5. Navigate and run deployment (takes ~5-10 minutes)
cd WordSalad/deploy
chmod +x *.sh
sudo ./setup_vm.sh

# 6. VM will reboot automatically

# 7. After reboot, verify
./manage_app.sh health

# 8. Access app
# Open browser: http://<your-vm-ip>:3000
```

## Troubleshooting Quick Links

| Problem | Command |
|---------|---------|
| App won't start | `./manage_app.sh logs` |
| Can't connect from outside | `sudo ufw status` |
| Check if app is running | `pm2 status` |
| Restart app | `./manage_app.sh restart` |
| View real-time logs | `pm2 logs linguistic-linguini --follow` |
| Port already in use | Change port with `--port` parameter |

## Next Steps

1. **Create Azure VM** - Ubuntu 24.04 LTS
2. **SSH to VM** - Connect via terminal
3. **Clone/Upload Code** - Get app files on VM
4. **Run Setup** - Execute `sudo ./setup_vm.sh`
5. **Verify** - Run `./manage_app.sh health`
6. **Access App** - Open http://<your-vm-ip>:3000
7. **Configure** - Set up monitoring and backups

## Support Resources

📖 **Full Documentation**: See `DEPLOYMENT_GUIDE.md`

🔧 **Command Reference**: See `README.md`

💻 **Script Help:**
```bash
./setup_vm.sh --help
./manage_app.sh
./quick_update.sh --help
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
```bash
sudo ./setup_vm.sh --port 8080
```

### Use Git for Updates
```bash
# On VM:
cd ~/WordSalad
git pull
cd deploy
./quick_update.sh
```

### Enable HTTPS
1. Install Nginx
2. Configure SSL certificate (Let's Encrypt)
3. Reverse proxy to http://localhost:3000

## Architecture

```
┌─────────────────────────────┐
│      Ubuntu 24 VM           │
├─────────────────────────────┤
│  UFW Firewall (Port 3000)   │
│         ↓                   │
│  PM2 (Process Manager)      │
│         ↓                   │
│  Node.js Application        │
│  ├─ Express Server          │
│  ├─ Socket.IO               │
│  └─ React Frontend (dist/)  │
└─────────────────────────────┘
```

## Cost Benefits

Compared to Windows Server:
- 💰 **60-70% lower hosting costs**
- ⚡ Better performance for Node.js
- 🪶 Lighter resource usage
- 🚀 Faster deployment

---

## Summary

You now have:
✅ **Ready-to-use bash deployment scripts**
✅ **Complete Ubuntu 24 documentation**
✅ **Day-to-day management tools**
✅ **Auto-restart and logging**
✅ **Health monitoring**
✅ **60-70% cost savings vs Windows**

**You're ready to deploy!** 🚀

For detailed instructions, see `DEPLOYMENT_GUIDE.md`
