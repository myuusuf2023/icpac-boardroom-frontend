# Monitoring and Backup Strategy Guide

## Overview

This comprehensive guide covers monitoring, alerting, backup, and disaster recovery strategies for the ICPAC Booking System in production environments.

## Monitoring Architecture

### 1. Application Monitoring

#### Health Check Endpoints
```nginx
# Health check configuration in nginx
location /health/ {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}

location /api/health/ {
    proxy_pass http://backend;
    access_log off;
}
```

#### System Health Monitoring Script
```bash
#!/bin/bash
# File: system_monitor.sh

LOG_FILE="/var/log/icpac_monitoring.log"
ALERT_EMAIL="admin@icpac.net"
THRESHOLD_CPU=80
THRESHOLD_MEMORY=85
THRESHOLD_DISK=90

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    echo "$message" | mail -s "$subject" $ALERT_EMAIL
    log_message "ALERT: $subject"
}

check_system_resources() {
    # CPU Usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    CPU_USAGE=${CPU_USAGE%.*}  # Remove decimal
    
    if [[ $CPU_USAGE -gt $THRESHOLD_CPU ]]; then
        send_alert "High CPU Usage Alert" "CPU usage is ${CPU_USAGE}% (threshold: ${THRESHOLD_CPU}%)"
    fi
    
    # Memory Usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", ($3/$2) * 100.0)}')
    
    if [[ $MEMORY_USAGE -gt $THRESHOLD_MEMORY ]]; then
        send_alert "High Memory Usage Alert" "Memory usage is ${MEMORY_USAGE}% (threshold: ${THRESHOLD_MEMORY}%)"
    fi
    
    # Disk Usage
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    
    if [[ $DISK_USAGE -gt $THRESHOLD_DISK ]]; then
        send_alert "High Disk Usage Alert" "Disk usage is ${DISK_USAGE}% (threshold: ${THRESHOLD_DISK}%)"
    fi
    
    log_message "System check: CPU ${CPU_USAGE}%, Memory ${MEMORY_USAGE}%, Disk ${DISK_USAGE}%"
}

check_docker_services() {
    # Check if all services are running
    SERVICES=("icpac-booking-frontend" "icpac-booking-backend" "icpac-booking-db" "icpac-booking-redis")
    
    for service in "${SERVICES[@]}"; do
        if ! docker ps | grep -q $service; then
            send_alert "Service Down Alert" "Docker service $service is not running"
            log_message "ERROR: Service $service is down"
        fi
    done
}

check_application_health() {
    # Test main endpoints
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/health/)
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/api/auth/)
    
    if [[ "$FRONTEND_STATUS" != "200" ]]; then
        send_alert "Frontend Health Check Failed" "Frontend returned status: $FRONTEND_STATUS"
        log_message "ERROR: Frontend health check failed ($FRONTEND_STATUS)"
    fi
    
    if [[ "$API_STATUS" != "405" && "$API_STATUS" != "200" ]]; then
        send_alert "API Health Check Failed" "API returned status: $API_STATUS"
        log_message "ERROR: API health check failed ($API_STATUS)"
    fi
    
    log_message "Health check: Frontend $FRONTEND_STATUS, API $API_STATUS"
}

check_database_connectivity() {
    DB_STATUS=$(docker compose -f docker-compose.production.yml exec -T postgres pg_isready -U icpac_user -d icpac_bookings 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        send_alert "Database Connectivity Failed" "Cannot connect to PostgreSQL database"
        log_message "ERROR: Database connectivity failed"
    else
        log_message "Database connectivity: OK"
    fi
}

check_ssl_certificate() {
    CERT_EXPIRY=$(openssl x509 -in ssl/fullchain.pem -text -noout | grep "Not After" | cut -d: -f2-)
    EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_DATE=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))
    
    if [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
        send_alert "SSL Certificate Expiring Soon" "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
        log_message "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    else
        log_message "SSL certificate: Valid for $DAYS_UNTIL_EXPIRY days"
    fi
}

# Main monitoring routine
main() {
    log_message "Starting system monitoring"
    
    check_system_resources
    check_docker_services
    check_application_health
    check_database_connectivity
    check_ssl_certificate
    
    log_message "System monitoring completed"
}

main "$@"
```

### 2. Performance Monitoring

