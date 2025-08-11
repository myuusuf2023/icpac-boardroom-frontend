#!/bin/bash

# ICPAC Booking System - Database Restore Script
# This script restores the PostgreSQL database from a backup

set -e

# Configuration
BACKUP_DIR="/backups"

# Database configuration from environment
DB_NAME=${POSTGRES_DB:-icpac_bookings}
DB_USER=${POSTGRES_USER:-icpac_user}
DB_HOST="postgres"
DB_PORT="5432"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    log "Usage: $0 <backup_file>"
    log "Available backups:"
    ls -la "$BACKUP_DIR"/icpac_booking_backup_*.sql.gz 2>/dev/null || log "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

# Confirm restore operation
log "WARNING: This will completely replace the current database!"
log "Database: $DB_NAME"
log "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled"
    exit 1
fi

# Create temporary file for decompressed backup
TEMP_BACKUP="/tmp/restore_backup.sql"

# Decompress backup if it's gzipped
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Decompressing backup..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_BACKUP"
else
    cp "$BACKUP_FILE" "$TEMP_BACKUP"
fi

# Stop all connections to the database
log "Terminating active connections..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database
log "Recreating database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $DB_NAME;"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "CREATE DATABASE $DB_NAME;"

# Restore database
log "Restoring database from backup..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --clean \
    --no-owner \
    --no-privileges \
    "$TEMP_BACKUP"

# Clean up temporary file
rm -f "$TEMP_BACKUP"

# Verify restore
log "Verifying restore..."
TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

log "Database restored successfully. Tables found: $TABLE_COUNT"
log "Restore process completed"