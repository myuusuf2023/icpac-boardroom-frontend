#!/bin/bash

# ICPAC Booking System - Production Deployment Script
# Usage: ./deploy.sh [domain-name]

set -e  # Exit on any error

# Configuration
DOMAIN=${1:-booking.icpac.net}
PROJECT_DIR="/home/ubuntu/icpac-boardroom-frontend"
COMPOSE_FILE="docker-compose.production.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
check_user() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        error "Docker Compose V2 is not installed."
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        error ".env file not found. Please copy .env.production to .env and configure it."
        exit 1
    fi
    
    # Check domain DNS resolution
    if ! nslookup $DOMAIN &> /dev/null; then
        warning "Domain $DOMAIN does not resolve. Make sure DNS is configured correctly."
    fi
    
    log "Prerequisites check completed"
}

# Generate secure passwords if not set
setup_environment() {
    log "Setting up environment variables..."
    
    # Source environment variables
    source .env
    
    # Generate secure passwords if not set
    if [[ "$SECRET_KEY" == "your-super-secret-production-key-change-this-immediately" ]]; then
        warning "Generating new SECRET_KEY..."
        SECRET_KEY=$(openssl rand -base64 50)
        sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    fi
    
    if [[ "$POSTGRES_PASSWORD" == "your-secure-database-password" ]]; then
        warning "Generating new POSTGRES_PASSWORD..."
        POSTGRES_PASSWORD=$(openssl rand -base64 32)
        sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
        sed -i "s/your-secure-database-password/$POSTGRES_PASSWORD/g" .env
    fi
    
    if [[ "$REDIS_PASSWORD" == "your-secure-redis-password" ]]; then
        warning "Generating new REDIS_PASSWORD..."
        REDIS_PASSWORD=$(openssl rand -base64 32)
        sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
        sed -i "s/your-secure-redis-password/$REDIS_PASSWORD/g" .env
    fi
    
    # Update domain in environment
    sed -i "s/booking\.icpac\.net/$DOMAIN/g" .env
    
    log "Environment setup completed"
}

# Setup SSL certificate
setup_ssl() {
    log "Setting up SSL certificate for $DOMAIN..."
    
    # Create SSL directory
    mkdir -p ssl
    
    # Check if certificate already exists
    if [[ -f "ssl/fullchain.pem" && -f "ssl/privkey.pem" ]]; then
        info "SSL certificate already exists"
        return
    fi
    
    # Install Certbot if not present
    if ! command -v certbot &> /dev/null; then
        info "Installing Certbot..."
        sudo apt update
        sudo apt install -y certbot
    fi
    
    # Stop any running nginx
    sudo systemctl stop nginx 2>/dev/null || true
    docker compose -f $COMPOSE_FILE down 2>/dev/null || true
    
    # Get Let's Encrypt certificate
    info "Obtaining SSL certificate for $DOMAIN..."
    sudo certbot certonly --standalone --non-interactive --agree-tos \
        --email admin@icpac.net \
        -d $DOMAIN -d www.$DOMAIN
    
    # Copy certificates
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/
    sudo chown -R $USER:$USER ssl/
    
    log "SSL certificate setup completed"
}

# Update frontend configuration
update_frontend_config() {
    log "Updating frontend configuration..."
    
    # Update API base URL in frontend
    sed -i "s|const API_BASE_URL = .*|const API_BASE_URL = 'https://$DOMAIN/api';|" src/services/api.js
    
    # Update manifest.json for PWA
    sed -i "s|\"start_url\": \".*\"|\"start_url\": \"https://$DOMAIN\"|" public/manifest.json
    
    log "Frontend configuration updated"
}

# Build and deploy application
deploy_application() {
    log "Building and deploying application..."
    
    # Pull latest images if any
    docker compose -f $COMPOSE_FILE pull --ignore-pull-failures
    
    # Build and start services
    info "Building Docker images..."
    docker compose -f $COMPOSE_FILE build --no-cache
    
    info "Starting services..."
    docker compose -f $COMPOSE_FILE up -d
    
    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if ! docker compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        error "Some services failed to start"
        docker compose -f $COMPOSE_FILE logs
        exit 1
    fi
    
    log "Application deployment completed"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Wait for postgres to be ready
    info "Waiting for PostgreSQL to be ready..."
    timeout=60
    while ! docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U ${POSTGRES_USER:-icpac_user} -d ${POSTGRES_DB:-icpac_bookings}; do
        sleep 5
        timeout=$((timeout - 5))
        if [[ $timeout -le 0 ]]; then
            error "PostgreSQL failed to start"
            exit 1
        fi
    done
    
    # Run migrations
    info "Running database migrations..."
    docker compose -f $COMPOSE_FILE exec -T backend python manage.py migrate
    
    # Collect static files
    info "Collecting static files..."
    docker compose -f $COMPOSE_FILE exec -T backend python manage.py collectstatic --noinput
    
    # Create superuser if it doesn't exist
    info "Checking for superuser..."
    if ! docker compose -f $COMPOSE_FILE exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
print('Superuser exists' if User.objects.filter(is_superuser=True).exists() else 'No superuser')
" | grep -q "Superuser exists"; then
        warning "No superuser found. Creating one..."
        docker compose -f $COMPOSE_FILE exec -T backend python manage.py createsuperuser \
            --email admin@icpac.net --noinput || true
    fi
    
    log "Database setup completed"
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        sudo ufw --force enable
    fi
    
    # Configure firewall rules
    sudo ufw allow 22/tcp  # SSH
    sudo ufw allow 80/tcp  # HTTP
    sudo ufw allow 443/tcp # HTTPS
    
    log "Firewall configuration completed"
}

