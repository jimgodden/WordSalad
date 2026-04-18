#!/bin/bash

#############################################################################
# Linguistic Linguini - Quick Update Script
#
# Usage: ./quick_update.sh [--skip-git-pull]
#
# Examples:
#   ./quick_update.sh                # Pull, build, restart
#   ./quick_update.sh --skip-git-pull # Just build & restart
#
#############################################################################

APP_NAME="linguistic-linguini"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_GIT_PULL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-git-pull)
            SKIP_GIT_PULL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      Linguistic Linguini - Quick Update              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_DIR"

# Step 1: Git pull (if not skipped)
if [ "$SKIP_GIT_PULL" = false ]; then
    echo -e "${YELLOW}Step 1: Pulling latest code...${NC}"
    if ! git pull; then
        echo -e "${YELLOW}⚠️  Git pull encountered an issue. Continuing anyway...${NC}"
    fi
else
    echo -e "${YELLOW}Step 1: Skipping git pull${NC}"
fi

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"
if ! npm install --production; then
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
fi

# Step 3: Build frontend
echo -e "${YELLOW}Step 3: Building frontend...${NC}"
if ! npm run build; then
    echo -e "${RED}❌ npm run build failed${NC}"
    exit 1
fi

# Step 4: Restart application
echo -e "${YELLOW}Step 4: Restarting application...${NC}"
if ! pm2 restart "$APP_NAME"; then
    echo -e "${RED}❌ pm2 restart failed${NC}"
    exit 1
fi

# Success message
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ Update Complete Successfully!            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Application Status:${NC}"
pm2 status
echo ""
echo -e "${CYAN}💡 Tip: View logs with: pm2 logs $APP_NAME${NC}"
