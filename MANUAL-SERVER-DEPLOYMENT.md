# 🚀 ICPAC Booking System - Manual Server Deployment Guide

## Server Information
- **Server**: Ubuntu 24.04.3 LTS (Contabo VPS)  
- **IP**: 77.237.247.119
- **User**: ayman (sudo privileges)
- **Authentication**: SSH key-based (no password auth)

## 📋 Step-by-Step Deployment

### Step 1: Connect to Server
```bash
ssh ayman@77.237.247.119
```

### Step 2: Update System and Install Docker
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git ufw htop nano vim

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker ayman

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### Step 3: Install Docker Compose
```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 4: Configure Firewall
```bash
# Configure UFW firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Check status
sudo ufw status
```

### Step 5: Clone Repository
```bash
# Clone the repository
cd /home/ayman
git clone https://github.com/myuusuf2023/icpac-boardroom-frontend.git icpac-booking-system
cd icpac-booking-system

# Make scripts executable
chmod +x scripts/*.sh
```

### Step 6: Configure Environment
```bash
# Create production environment file
cp .env.production.example .env.production

# Generate secure secrets
export SECRET_KEY=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 16)  
export REDIS_PASSWORD=$(openssl rand -base64 16)

# Update environment file
nano .env.production
```

**Edit `.env.production` with these values:**
```env
# Security
SECRET_KEY=<generated_secret_key>
DEBUG=False

# Database
POSTGRES_DB=icpac_bookings
POSTGRES_USER=icpac_user
POSTGRES_PASSWORD=<generated_postgres_password>

# Redis
REDIS_PASSWORD=<generated_redis_password>

# Domain
DOMAIN_NAME=77.237.247.119
ALLOWED_HOSTS=localhost,127.0.0.1,77.237.247.119
FRONTEND_URL=http://77.237.247.119

# Email (Configure with your settings)
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@icpac.net
SSL_EMAIL=admin@icpac.net

# Backup
BACKUP_KEEP_DAYS=7
```

### Step 7: Create Required Directories
```bash
# Create necessary directories
mkdir -p logs/nginx backups ssl
```

### Step 8: Deploy the System
```bash
# Deploy using the automated script
./scripts/deploy.sh
```

**OR Manual deployment:**
```bash
# Start database and cache first
docker-compose -f docker-compose.production.yml up -d postgres redis

# Wait for database to be ready
sleep 30

# Run migrations
docker-compose -f docker-compose.production.yml run --rm backend python manage.py migrate

# Collect static files
docker-compose -f docker-compose.production.yml run --rm backend python manage.py collectstatic --noinput

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

### Step 9: Create Superuser
```bash
# Create Django superuser
docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

### Step 10: Set Up Automation (Optional)
```bash
# Update crontab paths
sed -i "s|/path/to|$(pwd)|g" scripts/crontab

# Install cron jobs for automation
crontab scripts/crontab

# Verify cron jobs
crontab -l
```

### Step 11: SSL Certificate (Optional)
```bash
# Install certbot for SSL
sudo apt install -y certbot

# Get SSL certificate (requires domain name)
# Replace with your domain
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/
sudo chown ayman:ayman ssl/*.pem
```

## 🔍 Verification

### Check Services
```bash
# Check all containers are running
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Check specific service
docker-compose -f docker-compose.production.yml logs backend
```

### Test Application
```bash
# Test frontend
curl -I http://77.237.247.119

# Test API
curl http://77.237.247.119/api/auth/

# Test admin panel
curl -I http://77.237.247.119/admin/
```

## 🌐 Access URLs

Once deployed, access your application at:

- **Frontend**: http://77.237.247.119
- **Admin Panel**: http://77.237.247.119/admin/  
- **API**: http://77.237.247.119/api/

## 🔧 Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f nginx
```

### Restart Services  
```bash
# Restart all
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

### Backup Database
```bash
# Manual backup
docker-compose -f docker-compose.production.yml exec -T backup /backup.sh

# View backups
ls -la backups/
```

### Health Check
```bash
# Run health check
./scripts/health-check.sh

# Check system resources
docker stats
```

## 🚨 Troubleshooting

### Common Issues

1. **Containers not starting:**
   ```bash
   # Check Docker service
   sudo systemctl status docker
   
   # Check logs
   docker-compose -f docker-compose.production.yml logs
   ```

2. **Database connection issues:**
   ```bash
   # Check PostgreSQL logs
   docker-compose -f docker-compose.production.yml logs postgres
   
   # Restart database
   docker-compose -f docker-compose.production.yml restart postgres
   ```

3. **Permission issues:**
   ```bash
   # Fix permissions
   sudo chown -R ayman:ayman /home/ayman/icpac-booking-system
   ```

4. **Firewall blocking:**
   ```bash
   # Check UFW status
   sudo ufw status
   
   # Allow ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

### Reset Everything (if needed)
```bash
# Stop all containers
docker-compose -f docker-compose.production.yml down -v

# Remove all data (CAUTION: Data loss!)
docker system prune -a --volumes

# Redeploy
./scripts/deploy.sh
```

## 📞 Support

For issues:
1. Check container logs: `docker-compose logs [service]`
2. Run health check: `./scripts/health-check.sh` 
3. Check system resources: `docker stats`
4. Review configuration: `.env.production`

## 🎉 Congratulations!

Your ICPAC Booking System is now deployed with:
- ✅ Docker containerization
- ✅ Production-ready configuration  
- ✅ Automated backups
- ✅ Health monitoring
- ✅ SSL ready
- ✅ Automated maintenance

**The system is now ready for production use!** 🚀