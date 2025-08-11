#!/bin/bash

# ICPAC Booking System - Server Deployment Script
# Deploys to Ubuntu 24.04.3 LTS (Contabo VPS)

set -e

# Server configuration
SERVER_USER="ayman"
SERVER_HOST="77.237.247.119"
PROJECT_NAME="icpac-booking-system"
PROJECT_DIR="/home/$SERVER_USER/$PROJECT_NAME"
REPO_URL="https://github.com/myuusuf2023/icpac-boardroom-frontend.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

success() {
    log "${GREEN}✅ $1${NC}"
}

warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

error() {
    log "${RED}❌ $1${NC}"
    exit 1
}

info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Check if SSH key exists
check_ssh_key() {
    if [ ! -f ~/.ssh/id_rsa ] && [ ! -f ~/.ssh/id_ed25519 ]; then
        error "No SSH key found. Please set up SSH key authentication first."
    fi
    success "SSH key found"
}

# Test SSH connection
test_ssh_connection() {
    info "Testing SSH connection to server..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" exit 2>/dev/null; then
        success "SSH connection successful"
    else
        error "SSH connection failed. Please check your SSH key and server access."
    fi
}

# Install Docker and Docker Compose on server
install_docker() {
    info "Installing Docker and Docker Compose on server..."
    ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
        set -e
        
        # Update system
        sudo apt update && sudo apt upgrade -y
        
        # Install required packages
        sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git ufw
        
        # Install Docker
        if ! command -v docker &> /dev/null; then
            echo "Installing Docker..."
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt update
            sudo apt install -y docker-ce docker-ce-cli containerd.io
            sudo usermod -aG docker ayman
            sudo systemctl enable docker
            sudo systemctl start docker
        fi
        
        # Install Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            echo "Installing Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
        
        # Configure firewall
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        
        # Install additional tools
        sudo apt install -y htop curl wget nano vim cron certbot
        
        echo "Docker and system setup completed!"
ENDSSH
    success "Docker and system setup completed"
}

# Deploy application to server
deploy_application() {
    info "Deploying ICPAC Booking System to server..."
    ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
        set -e
        
        # Clone or update repository
        if [ -d "$PROJECT_DIR" ]; then
            echo "Updating existing repository..."
            cd "$PROJECT_DIR"
            git pull origin main
        else
            echo "Cloning repository..."
            git clone "$REPO_URL" "$PROJECT_DIR"
            cd "$PROJECT_DIR"
        fi
        
        # Make scripts executable
        chmod +x scripts/*.sh
        
        # Create environment file if it doesn't exist
        if [ ! -f .env.production ]; then
            echo "Creating .env.production file..."
            cp .env.production.example .env.production
            
            # Generate secure values
            SECRET_KEY=\$(openssl rand -base64 32)
            POSTGRES_PASSWORD=\$(openssl rand -base64 16)
            REDIS_PASSWORD=\$(openssl rand -base64 16)
            
            # Update environment file
            sed -i "s/SECRET_KEY=.*/SECRET_KEY=\$SECRET_KEY/" .env.production
            sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=\$POSTGRES_PASSWORD/" .env.production
            sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=\$REDIS_PASSWORD/" .env.production
            sed -i "s/DOMAIN_NAME=.*/DOMAIN_NAME=$SERVER_HOST/" .env.production
            sed -i "s/ALLOWED_HOSTS=.*/ALLOWED_HOSTS=localhost,127.0.0.1,$SERVER_HOST/" .env.production
            
            echo "⚠️  IMPORTANT: Edit .env.production with your email settings!"
        fi
        
        # Create necessary directories
        mkdir -p logs/nginx backups ssl
        
        # Deploy the application
        echo "Starting deployment..."
        ./scripts/deploy.sh
        
        echo "🎉 Deployment completed!"
        echo "📊 Access your application at: http://$SERVER_HOST"
        echo "🔧 Admin panel: http://$SERVER_HOST/admin/"
        echo "📡 API: http://$SERVER_HOST/api/"
ENDSSH
    success "Application deployed successfully"
}

# Set up cron jobs
setup_cron_jobs() {
    info "Setting up automated cron jobs..."
    ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
        set -e
        cd "$PROJECT_DIR"
        
        # Update crontab paths
        sed -i "s|/path/to|$PROJECT_DIR|g" scripts/crontab
        
        # Install cron jobs
        crontab scripts/crontab
        
        echo "Cron jobs installed successfully"
ENDSSH
    success "Cron jobs configured"
}

# Setup SSL certificate
setup_ssl() {
    info "Setting up SSL certificate..."
    ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
        set -e
        cd "$PROJECT_DIR"
        
        # Get SSL certificate using certbot
        if [ ! -f ssl/fullchain.pem ]; then
            echo "Obtaining SSL certificate..."
            docker-compose -f docker-compose.production.yml run --rm certbot || echo "SSL setup will be configured manually"
        fi
ENDSSH
    success "SSL setup initiated"
}

# Main deployment function
main() {
    echo "🚀 Starting ICPAC Booking System deployment to server..."
    echo "📊 Server: $SERVER_USER@$SERVER_HOST"
    echo "📁 Directory: $PROJECT_DIR"
    echo ""
    
    check_ssh_key
    test_ssh_connection
    install_docker
    deploy_application
    setup_cron_jobs
    
    echo ""
    echo "🎉 ICPAC Booking System deployed successfully!"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Frontend: http://$SERVER_HOST"
    echo "   Admin:    http://$SERVER_HOST/admin/"
    echo "   API:      http://$SERVER_HOST/api/"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. SSH to server: ssh $SERVER_USER@$SERVER_HOST"
    echo "2. Configure email settings in $PROJECT_DIR/.env.production"
    echo "3. Create superuser: docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser"
    echo "4. Set up domain name and SSL certificate"
    echo ""
    echo "📚 Documentation: $PROJECT_DIR/README-DEPLOYMENT.md"
    echo ""
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"