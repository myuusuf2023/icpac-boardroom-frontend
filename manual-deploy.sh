#!/bin/bash
# Manual deployment instructions

echo "🚀 ICPAC Booking System - Manual Deployment Guide"
echo "================================================="
echo ""
echo "Since automated deployment needs sshpass, here are manual steps:"
echo ""

echo "📋 STEP 1: Upload files to VPS"
echo "Run these commands in separate terminal windows:"
echo ""
echo "Terminal 1 - Upload package:"
echo "scp /home/yusuf/icpac/icpac-boardroom-frontend/icpac-booking.tar.gz root@77.237.247.119:/tmp/"
echo ""
echo "Terminal 2 - Upload deployment script:"
echo "scp /home/yusuf/icpac/icpac-boardroom-frontend/complete-deployment.sh root@77.237.247.119:/tmp/"
echo ""

echo "📋 STEP 2: Connect to VPS and deploy"
echo "ssh root@77.237.247.119"
echo "Password: ikraan2019#"
echo ""
echo "Then run on VPS:"
echo "cd /tmp"
echo "chmod +x complete-deployment.sh"
echo "./complete-deployment.sh"
echo ""

echo "📋 STEP 3: Access your live application"
echo "Frontend: http://77.237.247.119"
echo "Admin: http://77.237.247.119/admin/"
echo "Username: superadmin"
echo "Password: admin123"
echo ""

echo "🔍 Files ready for upload:"
echo "$(ls -lh /home/yusuf/icpac/icpac-boardroom-frontend/icpac-booking.tar.gz)"
echo "$(ls -lh /home/yusuf/icpac/icpac-boardroom-frontend/complete-deployment.sh)"