#### Application Performance Monitoring
```python
# File: performance_monitor.py
import time
import json
import requests
import psutil
import docker
from datetime import datetime

class PerformanceMonitor:
    def __init__(self):
        self.client = docker.from_env()
        self.metrics = {}
        
    def collect_system_metrics(self):
        """Collect system-level metrics"""
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': {
                'total': psutil.virtual_memory().total,
                'available': psutil.virtual_memory().available,
                'percent': psutil.virtual_memory().percent
            },
            'disk': {
                'total': psutil.disk_usage('/').total,
                'free': psutil.disk_usage('/').free,
                'percent': psutil.disk_usage('/').percent
            },
            'network': {
                'bytes_sent': psutil.net_io_counters().bytes_sent,
                'bytes_recv': psutil.net_io_counters().bytes_recv
            }
        }
    
    def collect_docker_metrics(self):
        """Collect Docker container metrics"""
        containers = {}
        
        for container in self.client.containers.list():
            if 'icpac-booking' in container.name:
                stats = container.stats(stream=False)
                
                # Calculate CPU usage
                cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                           stats['precpu_stats']['cpu_usage']['total_usage']
                system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                              stats['precpu_stats']['system_cpu_usage']
                cpu_percent = (cpu_delta / system_delta) * 100.0 if system_delta > 0 else 0
                
                # Memory usage
                memory_usage = stats['memory_stats']['usage']
                memory_limit = stats['memory_stats']['limit']
                memory_percent = (memory_usage / memory_limit) * 100.0
                
                containers[container.name] = {
                    'cpu_percent': cpu_percent,
                    'memory_usage': memory_usage,
                    'memory_limit': memory_limit,
                    'memory_percent': memory_percent,
                    'status': container.status
                }
        
        return containers
    
    def test_application_response_time(self):
        """Test application response times"""
        endpoints = [
            'https://booking.icpac.net/',
            'https://booking.icpac.net/api/auth/',
            'https://booking.icpac.net/api/rooms/',
        ]
        
        response_times = {}
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = requests.get(endpoint, timeout=10, verify=False)
                end_time = time.time()
                
                response_times[endpoint] = {
                    'response_time': round((end_time - start_time) * 1000, 2),  # ms
                    'status_code': response.status_code,
                    'success': response.status_code < 400
                }
            except Exception as e:
                response_times[endpoint] = {
                    'response_time': None,
                    'status_code': None,
                    'success': False,
                    'error': str(e)
                }
        
        return response_times
    
    def collect_all_metrics(self):
        """Collect all performance metrics"""
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'system': self.collect_system_metrics(),
            'containers': self.collect_docker_metrics(),
            'response_times': self.test_application_response_time()
        }
    
    def save_metrics(self, filename='/var/log/performance_metrics.json'):
        """Save metrics to file"""
        metrics = self.collect_all_metrics()
        
        with open(filename, 'a') as f:
            f.write(json.dumps(metrics) + '\n')
        
        return metrics

if __name__ == "__main__":
    monitor = PerformanceMonitor()
    metrics = monitor.save_metrics()
    print(f"Metrics collected at {metrics['timestamp']}")
```

### 3. Log Aggregation and Analysis

#### Centralized Logging Configuration
```yaml
# File: logging-stack.yml
version: '3.8'

services:
  # ELK Stack for log aggregation (optional)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
    container_name: icpac-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - icpac-network
    ports:
      - "9200:9200"
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:7.17.0
    container_name: icpac-logstash
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logs:/var/log/app
    networks:
      - icpac-network
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:7.17.0
    container_name: icpac-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - icpac-network
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    restart: unless-stopped

volumes:
  elasticsearch_data:

networks:
  icpac-network:
    external: true
```

#### Log Analysis Script
```bash
#!/bin/bash
# File: analyze_logs.sh

LOG_DIR="/var/log/icpac"
REPORT_FILE="/var/log/icpac/daily_report_$(date +%Y%m%d).txt"

generate_daily_report() {
    echo "=== ICPAC Booking System Daily Report ===" > $REPORT_FILE
    echo "Generated: $(date)" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # Error summary
    echo "=== ERROR SUMMARY ===" >> $REPORT_FILE
    grep -h "ERROR" $LOG_DIR/*.log | tail -20 >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # Warning summary
    echo "=== WARNING SUMMARY ===" >> $REPORT_FILE
    grep -h "WARNING" $LOG_DIR/*.log | tail -20 >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # API usage statistics
    echo "=== API USAGE STATISTICS ===" >> $REPORT_FILE
    grep -h "api/" /var/log/nginx/access.log | \
        awk '{print $7}' | sort | uniq -c | sort -rn | head -10 >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # Top IP addresses
    echo "=== TOP CLIENT IPs ===" >> $REPORT_FILE
    awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10 >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # Response time analysis
    echo "=== SLOW REQUESTS ===" >> $REPORT_FILE
    awk '$NF > 1.0 {print $0}' /var/log/nginx/access.log | tail -10 >> $REPORT_FILE
    
    # Email report
    mail -s "ICPAC Booking System Daily Report" admin@icpac.net < $REPORT_FILE
}

generate_daily_report
```

