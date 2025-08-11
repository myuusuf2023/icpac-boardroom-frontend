# ICPAC Booking System - Docker Deployment Guide

This guide provides complete instructions for deploying the ICPAC Booking System using Docker Compose.

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone <your-git-repo-url>
   cd icpac-boardroom-frontend
   ```

2. **Configure environment:**
   ```bash
   cp .env.production.example .env.production
   nano .env.production  # Edit with your values
   ```

3. **Deploy the system:**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 1.28+
- 4GB+ RAM
- 20GB+ disk space
- Domain name (for SSL)

## 🔧 Configuration

### Environment Variables

Edit `.env.production` with your specific values:

```env
# Security
SECRET_KEY=your-super-secret-django-key-here
DEBUG=False

# Database
POSTGRES_DB=icpac_bookings
POSTGRES_USER=icpac_user
POSTGRES_PASSWORD=your-secure-password

# Domain
DOMAIN_NAME=booking.icpac.net
ALLOWED_HOSTS=localhost,127.0.0.1,booking.icpac.net

# Email
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## 🏗️ System Architecture

The system consists of these services:

- **nginx**: Reverse proxy and frontend server
- **backend**: Django API application
- **postgres**: PostgreSQL database
- **redis**: Cache and session store
- **celery**: Background task worker
- **celery-beat**: Scheduled task scheduler
- **certbot**: SSL certificate management
- **backup**: Automated database backups

## 📦 Deployment Commands

### Initial Deployment
```bash
./scripts/deploy.sh
```

### Update Deployment
```bash
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### View Logs
```bash
docker-compose -f docker-compose.production.yml logs -f [service]
```

### Scale Services
```bash
docker-compose -f docker-compose.production.yml up -d --scale celery=3
```

## 🔐 SSL Configuration

### Automatic (Let's Encrypt)
SSL certificates are automatically obtained via Certbot:

```bash
# Initial certificate
docker-compose -f docker-compose.production.yml run --rm certbot

# Renewal (automated via cron)
docker-compose -f docker-compose.production.yml run --rm certbot renew
```

### Manual SSL
Place your SSL certificates in the `ssl/` directory:
- `fullchain.pem`
- `privkey.pem`

## 💾 Database Management

### Backup
```bash
# Manual backup
docker-compose -f docker-compose.production.yml exec -T backup /backup.sh

# Automated daily backups (configured in cron)
```

### Restore
```bash
# List available backups
ls -la backups/

# Restore from backup
./scripts/restore.sh backups/icpac_booking_backup_20241201_020000.sql.gz
```

### Migrations
```bash
# Run migrations
docker-compose -f docker-compose.production.yml exec backend python manage.py migrate

# Create superuser
docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

## 📊 Monitoring & Health Checks

### Health Check Script
```bash
# Manual health check
./scripts/health-check.sh

# Automated (via cron every 15 minutes)
```

### Service Status
```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check specific service health
docker-compose -f docker-compose.production.yml ps backend
```

### Logs
```bash
# View all logs
docker-compose -f docker-compose.production.yml logs

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f backend

# Log locations
tail -f logs/nginx/access.log
tail -f logs/backend.log
```

## 🔄 Automation (Cron Jobs)

Install automated tasks:
```bash
# Copy cron jobs (update paths first)
sed -i 's|/path/to|'$(pwd)'|g' scripts/crontab
crontab scripts/crontab
```

Automated tasks include:
- Daily database backups (2:00 AM)
- Monthly SSL renewal (3:00 AM)
- Weekly log cleanup (4:00 AM Sunday)
- System health checks (every 15 minutes)
- Daily Celery worker restart (5:00 AM)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   docker-compose -f docker-compose.production.yml ps postgres
   
   # View database logs
   docker-compose -f docker-compose.production.yml logs postgres
   ```

2. **Frontend Not Loading**
   ```bash
   # Check nginx status
   docker-compose -f docker-compose.production.yml ps nginx
   
   # Rebuild frontend
   docker-compose -f docker-compose.production.yml build nginx
   ```

3. **API Errors**
   ```bash
   # Check backend logs
   docker-compose -f docker-compose.production.yml logs backend
   
   # Run Django check
   docker-compose -f docker-compose.production.yml exec backend python manage.py check
   ```

4. **Email Not Sending**
   ```bash
   # Test email configuration
   docker-compose -f docker-compose.production.yml exec backend python manage.py shell
   # In shell: from django.core.mail import send_mail; send_mail('test', 'test', 'from@email.com', ['to@email.com'])
   ```

### Recovery Commands
```bash
# Complete restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Reset database (CAUTION: Data loss)
docker-compose -f docker-compose.production.yml down -v
docker volume rm $(docker volume ls -q | grep icpac)
```

## 🔧 Performance Tuning

### Resource Limits
Services have resource limits configured. Adjust in `docker-compose.production.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 1G
    reservations:
      memory: 512M
```

### Scaling
```bash
# Scale Celery workers
docker-compose -f docker-compose.production.yml up -d --scale celery=4

# Scale database connections
# Edit DATABASES settings in Django
```

## 🛡️ Security Features

- HTTPS-only communication
- Security headers via Nginx
- Database authentication
- Redis password protection
- Regular security updates
- Automated backups
- Resource limits

## 🆘 Support

For issues:
1. Check logs: `docker-compose logs [service]`
2. Run health check: `./scripts/health-check.sh`
3. Check system resources: `docker stats`
4. Review configuration: `.env.production`

## 📝 Maintenance

### Regular Tasks
- Monitor disk space
- Review logs for errors
- Update Docker images monthly
- Test backup restoration quarterly
- Review SSL certificate status

### Updates
```bash
# Update system
git pull origin main
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Update dependencies
docker-compose -f docker-compose.production.yml build --no-cache
```

---

**🎉 Your ICPAC Booking System is now ready for production!**

Access your application at: `https://your-domain.com`
Admin panel: `https://your-domain.com/admin/`
API documentation: `https://your-domain.com/api/`