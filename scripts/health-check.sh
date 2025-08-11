#!/bin/bash

# ICPAC Booking System - Health Check Script
# This script monitors the health of all system components

set -e

# Configuration
PROJECT_DIR="/path/to/icpac-boardroom-frontend"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"
LOG_FILE="/var/log/icpac-health.log"
ALERT_EMAIL="admin@icpac.net"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Send alert function
send_alert() {
    local message="$1"
    log "ALERT: $message"
    
    # Send email alert (requires mail command)
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "ICPAC Booking System Alert" "$ALERT_EMAIL"
    fi
    
    # Send Slack notification (if webhook URL is configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 ICPAC Booking System Alert: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Check container health
check_container_health() {
    local container_name="$1"
    local status=$(docker-compose -f "$COMPOSE_FILE" ps -q "$container_name" | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    
    case "$status" in
        "healthy")
            log "✅ $container_name is healthy"
            return 0
            ;;
        "unhealthy")
            send_alert "$container_name is unhealthy"
            return 1
            ;;
        "starting")
            log "🔄 $container_name is starting"
            return 0
            ;;
        *)
            send_alert "$container_name is not running or health status unknown"
            return 1
            ;;
    esac
}

# Check service availability
check_service_url() {
    local url="$1"
    local service_name="$2"
    local expected_code="${3:-200}"
    
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$response_code" -eq "$expected_code" ]; then
        log "✅ $service_name is responding (HTTP $response_code)"
        return 0
    else
        send_alert "$service_name is not responding correctly (HTTP $response_code)"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local threshold=85
    local usage=$(df /var/lib/docker | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        send_alert "High disk usage: ${usage}% (threshold: ${threshold}%)"
        return 1
    else
        log "✅ Disk usage is acceptable: ${usage}%"
        return 0
    fi
}

# Check memory usage
check_memory_usage() {
    local threshold=90
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -gt "$threshold" ]; then
        send_alert "High memory usage: ${usage}% (threshold: ${threshold}%)"
        return 1
    else
        log "✅ Memory usage is acceptable: ${usage}%"
        return 0
    fi
}

# Main health check
log "Starting health check..."

# Check if Docker Compose is running
if ! docker-compose -f "$COMPOSE_FILE" ps >/dev/null 2>&1; then
    send_alert "Docker Compose is not running or not accessible"
    exit 1
fi

# Check individual containers
containers=("postgres" "redis" "backend" "nginx" "celery" "celery-beat")
failed_containers=0

for container in "${containers[@]}"; do
    if ! check_container_health "$container"; then
        ((failed_containers++))
    fi
done

# Check service endpoints
check_service_url "http://localhost/health/" "Frontend Health Check"
check_service_url "http://localhost/api/auth/" "Backend API"

# Check system resources
check_disk_space
check_memory_usage

# Check SSL certificate expiry (if domain is configured)
if [ -n "$DOMAIN_NAME" ] && command -v openssl >/dev/null 2>&1; then
    cert_expiry=$(echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    expiry_timestamp=$(date -d "$cert_expiry" +%s)
    current_timestamp=$(date +%s)
    days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    if [ "$days_until_expiry" -lt 30 ]; then
        send_alert "SSL certificate expires in $days_until_expiry days"
    else
        log "✅ SSL certificate is valid for $days_until_expiry more days"
    fi
fi

# Summary
if [ "$failed_containers" -eq 0 ]; then
    log "✅ Health check completed successfully - all systems operational"
    exit 0
else
    log "❌ Health check completed with $failed_containers failed containers"
    exit 1
fi