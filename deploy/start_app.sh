#!/bin/bash

# Exit on error
set -e

echo "🚀 Deploying Linguistic Linguini..."

# 1. Install Dependencies
echo "📦 Installing project dependencies..."
npm install

# 2. Build Frontend
echo "🏗️ Building frontend..."
npm run build

# 3. Start/Restart with PM2
echo "🔄 Starting application with PM2..."
# Check if app is already running
if pm2 list | grep -q "linguistic-linguini"; then
    pm2 restart linguistic-linguini
else
    pm2 start server/index.js --name "linguistic-linguini"
fi

pm2 save
echo "✅ Application Deployed! (Internal Port 3000)"
