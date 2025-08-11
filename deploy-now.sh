#!/bin/bash
# Deploy ICPAC Booking System NOW - Run this locally

set -e

echo "🚀 ICPAC Booking System - LIVE DEPLOYMENT"
echo "========================================="
echo "Target: 77.237.247.119"
echo ""

VPS_IP="77.237.247.119"
VPS_USER="root"
VPS_PASS="ikraan2019#"

# Install sshpass if not available (for automated SSH)
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass for automated deployment..."
    # Try different package managers
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y sshpass
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y sshpass
    else
        echo "Please install sshpass manually and run this script again"
        exit 1
    fi
fi

# Create deployment package
echo "📦 Step 1: Creating deployment package..."
tar -czf icpac-booking.tar.gz \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='db.sqlite3' \
    --exclude='.git' \
    --exclude='build' \
    --exclude='*.log' \
    --exclude='deploy-*.sh' \
    --exclude='icpac-booking.tar.gz' \
    .

echo "✅ Package created: $(du -h icpac-booking.tar.gz | cut -f1)"

# Upload package to VPS
echo "📤 Step 2: Uploading to VPS..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no \
    icpac-booking.tar.gz \
    complete-deployment.sh \
    $VPS_USER@$VPS_IP:/tmp/

echo "✅ Files uploaded successfully!"

# Run deployment on VPS
echo "🚀 Step 3: Running deployment on VPS..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'EOF'
cd /tmp
chmod +x complete-deployment.sh
./complete-deployment.sh
EOF

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "======================"
echo ""
echo "🌐 Your ICPAC Booking System is now LIVE at:"
echo "   👉 http://77.237.247.119"
echo ""
echo "🔑 Admin Access:"
echo "   👉 http://77.237.247.119/admin/"
echo "   Username: superadmin"
echo "   Password: admin123"
echo ""
echo "🧪 Testing the deployment..."

# Test if the site is responding
if curl -s -o /dev/null -w "%{http_code}" http://77.237.247.119 | grep -q "200\|301\|302"; then
    echo "✅ Website is responding!"
else
    echo "⚠️  Website might still be starting up. Please wait 30 seconds and try again."
fi

# Clean up local files
rm -f icpac-booking.tar.gz

echo ""
echo "🎯 Next Steps:"
echo "1. Open http://77.237.247.119 in your browser"
echo "2. Test the booking functionality"
echo "3. Access admin panel to manage rooms and users"
echo ""
echo "📞 If you need to make changes:"
echo "   ssh root@77.237.247.119"
echo "   Password: ikraan2019#"