## Backup Strategy

### 1. Automated Backup System

#### Comprehensive Backup Script
```bash
#!/bin/bash
# File: comprehensive_backup.sh

set -e

# Configuration
BACKUP_BASE_DIR="/backup/icpac-booking"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE"
RETENTION_DAYS=30
NOTIFICATION_EMAIL="admin@icpac.net"
PROJECT_DIR="/home/ubuntu/icpac-boardroom-frontend"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

send_notification() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    cd "$PROJECT_DIR"
    
    # Full database dump
    docker compose -f docker-compose.production.yml exec -T postgres pg_dump \
        -U icpac_user -d icpac_bookings \
        --verbose --clean --no-owner --no-privileges \
        | gzip > "$BACKUP_DIR/database_full.sql.gz"
    
    # Schema-only backup
    docker compose -f docker-compose.production.yml exec -T postgres pg_dump \
        -U icpac_user -d icpac_bookings \
        --schema-only --verbose --clean --no-owner --no-privileges \
        > "$BACKUP_DIR/database_schema.sql"
    
    # Custom format backup (for selective restoration)
    docker compose -f docker-compose.production.yml exec -T postgres pg_dump \
        -U icpac_user -d icpac_bookings \
        --format=custom --verbose --clean --no-owner --no-privileges \
        > "$BACKUP_DIR/database_custom.dump"
    
    log "Database backup completed"
}

# Application files backup
backup_application() {
    log "Starting application files backup..."
    
    cd "$PROJECT_DIR"
    
    # Configuration files
    tar -czf "$BACKUP_DIR/config.tar.gz" \
        .env \
        docker-compose.production.yml \
        nginx.production.conf \
        ssl/ 2>/dev/null || true
    
    # Media files
    if [[ -d "media" ]]; then
        tar -czf "$BACKUP_DIR/media.tar.gz" media/
    fi
    
    # Static files
    if [[ -d "staticfiles" ]]; then
        tar -czf "$BACKUP_DIR/staticfiles.tar.gz" staticfiles/
    fi
    
    # Logs (last 7 days)
    if [[ -d "logs" ]]; then
        find logs/ -name "*.log" -mtime -7 | \
            tar -czf "$BACKUP_DIR/logs.tar.gz" -T -
    fi
    
    log "Application files backup completed"
}

# Docker volumes backup
backup_docker_volumes() {
    log "Starting Docker volumes backup..."
    
    # Get volume names
    POSTGRES_VOLUME=$(docker volume ls -q | grep postgres_data)
    REDIS_VOLUME=$(docker volume ls -q | grep redis_data)
    
    if [[ -n "$POSTGRES_VOLUME" ]]; then
        docker run --rm -v "$POSTGRES_VOLUME":/data -v "$BACKUP_DIR":/backup \
            alpine tar -czf /backup/postgres_volume.tar.gz -C /data .
    fi
    
    if [[ -n "$REDIS_VOLUME" ]]; then
        docker run --rm -v "$REDIS_VOLUME":/data -v "$BACKUP_DIR":/backup \
            alpine tar -czf /backup/redis_volume.tar.gz -C /data .
    fi
    
    log "Docker volumes backup completed"
}

# System configuration backup
backup_system_config() {
    log "Starting system configuration backup..."
    
    # Nginx configuration
    if [[ -d "/etc/nginx" ]]; then
        sudo tar -czf "$BACKUP_DIR/nginx_config.tar.gz" /etc/nginx/ 2>/dev/null || true
    fi
    
    # SSL certificates
    if [[ -d "/etc/letsencrypt" ]]; then
        sudo tar -czf "$BACKUP_DIR/letsencrypt.tar.gz" /etc/letsencrypt/ 2>/dev/null || true
    fi
    
    # Crontab
    crontab -l > "$BACKUP_DIR/crontab.txt" 2>/dev/null || true
    
    # System info
    {
        echo "=== System Information ==="
        uname -a
        echo ""
        echo "=== Docker Images ==="
        docker images
        echo ""
        echo "=== Docker Containers ==="
        docker ps -a
        echo ""
        echo "=== Disk Usage ==="
        df -h
    } > "$BACKUP_DIR/system_info.txt"
    
    log "System configuration backup completed"
}

# Verify backups
verify_backups() {
    log "Verifying backups..."
    
    # Check database backup
    if [[ -f "$BACKUP_DIR/database_full.sql.gz" ]]; then
        if gunzip -t "$BACKUP_DIR/database_full.sql.gz"; then
            log "✓ Database backup verification passed"
        else
            log "✗ Database backup verification failed"
            return 1
        fi
    fi
    
    # Check file sizes
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    log "Backup size: $TOTAL_SIZE"
    
    # Create manifest
    {
        echo "=== Backup Manifest ==="
        echo "Backup Date: $(date)"
        echo "Backup Directory: $BACKUP_DIR"
        echo "Total Size: $TOTAL_SIZE"
        echo ""
        echo "=== Files ==="
        ls -lah "$BACKUP_DIR"
        echo ""
        echo "=== Checksums ==="
        find "$BACKUP_DIR" -type f -exec sha256sum {} \;
    } > "$BACKUP_DIR/manifest.txt"
    
    log "Backup verification completed"
}

# Cloud upload (optional)
upload_to_cloud() {
    if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$AWS_SECRET_ACCESS_KEY" ]]; then
        log "Uploading to AWS S3..."
        
        # Install AWS CLI if not present
        if ! command -v aws &> /dev/null; then
            curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
            unzip awscliv2.zip
            sudo ./aws/install
        fi
        
        # Upload backup
        tar -czf "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" -C "$BACKUP_BASE_DIR" "$DATE"
        aws s3 cp "$BACKUP_BASE_DIR/backup_$DATE.tar.gz" "s3://icpac-booking-backups/backups/"
        
        log "Cloud upload completed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \;
    find "$BACKUP_BASE_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    log "Cleanup completed"
}

# Main backup routine
main() {
    log "=== Starting comprehensive backup ==="
    
    START_TIME=$(date +%s)
    
    # Run backup procedures
    backup_database
    backup_application
    backup_docker_volumes
    backup_system_config
    verify_backups
    upload_to_cloud
    cleanup_old_backups
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log "=== Backup completed in ${DURATION}s ==="
    
    # Send success notification
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    send_notification "Backup Completed Successfully" \
        "Backup completed successfully on $(date)
        
        Backup Location: $BACKUP_DIR
        Total Size: $BACKUP_SIZE
        Duration: ${DURATION} seconds
        
        Please verify the backup integrity."
}

# Error handling
trap 'send_notification "Backup Failed" "Backup process failed on $(date). Check logs for details."; exit 1' ERR

# Run main backup
main "$@"
```

