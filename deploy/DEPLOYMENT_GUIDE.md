# Linguistic Linguini - Ubuntu 24 Deployment Guide

## Overview
This guide walks you through deploying the Linguistic Linguini application to an Azure VM running Ubuntu 24.04 LTS.

## Prerequisites

### Azure VM Requirements
- **OS**: Ubuntu 24.04 LTS
- **CPU**: 1+ cores (for dev/test), 2+ cores recommended
- **RAM**: 2GB minimum, 4GB+ recommended
- **Disk**: 20GB minimum free space
- **Network**: Allow inbound traffic on port 3000 (or your chosen port)

### Before Starting
1. Create an Azure VM with Ubuntu 24.04 LTS
2. Ensure you have SSH access to the VM
3. Have sudo privileges on the VM

## Deployment Steps

### Step 1: Connect to Your VM
```bash
# On your local machine:
ssh azureuser@<your-vm-ip>
```

### Step 2: Download or Clone the Application

**Option A: Using Git (Recommended)**
```bash
cd /home/azureuser
git clone https://github.com/yourusername/WordSalad.git
cd WordSalad
```

**Option B: Using SCP to upload files**
```bash
# On your local machine:
scp -r C:\repos\WordSalad azureuser@<your-vm-ip>:/home/azureuser/
```

### Step 3: Run the Deployment Script

SSH into the VM and execute:

```bash
cd ~/WordSalad/deploy

# Make script executable
chmod +x setup_vm.sh

# Run as sudo (required)
sudo ./setup_vm.sh

# Or specify a custom port:
sudo ./setup_vm.sh --port 8080

# Or skip the final reboot:
sudo ./setup_vm.sh --skip-reboot
```

**What the script does:**
1. ✅ Updates system packages
2. ✅ Installs Node.js 22 LTS
3. ✅ Configures UFW firewall for your app port
4. ✅ Installs PM2 (process manager)
5. ✅ Builds the frontend (npm run build)
6. ✅ Starts the application
7. ✅ Configures auto-start on reboot
8. ✅ Reboots the system

### Step 4: Verify Deployment

After the VM reboots, reconnect via SSH and run:

```bash
cd ~/WordSalad/deploy
chmod +x manage_app.sh

# Check application status
./manage_app.sh status

# Run health check
./manage_app.sh health
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
```bash
./manage_app.sh status
```

### View Application Logs
```bash
# Last 30 lines
./manage_app.sh logs

# Real-time logs
pm2 logs linguistic-linguini --follow

# Specific number of lines
pm2 logs linguistic-linguini --lines 100
```

### Restart the Application
```bash
./manage_app.sh restart
```

### Stop the Application
```bash
./manage_app.sh stop
```

### Start the Application
```bash
./manage_app.sh start
```

### Monitor Performance
```bash
# Shows CPU and memory usage in real-time
./manage_app.sh monitor
```

### Update the Application
When you want to deploy new code:

```bash
cd ~/WordSalad
git pull

cd deploy
./manage_app.sh update
```

Or without git pull:
```bash
./quick_update.sh --skip-git-pull
```

### Run Health Check
```bash
./manage_app.sh health
```

---

## Troubleshooting

### Application won't start

**Check logs:**
```bash
./manage_app.sh logs
```

**Common issues:**
- Port already in use: Change port with `sudo ./setup_vm.sh --port 8080`
- Missing dependencies: Run `npm install` in the project root
- Build errors: Check `npm run build` output

### Cannot access application from outside

**Check firewall rule:**
```bash
sudo ufw status
```

**Verify port is listening:**
```bash
sudo netstat -tuln | grep 3000
```

**Add firewall rule manually:**
```bash
sudo ufw allow 3000/tcp
```

### Application crashes repeatedly

**Check for errors:**
```bash
pm2 logs linguistic-linguini --lines 50
```

**Restart Node.js:**
```bash
./manage_app.sh restart
```

**If persistent, delete and restart:**
```bash
pm2 delete linguistic-linguini
pm2 start server/index.js --name linguistic-linguini
```

### High memory/CPU usage

**Monitor in real-time:**
```bash
./manage_app.sh monitor
```

**Check for memory leaks in logs and restart if needed:**
```bash
pm2 restart linguistic-linguini
```

### Deployment script fails

**Run with verbose output:**
```bash
sudo bash -x ./setup_vm.sh
```

**Check deployment log:**
```bash
sudo tail -f /var/log/linguistic-linguini/deployment_*.log
```

---

## Advanced Configuration

### Change Application Port

**Option 1: During initial setup**
```bash
sudo ./setup_vm.sh --port 8080
```

**Option 2: After deployment**
1. Update firewall rule (remove old, add new)
2. Edit PM2 configuration or restart with new port
3. Update any reverse proxy rules

### Enable HTTPS

For production, set up a reverse proxy with SSL/TLS certificates:

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create config (example)
sudo nano /etc/nginx/sites-available/linguistic-linguini
```

### Scheduled Backups

Create a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * tar -czf /home/azureuser/backups/wordsalad_$(date +\%Y\%m\%d).tar.gz /home/azureuser/WordSalad
```

### Enable Application Insights (Monitoring)

1. Create Application Insights resource in Azure
2. Update server code with instrumentation key
3. Deploy with `./manage_app.sh update`

---

## Useful PM2 Commands

```bash
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

1. **Use a Reverse Proxy**: Set up Nginx or Caddy for SSL/TLS termination
2. **Enable Logging**: Ensure application logs are being captured
3. **Monitor Resources**: Set up Azure VM monitoring and alerts
4. **Backup Strategy**: Regular backups of application data and configurations
5. **Auto-Recovery**: PM2 is configured to auto-restart on reboot
6. **Security**: 
   - Disable root SSH access
   - Enable SSH key-based authentication
   - Keep Ubuntu updated (`sudo apt-get update && upgrade`)
   - Use NSG rules to restrict access
   - Consider using managed identity for Azure resources

---

## Support & Troubleshooting

### Useful Paths
- **App Directory**: `/home/azureuser/WordSalad`
- **Logs**: `/var/log/linguistic-linguini/`
- **Deploy Scripts**: `/home/azureuser/WordSalad/deploy/`
- **Node Modules**: `/home/azureuser/WordSalad/node_modules/`

### Check System Requirements
```bash
# Node.js version
node --version

# npm version
npm --version

# PM2 version
pm2 --version

# Disk space
df -h

# Memory usage
free -h
```

### Get System Info
```bash
uname -a
lsb_release -a
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
