#!/bin/bash

#############################################################################
# Linguistic Linguini - Ubuntu 24 Deployment Script
#
# Usage: ./setup_vm.sh [--port PORT] [--skip-reboot]
#
# Examples:
#   ./setup_vm.sh                    # Default (port 3000)
#   ./setup_vm.sh --port 8080        # Custom port
#   ./setup_vm.sh --skip-reboot      # Don't reboot
#
# Note: Run with sudo or as root
#############################################################################

set -e  # Exit on error

# ============================================================================
# Configuration
# ============================================================================
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_FILE="server/index.js"
APP_NAME="linguistic-linguini"
APP_PORT=3000
SKIP_REBOOT=false
LOG_DIR="/var/log/$APP_NAME"
LOG_FILE="$LOG_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"

# ============================================================================
# Parse Arguments
# ============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            APP_PORT="$2"
            shift 2
            ;;
        --skip-reboot)
            SKIP_REBOOT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ============================================================================
# Colors for Output
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp]${NC} [${level}] ${message}"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $@${NC}"
    log "SUCCESS" "$@"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $@${NC}"
    log "WARNING" "$@"
}

log_error() {
    echo -e "${RED}❌ $@${NC}"
    log "ERROR" "$@"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use: sudo ./setup_vm.sh)"
        exit 1
    fi
}

# ============================================================================
# System Updates
# ============================================================================
update_system() {
    log "INFO" "Updating system packages..."
    apt-get update > /dev/null
    apt-get upgrade -y > /dev/null
    log_success "System packages updated"
}

# ============================================================================
# Install Node.js
# ============================================================================
install_nodejs() {
    if command -v node &> /dev/null; then
        local version=$(node --version)
        log "INFO" "Node.js already installed: $version"
        return 0
    fi

    log "INFO" "Installing Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - > /dev/null
    apt-get install -y nodejs > /dev/null
    
    local version=$(node --version)
    log_success "Node.js installed: $version"
    
    local npm_version=$(npm --version)
    log "INFO" "npm version: $npm_version"
}

# ============================================================================
# Install PM2
# ============================================================================
install_pm2() {
    log "INFO" "Installing PM2 globally..."
    npm install -g pm2 > /dev/null
    
    # Enable PM2 startup script
    pm2 startup systemd -u root --hp /root > /dev/null
    
    log_success "PM2 installed and configured"
}

# ============================================================================
# Configure Firewall
# ============================================================================
configure_firewall() {
    log "INFO" "Configuring UFW firewall for port $APP_PORT..."
    
    # Enable UFW if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        log "INFO" "Enabling UFW..."
        ufw --force enable > /dev/null
    fi
    
    # Allow SSH (important!)
    ufw allow 22/tcp > /dev/null
    
    # Allow application port
    ufw allow "$APP_PORT/tcp" > /dev/null
    
    log_success "Firewall configured for port $APP_PORT"
}

# ============================================================================
# Build Application
# ============================================================================
build_application() {
    log "INFO" "Building application..."
    
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        log_error "package.json not found in $PROJECT_DIR"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    log "INFO" "Installing dependencies..."
    npm install > /dev/null 2>&1
    
    log "INFO" "Building frontend..."
    npm run build > /dev/null 2>&1
    
    log_success "Application built successfully"
}

# ============================================================================
# Start Application
# ============================================================================
start_application() {
    log "INFO" "Starting application with PM2..."
    
    # Stop any existing instance
    pm2 delete "$APP_NAME" 2>/dev/null || true
    
    cd "$PROJECT_DIR"
    
    # Start the application
    pm2 start "$SERVER_FILE" --name "$APP_NAME" > /dev/null
    
    # Save PM2 configuration
    pm2 save > /dev/null
    
    log_success "Application started successfully"
}

# ============================================================================
# Create Log Directory
# ============================================================================
create_log_directory() {
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
}

# ============================================================================
# Main Execution
# ============================================================================
main() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║   Linguistic Linguini - Ubuntu 24 Deployment          ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    check_root
    create_log_directory
    
    log "INFO" "Starting deployment process"
    log "INFO" "Application Port: $APP_PORT"
    log "INFO" "Project Directory: $PROJECT_DIR"
    log "INFO" "Log File: $LOG_FILE"
    echo ""
    
    # Step 1: Update System
    echo -e "${YELLOW}Step 1: Updating system...${NC}"
    update_system
    echo ""
    
    # Step 2: Install Node.js
    echo -e "${YELLOW}Step 2: Installing Node.js...${NC}"
    if ! install_nodejs; then
        log_error "Failed to install Node.js"
        exit 1
    fi
    echo ""
    
    # Step 3: Configure Firewall
    echo -e "${YELLOW}Step 3: Configuring firewall...${NC}"
    configure_firewall
    echo ""
    
    # Step 4: Install PM2
    echo -e "${YELLOW}Step 4: Installing PM2...${NC}"
    if ! install_pm2; then
        log_error "Failed to install PM2"
        exit 1
    fi
    echo ""
    
    # Step 5: Build Application
    echo -e "${YELLOW}Step 5: Building application...${NC}"
    if ! build_application; then
        log_error "Failed to build application"
        exit 1
    fi
    echo ""
    
    # Step 6: Start Application
    echo -e "${YELLOW}Step 6: Starting application...${NC}"
    if ! start_application; then
        log_error "Failed to start application"
        exit 1
    fi
    echo ""
    
    # Final status
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              🎉 Deployment Complete! 🎉                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${CYAN}Application Status:${NC}"
    pm2 status
    echo ""
    
    echo -e "${GREEN}Access your application at:${NC}"
    echo "  http://localhost:$APP_PORT"
    echo "  http://<your-vm-ip>:$APP_PORT"
    echo ""
    
    echo -e "${CYAN}Useful PM2 Commands:${NC}"
    echo "  pm2 status              - View running processes"
    echo "  pm2 logs $APP_NAME        - View application logs"
    echo "  pm2 restart $APP_NAME     - Restart application"
    echo "  pm2 stop $APP_NAME        - Stop application"
    echo "  pm2 delete $APP_NAME      - Remove from PM2"
    echo ""
    
    echo -e "${CYAN}Log file saved to: $LOG_FILE${NC}"
    echo ""
    
    log "SUCCESS" "Deployment completed successfully"
    
    if [ "$SKIP_REBOOT" = false ]; then
        echo -e "${YELLOW}System will reboot in 30 seconds...${NC}"
        log "INFO" "Initiating system reboot"
        sleep 30
        reboot
    else
        echo -e "${YELLOW}⚠️  Consider rebooting to ensure all components are fully active${NC}"
    fi
}

# ============================================================================
# Run Main
# ============================================================================
main "$@"
