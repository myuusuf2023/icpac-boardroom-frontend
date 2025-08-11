# ICPAC Booking System - Cloud Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the ICPAC Boardroom Booking System to cloud infrastructure. The system uses Docker containerization for easy deployment across different cloud providers.

## Prerequisites

### Server Requirements
- **Minimum**: 2 vCPU, 4GB RAM, 20GB SSD
- **Recommended**: 4 vCPU, 8GB RAM, 50GB SSD
- **Operating System**: Ubuntu 20.04 LTS or later
- **Docker**: Version 20.10+ with Docker Compose V2
- **Domain**: Registered domain pointing to your server

### Required Ports
- **80** (HTTP) - Redirects to HTTPS
- **443** (HTTPS) - Main application access
- **22** (SSH) - Server administration

## Cloud Provider Options

### Option 1: AWS EC2 Deployment

#### 1. Create EC2 Instance
```bash
# Launch Ubuntu 20.04 LTS instance
# Instance Type: t3.medium (recommended)
# Security Group: Allow ports 22, 80, 443
# Key Pair: Create or use existing
```

#### 2. Connect and Setup Server
```bash
# Connect to your instance
ssh -i your-key.pem ubuntu@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose V2
sudo apt install docker-compose-plugin

# Logout and login again for group changes
exit
```

### Option 2: DigitalOcean Droplet

#### 1. Create Droplet
```bash
# Create Ubuntu 20.04 droplet
# Size: 4GB RAM / 2 vCPUs (recommended)
# Add SSH key
# Enable monitoring and backups
```

#### 2. Setup Docker
```bash
# Use the Docker 1-Click App or install manually
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### Option 3: Google Cloud Platform

#### 1. Create Compute Engine Instance
```bash
# Machine Type: e2-standard-2
# Boot Disk: Ubuntu 20.04 LTS, 50GB
# Firewall: Allow HTTP and HTTPS traffic
```

#### 2. Install Dependencies
```bash
# SSH into instance
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-plugin git
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

## Deployment Steps

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/icpac-boardroom-frontend.git
cd icpac-boardroom-frontend

# Or upload your files via SCP/SFTP
scp -r -i your-key.pem /local/project/ ubuntu@server:/home/ubuntu/
```

### Step 2: Configure Environment Variables

```bash
# Copy production environment template
cp .env.production .env

# Edit environment variables
nano .env
```

**Critical Variables to Update:**
```bash
# Generate secure secret key (50+ characters)
SECRET_KEY=your-super-secret-production-key-change-this-immediately

# Update with your domain
ALLOWED_HOSTS=booking.icpac.net,www.booking.icpac.net
FRONTEND_URL=https://booking.icpac.net

# Set secure database password
POSTGRES_PASSWORD=your-secure-database-password-32-chars-min

# Set Redis password
REDIS_PASSWORD=your-secure-redis-password

# Configure email (Gmail example)
EMAIL_HOST_USER=noreply@icpac.net
EMAIL_HOST_PASSWORD=your-app-specific-password
```

### Step 3: Configure SSL Certificate

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Stop nginx if running
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d booking.icpac.net -d www.booking.icpac.net

# Create SSL directory
mkdir -p ssl
sudo cp /etc/letsencrypt/live/booking.icpac.net/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/booking.icpac.net/privkey.pem ssl/
sudo chown -R $USER:$USER ssl/
```

#### Option B: Custom SSL Certificate

```bash
# Create SSL directory
mkdir -p ssl

# Copy your SSL certificate files
cp your-domain.crt ssl/fullchain.pem
cp your-domain.key ssl/privkey.pem
```

### Step 4: Update Frontend API Configuration

```bash
# Update frontend API base URL
nano src/services/api.js

# Change this line:
const API_BASE_URL = 'https://booking.icpac.net/api';
```

### Step 5: Build and Deploy

```bash
# Build and start all services
docker compose -f docker-compose.production.yml up -d --build

# Check if services are running
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f
```

### Step 6: Database Setup

```bash
# Run database migrations
docker compose -f docker-compose.production.yml exec backend python manage.py migrate

# Create superuser account
docker compose -f docker-compose.production.yml exec backend python manage.py createsuperuser

# Collect static files (if not done automatically)
docker compose -f docker-compose.production.yml exec backend python manage.py collectstatic --noinput
```

### Step 7: Verify Deployment

```bash
# Check service health
curl -k https://booking.icpac.net/health/
curl -k https://booking.icpac.net/api/auth/

# Access the application
# Open https://booking.icpac.net in browser
```

## DNS Configuration

### Domain Setup

