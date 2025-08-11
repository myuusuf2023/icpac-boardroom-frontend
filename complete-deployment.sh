#!/bin/bash
# Complete ICPAC Booking System Deployment Script
# This script will be uploaded and run on the VPS

set -e  # Exit on any error

echo "🚀 ICPAC Booking System - Complete Deployment"
echo "=============================================="
echo "VPS: 77.237.247.119"
echo "Starting complete deployment..."
echo ""

# Update system packages
echo "📦 Step 1: Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "🔧 Step 2: Installing required packages..."
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
    ufw \
    software-properties-common

# Install Node.js 18
echo "📦 Step 3: Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Configure PostgreSQL
echo "🗄️ Step 4: Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create PostgreSQL user and database
sudo -u postgres psql << 'EOF'
DROP DATABASE IF EXISTS icpac_booking_db;
DROP USER IF EXISTS icpac_user;
CREATE USER icpac_user WITH PASSWORD 'icpac_prod_2025!';
CREATE DATABASE icpac_booking_db OWNER icpac_user;
GRANT ALL PRIVILEGES ON DATABASE icpac_booking_db TO icpac_user;
ALTER USER icpac_user CREATEDB;
\q
EOF

echo "✅ PostgreSQL configured successfully!"

# Create application directory
echo "📁 Step 5: Creating application directory..."
mkdir -p /var/www/icpac-booking
cd /var/www/icpac-booking

# Extract uploaded application code
echo "📦 Step 6: Extracting application code..."
if [ -f "/tmp/icpac-booking.tar.gz" ]; then
    tar -xzf /tmp/icpac-booking.tar.gz
    ls -la
else
    echo "❌ Application code not found. Please upload icpac-booking.tar.gz to /tmp/"
    exit 1
fi

# Set up Python virtual environment for backend
echo "🐍 Step 7: Setting up Python environment..."
cd icpac-booking-backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📦 Step 8: Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
pip install psycopg2-binary gunicorn

# Create production .env file
echo "⚙️ Step 9: Creating production environment..."
cat > .env << 'EOF'
DEBUG=False
SECRET_KEY=icpac-prod-secret-$(date +%s)-$(openssl rand -hex 16)
DATABASE_URL=postgresql://icpac_user:icpac_prod_2025!@localhost:5432/icpac_booking_db
ALLOWED_HOSTS=77.237.247.119,localhost,127.0.0.1
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=http://77.237.247.119

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=noreply@icpac.net

# Frontend URL
FRONTEND_URL=http://77.237.247.119
EOF

# Run Django setup
echo "🔄 Step 10: Setting up Django..."
python manage.py migrate
echo "✅ Database migrated!"

# Create superuser automatically
echo "👤 Step 11: Creating superuser..."
python create_superuser.py
echo "✅ Superuser created!"

# Collect static files
echo "📂 Step 12: Collecting static files..."
python manage.py collectstatic --noinput
echo "✅ Static files collected!"

# Test Django application
echo "🧪 Step 13: Testing Django setup..."
python manage.py check
echo "✅ Django setup validated!"

# Build frontend
echo "🌐 Step 14: Building frontend..."
cd /var/www/icpac-booking
npm install --production
npm run build
echo "✅ Frontend built!"

# Set up Supervisor for Django
echo "⚙️ Step 15: Setting up process management..."
cat > /etc/supervisor/conf.d/icpac-booking.conf << 'EOF'
[program:icpac-booking-backend]
command=/var/www/icpac-booking/icpac-booking-backend/venv/bin/gunicorn icpac_booking.wsgi:application --bind 127.0.0.1:8001 --workers 3 --timeout 120
directory=/var/www/icpac-booking/icpac-booking-backend
user=www-data
autostart=true
autorestart=true
stdout_logfile=/var/log/icpac-booking.log
stderr_logfile=/var/log/icpac-booking-error.log
environment=PATH="/var/www/icpac-booking/icpac-booking-backend/venv/bin"
EOF

# Set up Nginx
echo "🌐 Step 16: Configuring web server..."
cat > /etc/nginx/sites-available/icpac-booking << 'EOF'
server {
    listen 80;
    server_name 77.237.247.119;
    client_max_body_size 100M;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

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
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
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

# Set permissions
echo "🔐 Step 17: Setting permissions..."
chown -R www-data:www-data /var/www/icpac-booking
chmod -R 755 /var/www/icpac-booking

# Configure firewall
echo "🔥 Step 18: Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Start all services
echo "🚀 Step 19: Starting services..."
systemctl restart postgresql
supervisorctl reread
supervisorctl update
supervisorctl start icpac-booking-backend
systemctl restart nginx

# Wait a moment for services to start
sleep 5

# Check service status
echo "🔍 Step 20: Checking service status..."
echo "Backend status:"
supervisorctl status icpac-booking-backend
echo ""
echo "Nginx status:"
systemctl status nginx --no-pager -l
echo ""

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "===================================="
echo "🌐 Your ICPAC Booking System is now LIVE!"
echo ""
echo "📍 Access URLs:"
echo "   Frontend: http://77.237.247.119"
echo "   Admin Panel: http://77.237.247.119/admin/"
echo "   API: http://77.237.247.119/api/"
echo ""
echo "👤 Login Credentials:"
echo "   Username: superadmin"
echo "   Password: admin123"
echo "   Email: admin@icpac.net"
echo ""
echo "📊 Service Management:"
echo "   sudo supervisorctl status icpac-booking-backend"
echo "   sudo supervisorctl restart icpac-booking-backend" 
echo "   sudo systemctl restart nginx"
echo ""
echo "📝 Logs:"
echo "   Application: tail -f /var/log/icpac-booking.log"
echo "   Errors: tail -f /var/log/icpac-booking-error.log"
echo "   Nginx: tail -f /var/log/nginx/access.log"
echo ""
echo "✅ Ready to use! Open http://77.237.247.119 in your browser!"