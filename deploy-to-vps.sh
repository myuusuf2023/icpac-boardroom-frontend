#!/bin/bash
# ICPAC Booking System - Production Deployment Script
# Run this script on your VPS: 77.237.247.119

set -e  # Exit on any error

echo "🚀 ICPAC Booking System - Production Deployment"
echo "=============================================="
echo "VPS: 77.237.247.119"
echo "Starting deployment..."
echo ""

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "🔧 Installing required packages..."
apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    nginx \
    git \
    curl \
    supervisor \
    ufw

# Install Node.js (for frontend)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "✅ System packages installed successfully!"

# Configure PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql << EOF
CREATE USER icpac_user WITH PASSWORD 'icpac_prod_password_2025';
CREATE DATABASE icpac_booking_db OWNER icpac_user;
GRANT ALL PRIVILEGES ON DATABASE icpac_booking_db TO icpac_user;
ALTER USER icpac_user CREATEDB;
\q
EOF

echo "✅ PostgreSQL configured successfully!"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/icpac-booking
cd /var/www/icpac-booking

# Set up firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ Basic server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Clone your code to /var/www/icpac-booking/"
echo "2. Set up virtual environment and install dependencies"
echo "3. Configure production settings"
echo "4. Set up Nginx configuration"
echo "5. Start the application"
echo ""
echo "Run the next script: setup-application.sh"