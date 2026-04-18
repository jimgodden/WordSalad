#!/bin/bash

#############################################################################
# Linguistic Linguini - Ubuntu App Management Script
#
# Usage: ./manage_app.sh {status|start|stop|restart|logs|update|monitor|health}
#
# Examples:
#   ./manage_app.sh status
#   ./manage_app.sh logs
#   ./manage_app.sh restart
#   ./manage_app.sh logs | tail -n 50
#   ./manage_app.sh monitor
#
#############################################################################

APP_NAME="linguistic-linguini"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_FILE="server/index.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# Helper Functions
# ============================================================================
error() {
    echo -e "${RED}❌ $@${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✅ $@${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $@${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $@${NC}"
}

# ============================================================================
# Commands
# ============================================================================
show_status() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Application Status${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    pm2 status
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check if responding
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        success "Application is responding on port 3000"
    else
        warn "Application may not be responding on port 3000"
    fi
}

start_app() {
    info "Starting application..."
    cd "$PROJECT_DIR"
    pm2 start "$SERVER_FILE" --name "$APP_NAME" --force
    success "Application started"
}

stop_app() {
    info "Stopping application..."
    pm2 stop "$APP_NAME"
    success "Application stopped"
}

restart_app() {
    info "Restarting application..."
    cd "$PROJECT_DIR"
    pm2 restart "$APP_NAME"
    success "Application restarted"
}

show_logs() {
    info "Showing application logs..."
    pm2 logs "$APP_NAME" --lines 30 --nostream
}

update_app() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Updating Application${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    cd "$PROJECT_DIR"
    
    info "Stopping application..."
    pm2 stop "$APP_NAME"
    
    info "Pulling latest code..."
    git pull || warn "Git pull failed. Continuing with current code..."
    
    info "Installing dependencies..."
    npm install > /dev/null 2>&1 || error "npm install failed"
    
    info "Building frontend..."
    npm run build > /dev/null 2>&1 || error "npm run build failed"
    
    info "Restarting application..."
    pm2 restart "$APP_NAME" || error "pm2 restart failed"
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    success "Update complete"
    echo ""
    show_status
}

monitor_app() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Monitoring $APP_NAME (Press Ctrl+C to stop)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    watch -n 2 "pm2 status && echo '' && pm2 monit $APP_NAME"
}

health_check() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Health Check${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    local healthy=true
    
    # Check Node.js
    info "Checking Node.js..."
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        success "Node.js $node_version installed"
    else
        error "Node.js not found"
        healthy=false
    fi
    
    # Check npm
    info "Checking npm..."
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        success "npm $npm_version installed"
    else
        error "npm not found"
        healthy=false
    fi
    
    # Check PM2
    info "Checking PM2..."
    if command -v pm2 &> /dev/null; then
        local pm2_version=$(pm2 --version)
        success "PM2 $pm2_version installed"
    else
        error "PM2 not found"
        healthy=false
    fi
    
    # Check if application is registered
    info "Checking application status..."
    if pm2 status | grep -q "$APP_NAME"; then
        success "Application is registered with PM2"
    else
        warn "Application not found in PM2"
        healthy=false
    fi
    
    # Check firewall
    info "Checking firewall rules..."
    if sudo ufw status | grep -q "3000"; then
        success "Firewall rule for port 3000 exists"
    else
        warn "Firewall rule for port 3000 not found"
    fi
    
    # Check port
    info "Checking port 3000..."
    if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
        success "Port 3000 is listening"
    else
        warn "Port 3000 is not listening"
    fi
    
    # Check HTTP response
    info "Checking HTTP response..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
        success "Application responding to HTTP requests"
    else
        error "Application not responding to HTTP requests"
        healthy=false
    fi
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if [ "$healthy" = true ]; then
        success "All health checks passed"
    else
        warn "Some health checks failed. Review above for details."
    fi
}

# ============================================================================
# Main
# ============================================================================
case "${1:-status}" in
    status)
        show_status
        ;;
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    logs)
        show_logs
        ;;
    update)
        update_app
        ;;
    monitor)
        monitor_app
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {status|start|stop|restart|logs|update|monitor|health}"
        echo ""
        echo "Examples:"
        echo "  $0 status              - Show application status"
        echo "  $0 start               - Start application"
        echo "  $0 stop                - Stop application"
        echo "  $0 restart             - Restart application"
        echo "  $0 logs                - Show logs"
        echo "  $0 update              - Update and restart"
        echo "  $0 monitor             - Monitor in real-time"
        echo "  $0 health              - Run health checks"
        exit 1
        ;;
esac
