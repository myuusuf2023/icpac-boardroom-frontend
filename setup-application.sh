#!/bin/bash
# ICPAC Booking System - Application Setup Script
# Run this script AFTER deploy-to-vps.sh

set -e  # Exit on any error

echo "🚀 ICPAC Booking System - Application Setup"
echo "==========================================="

# Navigate to application directory
cd /var/www/icpac-booking

# Clone repository (you'll need to upload your code here)
echo "📁 Setting up application code..."
# You can either:
# 1. Upload via SCP/SFTP
# 2. Use git clone if you have a repository
# 3. Use rsync from your local machine

echo "⚠️  Please upload your application code to /var/www/icpac-booking/"
echo "   You can use: scp -r /path/to/your/code root@77.237.247.119:/var/www/icpac-booking/"
echo ""

# Wait for user confirmation
read -p "Have you uploaded the code? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please upload the code first, then run this script again."
    exit 1
fi

# Set up Python virtual environment for backend
echo "🐍 Setting up Python virtual environment..."
cd icpac-booking-backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install psycopg2-binary gunicorn

# Create production .env file
echo "⚙️  Creating production environment configuration..."
cat > .env << EOF
DEBUG=False
SECRET_KEY=icpac-prod-secret-key-$(openssl rand -hex 32)
DATABASE_URL=postgresql://icpac_user:icpac_prod_password_2025@localhost:5432/icpac_booking_db
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=77.237.247.119,localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://77.237.247.119,https://77.237.247.119

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@icpac.net
EMAIL_HOST_PASSWORD=your-email-password
DEFAULT_FROM_EMAIL=noreply@icpac.net

# Frontend URL
FRONTEND_URL=http://77.237.247.119
EOF

# Run Django migrations
echo "🔄 Running database migrations..."
python manage.py migrate

# Create superuser
echo "👤 Creating superuser..."
python create_superuser.py

# Collect static files
echo "📂 Collecting static files..."
python manage.py collectstatic --noinput

# Test Django application
echo "🧪 Testing Django application..."
python manage.py check

echo "✅ Backend setup completed!"

# Set up frontend
echo "🌐 Setting up frontend..."
cd ../
npm install
npm run build

echo "✅ Frontend built successfully!"

# Set up Supervisor configuration for Django
echo "⚙️  Setting up Supervisor for Django..."
cat > /etc/supervisor/conf.d/icpac-booking.conf << EOF
[program:icpac-booking-backend]
command=/var/www/icpac-booking/icpac-booking-backend/venv/bin/gunicorn icpac_booking.wsgi:application --bind 0.0.0.0:8001 --workers 3
directory=/var/www/icpac-booking/icpac-booking-backend
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/icpac-booking-backend.log
stderr_logfile=/var/log/icpac-booking-backend-error.log
EOF

# Set up Nginx configuration
echo "🌐 Setting up Nginx configuration..."
cat > /etc/nginx/sites-available/icpac-booking << 'EOF'
server {
    listen 80;
    server_name 77.237.247.119;

    # Frontend (React build)
    location / {
        root /var/www/icpac-booking/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/icpac-booking/icpac-booking-backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/icpac-booking/icpac-booking-backend/media/;
        expires 1y;
        add_header Cache-Control "public";
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/icpac-booking /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Set correct permissions
chown -R www-data:www-data /var/www/icpac-booking
chmod -R 755 /var/www/icpac-booking

# Start services
echo "🚀 Starting services..."
supervisorctl reread
supervisorctl update
supervisorctl start icpac-booking-backend
systemctl restart nginx

echo ""
echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================="
echo "🌐 Your application is now running at: http://77.237.247.119"
echo "🔧 Django Admin: http://77.237.247.119/admin/"
echo "📊 Backend API: http://77.237.247.119/api/"
echo ""
echo "📋 Service Management Commands:"
echo "   sudo supervisorctl status icpac-booking-backend"
echo "   sudo supervisorctl restart icpac-booking-backend"
echo "   sudo systemctl status nginx"
echo "   sudo systemctl restart nginx"
echo ""
echo "📝 Log files:"
echo "   Backend: /var/log/icpac-booking-backend.log"
echo "   Nginx: /var/log/nginx/access.log"
echo ""