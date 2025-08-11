#!/bin/bash

# ICPAC Booking System - Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/icpac_booking_backup_${TIMESTAMP}.sql"
KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}

# Database configuration from environment
DB_NAME=${POSTGRES_DB:-icpac_bookings}
DB_USER=${POSTGRES_USER:-icpac_user}
DB_HOST="postgres"
DB_PORT="5432"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create database backup
log "Starting database backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    --format=custom \
    --file="$BACKUP_FILE"

# Compress the backup
log "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup created successfully: $BACKUP_FILE (Size: $BACKUP_SIZE)"
else
    log "ERROR: Backup failed - file not created"
    exit 1
fi

# Clean up old backups
log "Cleaning up backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "icpac_booking_backup_*.sql.gz" -type f -mtime +$KEEP_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "icpac_booking_backup_*.sql.gz" -type f | wc -l)
log "Backup completed. Total backups: $BACKUP_COUNT"

# Optional: Upload to cloud storage
if [ -n "$AWS_S3_BUCKET" ] && command -v aws >/dev/null 2>&1; then
    log "Uploading backup to S3..."
    aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/"
    log "Backup uploaded to S3 successfully"
fi

log "Backup process completed successfully"