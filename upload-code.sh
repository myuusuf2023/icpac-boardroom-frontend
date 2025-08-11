#!/bin/bash
# Upload code to VPS - Run this on your LOCAL machine

echo "📤 Uploading ICPAC Booking System to VPS"
echo "========================================"

VPS_IP="77.237.247.119"
VPS_USER="root"

# Create deployment package (excluding unnecessary files)
echo "📦 Creating deployment package..."
tar -czf icpac-booking-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='db.sqlite3' \
    --exclude='.git' \
    --exclude='build' \
    --exclude='*.log' \
    .

echo "📤 Uploading to VPS..."
scp icpac-booking-deploy.tar.gz $VPS_USER@$VPS_IP:/tmp/

echo "📦 Extracting on VPS..."
ssh $VPS_USER@$VPS_IP << 'EOF'
cd /var/www/icpac-booking
tar -xzf /tmp/icpac-booking-deploy.tar.gz
rm /tmp/icpac-booking-deploy.tar.gz
ls -la
EOF

echo "✅ Code uploaded successfully!"
echo ""
echo "Next steps:"
echo "1. SSH to your VPS: ssh root@77.237.247.119"
echo "2. Run: cd /var/www/icpac-booking && chmod +x setup-application.sh && ./setup-application.sh"

# Clean up local file
rm icpac-booking-deploy.tar.gz