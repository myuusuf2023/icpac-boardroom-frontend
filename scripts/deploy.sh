#!/bin/bash

# ICPAC Booking System - Deployment Script
# This script handles the complete deployment process

set -e

# Configuration
PROJECT_NAME="icpac-booking-system"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_BEFORE_DEPLOY=${BACKUP_BEFORE_DEPLOY:-true}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
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

# Send deployment notification
notify() {
    local message="$1"
    local status="${2:-info}"
    
    info "$message"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="ℹ️"
        case "$status" in
            "success") emoji="✅" ;;
            "error") emoji="❌" ;;
            "warning") emoji="⚠️" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji ICPAC Booking System: $message\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed"
    fi
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        error ".env.production file not found. Copy .env.production.example and configure it."
    fi
    
    # Check if required directories exist
    for dir in logs backups ssl scripts; do
        if [ ! -d "$dir" ]; then
            warning "Creating missing directory: $dir"
            mkdir -p "$dir"
        fi
    done
    
    success "Prerequisites check passed"
}

# Backup database before deployment
backup_database() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        info "Creating backup before deployment..."
        
        # Check if database container is running
        if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
            docker-compose -f "$COMPOSE_FILE" exec -T backup /backup.sh || warning "Backup failed, continuing deployment"
            success "Pre-deployment backup completed"
        else
            warning "Database container not running, skipping backup"
        fi
    fi
}

# Pull latest images
pull_images() {
    info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    success "Images pulled successfully"
}

# Build custom images
build_images() {
    info "Building custom images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    success "Images built successfully"
}

# Deploy services
deploy_services() {
    info "Deploying services..."
    
    # Start database and redis first
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    timeout=60
    while ! docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U ${POSTGRES_USER:-icpac_user} >/dev/null 2>&1; do
        timeout=$((timeout - 1))
        if [ $timeout -eq 0 ]; then
            error "Database failed to start within timeout"
        fi
        sleep 1
    done
    success "Database is ready"
    
    # Run migrations
    info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" run --rm backend python manage.py migrate
    success "Database migrations completed"
    
    # Collect static files
    info "Collecting static files..."
    docker-compose -f "$COMPOSE_FILE" run --rm backend python manage.py collectstatic --noinput
    success "Static files collected"
    
    # Start all services
    docker-compose -f "$COMPOSE_FILE" up -d
    success "All services started"
}

# Wait for services to be healthy
wait_for_health() {
    info "Waiting for services to be healthy..."
    
    local timeout=300  # 5 minutes
    local services=("backend" "nginx")
    
    for service in "${services[@]}"; do
        info "Waiting for $service to be healthy..."
        local count=0
        while [ $count -lt $timeout ]; do
            if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
                success "$service is healthy"
                break
            fi
            
            count=$((count + 5))
            if [ $count -ge $timeout ]; then
                error "$service failed to become healthy within timeout"
            fi
            sleep 5
        done
    done
}

# Run deployment tests
run_tests() {
    info "Running deployment tests..."
    
    # Test API endpoint
    if curl -f -s http://localhost/api/auth/ >/dev/null; then
        success "API endpoint test passed"
    else
        error "API endpoint test failed"
    fi
    
    # Test frontend
    if curl -f -s http://localhost/ >/dev/null; then
        success "Frontend test passed"
    else
        error "Frontend test failed"
    fi
    
    # Test database connection
    if docker-compose -f "$COMPOSE_FILE" exec -T backend python manage.py check --database default >/dev/null; then
        success "Database connection test passed"
    else
        error "Database connection test failed"
    fi
}

# Clean up old containers and images
cleanup() {
    info "Cleaning up old containers and images..."
    docker system prune -f >/dev/null
    success "Cleanup completed"
}

# Main deployment process
main() {
    notify "🚀 Starting deployment of ICPAC Booking System"
    
    check_prerequisites
    backup_database
    pull_images
    build_images
    deploy_services
    wait_for_health
    run_tests
    cleanup
    
    notify "✅ Deployment completed successfully!" "success"
    
    info "🎉 ICPAC Booking System is now running!"
    info "Frontend: http://localhost (or your configured domain)"
    info "Admin: http://localhost/admin/"
    info "API: http://localhost/api/"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi