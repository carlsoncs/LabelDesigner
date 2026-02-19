#!/bin/bash

# ZPL Label Designer - Setup Script
# Run this on your server to set up the complete application

set -e  # Exit on any error

echo "🏷️  ZPL Label Designer Setup"
echo "============================"
echo ""

# Configuration - EDIT THESE
INSTALL_DIR="/var/www/zpl-label-app"
DOMAIN="labels.yourdomain.com"  # Change this!

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Note: Some commands may require sudo${NC}"
fi

# Step 1: Create installation directory
echo -e "\n${GREEN}[1/6] Creating installation directory...${NC}"
sudo mkdir -p $INSTALL_DIR
sudo chown $USER:$USER $INSTALL_DIR

# Step 2: Copy files (assumes you're running this from the project directory)
echo -e "\n${GREEN}[2/6] Copying application files...${NC}"
cp -r frontend $INSTALL_DIR/
cp -r backend $INSTALL_DIR/
cp ecosystem.config.js $INSTALL_DIR/

# Step 3: Install frontend dependencies and build
echo -e "\n${GREEN}[3/6] Building frontend...${NC}"
cd $INSTALL_DIR/frontend
npm install
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 4: Install backend dependencies and build
echo -e "\n${GREEN}[4/6] Building backend...${NC}"
cd $INSTALL_DIR/backend
npm install
npm run build
echo -e "${GREEN}✓ Backend built successfully${NC}"

# Step 5: Set up PM2
echo -e "\n${GREEN}[5/6] Setting up PM2...${NC}"
cd $INSTALL_DIR

# Stop existing instance if running
pm2 delete zpl-label-api 2>/dev/null || true

# Start the application
pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}✓ PM2 process started${NC}"

# Step 6: NGINX setup instructions
echo -e "\n${GREEN}[6/6] NGINX Configuration${NC}"
echo ""
echo "Copy the nginx config to sites-available:"
echo -e "${YELLOW}  sudo cp $INSTALL_DIR/../nginx.conf /etc/nginx/sites-available/$DOMAIN${NC}"
echo ""
echo "Edit the config to set your domain:"
echo -e "${YELLOW}  sudo nano /etc/nginx/sites-available/$DOMAIN${NC}"
echo ""
echo "Enable the site:"
echo -e "${YELLOW}  sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/${NC}"
echo ""
echo "Test and reload NGINX:"
echo -e "${YELLOW}  sudo nginx -t && sudo systemctl reload nginx${NC}"
echo ""

# DNS reminder
echo -e "${YELLOW}Don't forget to add a DNS A record for $DOMAIN pointing to your server IP!${NC}"
echo ""

# Summary
echo "============================"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Application installed to: $INSTALL_DIR"
echo "API running on: http://localhost:3001"
echo "Frontend built to: $INSTALL_DIR/frontend/dist"
echo ""
echo "PM2 commands:"
echo "  pm2 status           - Check status"
echo "  pm2 logs zpl-label-api  - View logs"
echo "  pm2 restart zpl-label-api - Restart"
echo ""
