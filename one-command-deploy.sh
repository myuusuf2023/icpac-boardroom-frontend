#!/bin/bash
echo "📋 ICPAC Booking System - One Command Deployment"
echo "Copy and paste this entire block into your terminal:"
echo ""
echo "# ==== COPY FROM HERE ===="
cat << 'EOF'
scp /home/yusuf/icpac/icpac-boardroom-frontend/icpac-booking.tar.gz root@77.237.247.119:/tmp/ && \
scp /home/yusuf/icpac/icpac-boardroom-frontend/complete-deployment.sh root@77.237.247.119:/tmp/ && \
ssh root@77.237.247.119 "cd /tmp && chmod +x complete-deployment.sh && ./complete-deployment.sh"
EOF
echo "# ==== COPY TO HERE ===="
echo ""
echo "Password when prompted: ikraan2019#"
echo ""
echo "🎯 After deployment, your app will be live at:"
echo "   Frontend: http://77.237.247.119"
echo "   Admin: http://77.237.247.119/admin/"
echo "   Login: superadmin / admin123"