### 2. Disaster Recovery Procedures

#### Full System Recovery Script
```bash
#!/bin/bash
# File: disaster_recovery.sh

set -e

BACKUP_DATE="$1"
BACKUP_DIR="/backup/icpac-booking/$BACKUP_DATE"
PROJECT_DIR="/home/ubuntu/icpac-boardroom-frontend"

if [[ -z "$BACKUP_DATE" ]]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -la /backup/icpac-booking/
    exit 1
fi

if [[ ! -d "$BACKUP_DIR" ]]; then
    echo "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Stop all services
stop_services() {
    log "Stopping all services..."
    cd "$PROJECT_DIR"
    docker compose -f docker-compose.production.yml down
}

# Restore database
restore_database() {
    log "Restoring database..."
    
    # Start only PostgreSQL
    docker compose -f docker-compose.production.yml up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    sleep 30
    
    # Restore database
    gunzip -c "$BACKUP_DIR/database_full.sql.gz" | \
        docker compose -f docker-compose.production.yml exec -T postgres \
        psql -U icpac_user -d icpac_bookings
    
    log "Database restoration completed"
}

# Restore application files
restore_application() {
    log "Restoring application files..."
    
    # Restore configuration
    if [[ -f "$BACKUP_DIR/config.tar.gz" ]]; then
        tar -xzf "$BACKUP_DIR/config.tar.gz" -C "$PROJECT_DIR"
    fi
    
    # Restore media files
    if [[ -f "$BACKUP_DIR/media.tar.gz" ]]; then
        tar -xzf "$BACKUP_DIR/media.tar.gz" -C "$PROJECT_DIR"
    fi
    
    # Restore static files
    if [[ -f "$BACKUP_DIR/staticfiles.tar.gz" ]]; then
        tar -xzf "$BACKUP_DIR/staticfiles.tar.gz" -C "$PROJECT_DIR"
    fi
    
    log "Application files restoration completed"
}

# Restore system configuration
restore_system_config() {
    log "Restoring system configuration..."
    
    # Restore crontab
    if [[ -f "$BACKUP_DIR/crontab.txt" ]]; then
        crontab "$BACKUP_DIR/crontab.txt"
    fi
    
    # Restore SSL certificates
    if [[ -f "$BACKUP_DIR/letsencrypt.tar.gz" ]]; then
        sudo tar -xzf "$BACKUP_DIR/letsencrypt.tar.gz" -C /
    fi
    
    log "System configuration restoration completed"
}

# Start all services
start_services() {
    log "Starting all services..."
    
    cd "$PROJECT_DIR"
    docker compose -f docker-compose.production.yml up -d
    
    # Wait for services to be ready
    sleep 60
    
    # Run migrations (in case of schema changes)
    docker compose -f docker-compose.production.yml exec backend python manage.py migrate
    
    log "All services started"
}

# Verify restoration
verify_restoration() {
    log "Verifying restoration..."
    
    # Test application endpoints
    sleep 30
    
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/health/)
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://booking.icpac.net/api/auth/)
    
    if [[ "$HEALTH_STATUS" == "200" ]]; then
        log "✓ Health endpoint responding"
    else
        log "✗ Health endpoint not responding ($HEALTH_STATUS)"
    fi
    
    if [[ "$API_STATUS" == "405" || "$API_STATUS" == "200" ]]; then
        log "✓ API endpoint responding"
    else
        log "✗ API endpoint not responding ($API_STATUS)"
    fi
    
    log "Restoration verification completed"
}

# Main recovery procedure
main() {
    log "=== Starting disaster recovery from backup: $BACKUP_DATE ==="
    
    echo "WARNING: This will replace the current system with the backup!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [[ $confirm != "yes" ]]; then
        echo "Recovery cancelled"
        exit 0
    fi
    
    stop_services
    restore_database
    restore_application
    restore_system_config
    start_services
    verify_restoration
    
    log "=== Disaster recovery completed ==="
    
    echo ""
    echo "Recovery completed successfully!"
    echo "Please verify all functionality and update DNS/firewall settings if needed."
}

main "$@"
```