# Setup SSL certificate auto-renewal
setup_ssl_renewal() {
    log "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > ssl-renew.sh << EOF
#!/bin/bash
certbot renew --quiet --post-hook "cd $PROJECT_DIR && docker compose -f $COMPOSE_FILE restart frontend"
EOF
    chmod +x ssl-renew.sh
    
    # Add to crontab if not already present
    if ! crontab -l 2>/dev/null | grep -q "ssl-renew.sh"; then
        (crontab -l 2>/dev/null; echo "0 12 * * * $PROJECT_DIR/ssl-renew.sh") | crontab -
        info "SSL auto-renewal scheduled"
    fi
    
    log "SSL auto-renewal setup completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check service health
    info "Checking service health..."
    sleep 10
    
    # Test HTTP redirect
    if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/health/ | grep -q "301\|302"; then
        info "✓ HTTP to HTTPS redirect working"
    else
        warning "× HTTP redirect may not be working"
    fi
    
    # Test HTTPS endpoints
    if curl -k -s -o /dev/null -w "%{http_code}" https://$DOMAIN/health/ | grep -q "200"; then
        info "✓ Health endpoint responding"
    else
        error "× Health endpoint not responding"
    fi
    
    if curl -k -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/auth/ | grep -q "405\|200"; then
        info "✓ API endpoint responding"
    else
        error "× API endpoint not responding"
    fi
    
    # Test frontend
    if curl -k -s https://$DOMAIN | grep -q "ICPAC"; then
        info "✓ Frontend loading"
    else
        error "× Frontend not loading properly"
    fi
    
    log "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Create health check script
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
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/health/)
echo "Health endpoint: $HTTP_CODE"

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/api/auth/)
echo "API endpoint: $API_CODE"

if [[ "$HTTP_CODE" != "200" ]] || [[ "$API_CODE" != "405" && "$API_CODE" != "200" ]]; then
    echo "WARNING: Application may be down!"
fi
EOF
    
    chmod +x health-check.sh
    
    log "Monitoring setup completed"
}

# Create backup script
setup_backup() {
    log "Setting up backup system..."
    
    cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/icpac-booking"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# Database backup
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U ${POSTGRES_USER:-icpac_user} ${POSTGRES_DB:-icpac_bookings} > $BACKUP_DIR/db_$DATE.sql

# Media files backup
if [[ -d "media" ]]; then
    tar -czf $BACKUP_DIR/media_$DATE.tar.gz media/
fi

# Configuration backup
cp .env $BACKUP_DIR/env_$DATE.backup

# Keep only last 7 backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete

echo "Backup completed at $(date)"
EOF
    
    chmod +x backup.sh
    
    # Schedule daily backups
    if ! crontab -l 2>/dev/null | grep -q "backup.sh"; then
        (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/backup.sh >> $PROJECT_DIR/logs/backup.log 2>&1") | crontab -
        info "Daily backup scheduled at 2 AM"
    fi
    
    log "Backup system setup completed"
}

# Main deployment function
main() {
    log "Starting ICPAC Booking System deployment for domain: $DOMAIN"
    
    check_user
    check_prerequisites
    setup_environment
    setup_ssl
    update_frontend_config
    deploy_application
    setup_database
    setup_firewall
    setup_ssl_renewal
    verify_deployment
    setup_monitoring
    setup_backup
    
    log "🎉 Deployment completed successfully!"
    echo
    info "Access your application at: https://$DOMAIN"
    info "Admin panel: https://$DOMAIN/admin/"
    info "API documentation: https://$DOMAIN/api/"
    echo
    warning "Important next steps:"
    echo "1. Set up DNS records for $DOMAIN and www.$DOMAIN"
    echo "2. Configure email settings in .env file"
    echo "3. Create admin user: docker compose -f $COMPOSE_FILE exec backend python manage.py createsuperuser"
    echo "4. Test all functionality thoroughly"
    echo "5. Set up external monitoring and alerting"
    echo
    info "For troubleshooting, check logs with:"
    echo "  docker compose -f $COMPOSE_FILE logs -f"
}

# Run main function
main "$@"