1. **A Record**: Point `booking.icpac.net` to your server IP
2. **CNAME Record**: Point `www.booking.icpac.net` to `booking.icpac.net`
3. **TTL**: Set to 300 seconds for initial deployment

### Example DNS Records
```
Type    Name                  Value              TTL
A       booking.icpac.net     203.0.113.10       300
CNAME   www.booking.icpac.net booking.icpac.net  300
```

## Security Configuration

### Firewall Setup (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### SSL Certificate Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Create renewal script
sudo nano /etc/cron.d/certbot-renew

# Add this content:
0 12 * * * root certbot renew --quiet --post-hook "docker compose -f /home/ubuntu/icpac-boardroom-frontend/docker-compose.production.yml restart frontend"
```

### Security Headers Verification

```bash
# Test security headers
curl -I https://booking.icpac.net

# Should include:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
```

## Monitoring and Maintenance

### Health Checks

```bash
# Create monitoring script
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "=== Health Check $(date) ==="

# Check service status
docker compose -f docker-compose.production.yml ps

# Check disk space
df -h

# Check memory usage
free -h

# Test application endpoints
curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/health/
echo " - Health endpoint"

curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/api/auth/
echo " - API endpoint"
EOF

chmod +x health-check.sh
```

### Log Management

```bash
# View application logs
docker compose -f docker-compose.production.yml logs -f backend
docker compose -f docker-compose.production.yml logs -f frontend

# Setup log rotation
sudo nano /etc/logrotate.d/docker

# Add content:
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=1M
  missingok
  delaycompress
  copytruncate
}
```

### Backup Configuration

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/icpac-booking"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U icpac_user icpac_bookings > $BACKUP_DIR/db_$DATE.sql

# Media files backup
tar -czf $BACKUP_DIR/media_$DATE.tar.gz media/

# Keep only last 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/icpac-boardroom-frontend/backup.sh") | crontab -
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker compose -f docker-compose.production.yml logs container-name

# Check environment variables
docker compose -f docker-compose.production.yml config

# Restart specific service
docker compose -f docker-compose.production.yml restart backend
```

#### 2. Database Connection Error
```bash
# Check postgres logs
docker compose -f docker-compose.production.yml logs postgres

# Verify database URL
docker compose -f docker-compose.production.yml exec backend env | grep DATABASE_URL

# Test connection
docker compose -f docker-compose.production.yml exec backend python manage.py dbshell
```

#### 3. SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in ssl/fullchain.pem -text -noout | grep "Not After"

# Renew certificate
sudo certbot renew

# Update docker volumes
sudo cp /etc/letsencrypt/live/booking.icpac.net/* ssl/
```

#### 4. High Memory Usage
```bash
# Check container resource usage
docker stats

# Restart services
docker compose -f docker-compose.production.yml restart

# Scale services if needed
docker compose -f docker-compose.production.yml up -d --scale backend=2
```

## Performance Optimization

### Production Optimizations

```bash
# Enable Docker log size limits
echo '{"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}}' | sudo tee /etc/docker/daemon.json

# Restart Docker
sudo systemctl restart docker

# Configure swappiness for better performance
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### Database Tuning

```bash
# Create postgres tuning configuration
cat > postgres-tuning.conf << 'EOF'
# PostgreSQL Performance Tuning
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
EOF

# Update docker-compose to use custom config
# Add to postgres service in docker-compose.production.yml:
# volumes:
#   - ./postgres-tuning.conf:/etc/postgresql/postgresql.conf
```

## Scaling Considerations

### Horizontal Scaling

```bash
# Scale backend services
docker compose -f docker-compose.production.yml up -d --scale backend=3

# Use external load balancer
# Configure AWS ALB, GCP Load Balancer, or Nginx upstream
```

### External Services

```bash
# Use managed PostgreSQL (AWS RDS, GCP Cloud SQL)
DATABASE_URL=postgresql://user:pass@external-db:5432/dbname

# Use managed Redis (AWS ElastiCache, GCP Memorystore)
REDIS_URL=redis://external-redis:6379/0
```

## Support and Maintenance

### Update Procedure

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker compose -f docker-compose.production.yml up -d --build

# Run migrations if needed
docker compose -f docker-compose.production.yml exec backend python manage.py migrate
```

### Contact Information

- **System Administrator**: admin@icpac.net
- **Technical Support**: support@icpac.net
- **Emergency Contact**: +254-XX-XXXX-XXX

---

**Last Updated**: August 10, 2025  
**Version**: 1.0.0  
**Deployment Target**: Production Cloud Infrastructure