## Alerting and Notifications

### 1. Email Alerting System

#### Alert Manager Configuration
```bash
#!/bin/bash
# File: alert_manager.sh

SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="alerts@icpac.net"
SMTP_PASS="your-app-password"
ALERT_EMAIL="admin@icpac.net"

send_email_alert() {
    local subject="$1"
    local message="$2"
    local priority="$3"
    
    # Create email content
    cat > /tmp/alert_email.txt << EOF
Subject: [ICPAC-BOOKING-${priority^^}] $subject
From: $SMTP_USER
To: $ALERT_EMAIL
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html>
<body>
<h2>ICPAC Booking System Alert</h2>
<p><strong>Severity:</strong> $priority</p>
<p><strong>Time:</strong> $(date)</p>
<p><strong>Server:</strong> $(hostname)</p>

<h3>Alert Details:</h3>
<pre>$message</pre>

<hr>
<p><em>This is an automated alert from the ICPAC Booking System monitoring.</em></p>
</body>
</html>
EOF

    # Send email using sendmail or msmtp
    if command -v msmtp &> /dev/null; then
        msmtp --host=$SMTP_SERVER --port=$SMTP_PORT --auth=on \
              --user=$SMTP_USER --password=$SMTP_PASS \
              --tls=on $ALERT_EMAIL < /tmp/alert_email.txt
    else
        # Fallback to mail command
        mail -s "$subject" $ALERT_EMAIL < /tmp/alert_email.txt
    fi
    
    rm -f /tmp/alert_email.txt
}

# Example usage:
# send_email_alert "High CPU Usage" "CPU usage is 95%" "WARNING"
```

