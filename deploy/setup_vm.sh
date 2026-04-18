#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Environment Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl git unzip

# 2. Install Node.js (v20 LTS)
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (Process Manager)
echo "🔄 Installing PM2..."
sudo npm install -g pm2

# 4. Install Caddy (Web Server / Reverse Proxy)
echo "🔒 Installing Caddy..."
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy

echo "✅ Setup Complete!"
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "PM2: $(pm2 -v)"
echo "Caddy: $(caddy version)"
