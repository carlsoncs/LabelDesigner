#!/bin/bash

# ZPL Label Designer - Setup Script
# Run this from the project root directory on your server

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "ZPL Label Designer Setup"
echo "========================"
echo ""

# Determine project directory (where this script lives)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# -------------------------------------------------------------------------
# Step 1: Check prerequisites
# -------------------------------------------------------------------------
echo -e "${GREEN}[1/7] Checking prerequisites...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required but not installed.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required but not installed.${NC}"; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo -e "${RED}PM2 is required. Install with: npm install -g pm2${NC}"; exit 1; }

NODE_VERSION=$(node -v)
echo -e "  Node.js ${NODE_VERSION}"
echo -e "  npm $(npm -v)"
echo -e "  PM2 $(pm2 -v)"
echo -e "${GREEN}  All prerequisites found${NC}"

# -------------------------------------------------------------------------
# Step 2: Configure environment
# -------------------------------------------------------------------------
echo -e "\n${GREEN}[2/7] Configuring environment...${NC}"

if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    echo -e "${YELLOW}  Created backend/.env from .env.example${NC}"
    echo -e "${YELLOW}  IMPORTANT: Edit backend/.env to set your password and JWT secret${NC}"
    echo -e "${YELLOW}    nano $PROJECT_DIR/backend/.env${NC}"
    echo ""
    read -p "  Press Enter after editing .env (or Ctrl+C to abort)..."
else
    echo -e "  backend/.env already exists, skipping"
fi

# -------------------------------------------------------------------------
# Step 3: Install and build frontend
# -------------------------------------------------------------------------
echo -e "\n${GREEN}[3/7] Building frontend...${NC}"
cd "$PROJECT_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}  Frontend built to frontend/dist/${NC}"

# -------------------------------------------------------------------------
# Step 4: Install and build backend
# -------------------------------------------------------------------------
echo -e "\n${GREEN}[4/7] Building backend...${NC}"
cd "$PROJECT_DIR/backend"
npm install
npm run build
echo -e "${GREEN}  Backend built to backend/dist/${NC}"

# -------------------------------------------------------------------------
# Step 5: Start with PM2
# -------------------------------------------------------------------------
echo -e "\n${GREEN}[5/7] Starting PM2 process...${NC}"
cd "$PROJECT_DIR"

# Stop existing instance if running
pm2 delete zpl-label-api 2>/dev/null || true

# Start the application
pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}  PM2 process started${NC}"

# -------------------------------------------------------------------------
# Step 6: NGINX configuration
# -------------------------------------------------------------------------
echo -e "\n${GREEN}[6/7] NGINX Configuration${NC}"
echo ""
echo "  Copy and edit the nginx config template:"
echo -e "${YELLOW}    sudo cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/labels.yourdomain.com${NC}"
echo ""
echo "  Edit it to set your domain and paths:"
echo -e "${YELLOW}    sudo nano /etc/nginx/sites-available/labels.yourdomain.com${NC}"
echo ""
echo "  Things to update in the nginx config:"
echo "    - server_name  (your domain)"
echo "    - root         (path to frontend/dist)"
echo ""
echo "  Enable and reload:"
echo -e "${YELLOW}    sudo ln -s /etc/nginx/sites-available/labels.yourdomain.com /etc/nginx/sites-enabled/${NC}"
echo -e "${YELLOW}    sudo nginx -t && sudo systemctl reload nginx${NC}"

# -------------------------------------------------------------------------
# Step 7: SSL (optional)
# -------------------------------------------------------------------------
echo -e "\n${GREEN}[7/7] SSL (optional)${NC}"
echo ""
echo "  To add HTTPS with Let's Encrypt:"
echo -e "${YELLOW}    sudo certbot --nginx -d labels.yourdomain.com${NC}"

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
echo ""
echo "========================"
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  Project directory: $PROJECT_DIR"
echo "  API running on:    http://localhost:3001"
echo "  Frontend built to: $PROJECT_DIR/frontend/dist"
echo ""
echo "  Default login:     admin / (whatever you set in .env)"
echo ""
echo "  PM2 commands:"
echo "    pm2 status              - Check status"
echo "    pm2 logs zpl-label-api  - View logs"
echo "    pm2 restart zpl-label-api - Restart"
echo ""
echo -e "${YELLOW}  Don't forget to:${NC}"
echo "    1. Add a DNS A record for your domain"
echo "    2. Configure NGINX (see step 6 above)"
echo "    3. Set up SSL with certbot"
echo ""