### 2. Slack Integration

```bash
#!/bin/bash
# File: slack_alerts.sh

SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

send_slack_alert() {
    local message="$1"
    local severity="$2"
    local color="#ff0000"  # Red for critical
    
    case $severity in
        "INFO")    color="#36a64f" ;;  # Green
        "WARNING") color="#ff9900" ;;  # Orange
        "ERROR")   color="#ff0000" ;;  # Red
        "CRITICAL") color="#990000" ;; # Dark Red
    esac
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"attachments\": [
                {
                    \"color\": \"$color\",
                    \"title\": \"ICPAC Booking System Alert\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {
                            \"title\": \"Severity\",
                            \"value\": \"$severity\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Server\",
                            \"value\": \"$(hostname)\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Time\",
                            \"value\": \"$(date)\",
                            \"short\": false
                        }
                    ]
                }
            ]
        }" $SLACK_WEBHOOK_URL
}
```

## Automated Scheduling

### 1. Cron Job Setup

```bash
#!/bin/bash
# File: setup_monitoring_crons.sh

# Add monitoring cron jobs
(crontab -l 2>/dev/null; cat << 'EOF'
# ICPAC Booking System Monitoring
*/5 * * * * /home/ubuntu/icpac-boardroom-frontend/system_monitor.sh
*/15 * * * * /home/ubuntu/icpac-boardroom-frontend/health_check_db.sh
0 */6 * * * python3 /home/ubuntu/icpac-boardroom-frontend/performance_monitor.py
0 1 * * * /home/ubuntu/icpac-boardroom-frontend/analyze_logs.sh

# Backup Schedule
0 2 * * * /home/ubuntu/icpac-boardroom-frontend/comprehensive_backup.sh
0 3 * * 0 /home/ubuntu/icpac-boardroom-frontend/db_maintenance.sh

# SSL Certificate Monitoring
0 12 * * * /home/ubuntu/icpac-boardroom-frontend/ssl-renew.sh
EOF
) | crontab -

echo "Monitoring cron jobs have been set up:"
crontab -l
```

### 2. Service Status Monitoring

```bash
#!/bin/bash
# File: service_monitor.sh

check_service_status() {
    local service_name="$1"
    local container_name="$2"
    
    if docker ps | grep -q "$container_name"; then
        echo "$service_name: ✓ Running"
        return 0
    else
        echo "$service_name: ✗ Not running"
        
        # Try to restart the service
        cd /home/ubuntu/icpac-boardroom-frontend
        docker compose -f docker-compose.production.yml restart "$container_name"
        
        # Send alert
        send_email_alert "Service Restart" "$service_name was restarted automatically" "WARNING"
        return 1
    fi
}

# Check all services
services=(
    "Frontend:icpac-booking-frontend"
    "Backend:icpac-booking-backend"
    "Database:icpac-booking-db"
    "Redis:icpac-booking-redis"
    "Celery:icpac-booking-celery"
)

for service in "${services[@]}"; do
    IFS=':' read -r name container <<< "$service"
    check_service_status "$name" "$container"
done
```

## Documentation and Runbooks

### 1. Incident Response Runbook

```markdown
# Incident Response Runbook

## Service Down

1. **Check service status**:
   ```bash
   docker compose -f docker-compose.production.yml ps
   ```

2. **Check logs**:
   ```bash
   docker compose -f docker-compose.production.yml logs -f service-name
   ```

3. **Restart services**:
   ```bash
   docker compose -f docker-compose.production.yml restart service-name
   ```

4. **Check external dependencies**:
   - Database connectivity
   - DNS resolution
   - SSL certificates

## High Resource Usage

1. **Identify resource hogs**:
   ```bash
   docker stats
   htop
   ```

2. **Scale services**:
   ```bash
   docker compose -f docker-compose.production.yml up -d --scale backend=2
   ```

3. **Clear logs**:
   ```bash
   docker system prune -f
   ```

## Database Issues

1. **Check connectivity**:
   ```bash
   docker compose -f docker-compose.production.yml exec postgres pg_isready
   ```

2. **Check slow queries**:
   ```sql
   SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;
   ```

3. **Restart database** (last resort):
   ```bash
   docker compose -f docker-compose.production.yml restart postgres
   ```
```

---

**Last Updated**: August 10, 2025  
**Version**: 1.0.0  
**Monitoring Stack**: Custom Scripts + Optional ELK Stack