# Database Setup and Migration Guide

## Overview

This guide covers database setup, migrations, and data management for the ICPAC Booking System in production environments.

## Database Architecture

### PostgreSQL Configuration
- **Version**: PostgreSQL 15+
- **Encoding**: UTF-8
- **Time Zone**: UTC (configurable to Africa/Nairobi)
- **Connection Pooling**: Enabled via Django settings

### Database Schema Overview

```sql
-- Main application tables
auth_user              -- User accounts and roles
rooms                 -- Meeting rooms and facilities  
bookings              -- Room reservations
booking_notes         -- Comments and communication
procurement_orders    -- Procurement integration
room_amenities        -- Standard amenity definitions

-- Django system tables
django_migrations     -- Migration tracking
django_session       -- Session storage
django_admin_log     -- Admin action logging
```

## Initial Database Setup

### 1. Production Database Creation

#### Option A: Using Docker (Recommended)
```bash
# Database is created automatically via docker-compose
docker compose -f docker-compose.production.yml up -d postgres

# Verify database is running
docker compose -f docker-compose.production.yml exec postgres pg_isready -U icpac_user -d icpac_bookings
```

#### Option B: External PostgreSQL
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE icpac_bookings;
CREATE USER icpac_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE icpac_bookings TO icpac_user;
ALTER USER icpac_user CREATEDB;

-- Connect to the new database
\c icpac_bookings

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Environment Configuration

```bash
# Update .env file with database settings
DATABASE_URL=postgresql://icpac_user:password@host:5432/icpac_bookings

# For Docker setup
DATABASE_URL=postgresql://icpac_user:password@postgres:5432/icpac_bookings
```

## Migration Process

### 1. Initial Migrations

```bash
# Run initial database migrations
docker compose -f docker-compose.production.yml exec backend python manage.py migrate

# Check migration status
docker compose -f docker-compose.production.yml exec backend python manage.py showmigrations
```

### 2. Create Superuser Account

```bash
# Interactive superuser creation
docker compose -f docker-compose.production.yml exec backend python manage.py createsuperuser

# Non-interactive creation
docker compose -f docker-compose.production.yml exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin@icpac.net', 'admin@icpac.net', 'secure-admin-password')
    print('Superuser created')
else:
    print('Superuser already exists')
"
```

### 3. Load Initial Data

```bash
# Create sample rooms
docker compose -f docker-compose.production.yml exec backend python manage.py shell -c "
from apps.rooms.models import Room, RoomAmenity

# Create standard amenities
amenities = [
    {'name': 'Projector', 'icon': '📽️', 'description': 'Digital projector for presentations'},
    {'name': 'Whiteboard', 'icon': '📝', 'description': 'Whiteboard with markers'},
    {'name': 'Video Conferencing', 'icon': '📹', 'description': 'Video conference setup'},
    {'name': 'Audio System', 'icon': '🎤', 'description': 'Sound system with microphones'},
    {'name': 'Air Conditioning', 'icon': '❄️', 'description': 'Climate control'},
    {'name': 'Internet Access', 'icon': '🌐', 'description': 'WiFi internet access'},
]

for amenity_data in amenities:
    RoomAmenity.objects.get_or_create(name=amenity_data['name'], defaults=amenity_data)

print('Amenities created')

# Create sample rooms
rooms_data = [
    {
        'name': 'Main Boardroom',
        'capacity': 20,
        'category': 'boardroom',
        'location': 'Ground Floor, Main Building',
        'description': 'Executive boardroom with advanced AV equipment',
        'amenities': ['Projector', 'Video Conferencing', 'Audio System', 'Air Conditioning']
    },
    {
        'name': 'Conference Room A',
        'capacity': 12,
        'category': 'conference_room',
        'location': 'First Floor, East Wing',
        'description': 'Medium-sized conference room for team meetings',
        'amenities': ['Projector', 'Whiteboard', 'Air Conditioning', 'Internet Access']
    },
    {
        'name': 'Training Lab 1',
        'capacity': 30,
        'category': 'training_room',
        'location': 'Second Floor, Training Center',
        'description': 'Computer training laboratory with workstations',
        'amenities': ['Projector', 'Whiteboard', 'Internet Access', 'Air Conditioning']
    }
]

for room_data in rooms_data:
    room, created = Room.objects.get_or_create(
        name=room_data['name'],
        defaults=room_data
    )
    if created:
        print(f'Created room: {room.name}')

print('Sample rooms created')
"
```

## Data Migration from Existing Systems

### 1. Export Data from Legacy System

```bash
# If migrating from existing system, export data to JSON/CSV
# Example export script for common formats

cat > export_legacy_data.py << 'EOF'
import json
import csv
from datetime import datetime

def export_users_from_csv(csv_file):
    \"\"\"Export users from CSV file\"\"\"
    users = []
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            user = {
                'email': row['email'],
                'first_name': row['first_name'],
                'last_name': row['last_name'],
                'department': row.get('department', ''),
                'role': row.get('role', 'user')
            }
            users.append(user)
    
    with open('users_export.json', 'w') as f:
        json.dump(users, f, indent=2)
    
    return users

def export_rooms_from_csv(csv_file):
    \"\"\"Export rooms from CSV file\"\"\"
    rooms = []
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            room = {
                'name': row['name'],
                'capacity': int(row['capacity']),
                'category': row['category'],
                'location': row.get('location', ''),
                'description': row.get('description', ''),
                'amenities': row.get('amenities', '').split(',') if row.get('amenities') else []
            }
            rooms.append(room)
    
    with open('rooms_export.json', 'w') as f:
        json.dump(rooms, f, indent=2)
    
    return rooms

# Usage:
# users = export_users_from_csv('legacy_users.csv')
# rooms = export_rooms_from_csv('legacy_rooms.csv')
EOF
```

### 2. Import Data to New System

```bash
# Create data import script
cat > import_data.py << 'EOF'
import json
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'icpac_booking.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.rooms.models import Room, RoomAmenity

User = get_user_model()

def import_users(json_file):
    \"\"\"Import users from JSON file\"\"\"
    with open(json_file, 'r') as f:
        users_data = json.load(f)
    
    for user_data in users_data:
        user, created = User.objects.get_or_create(
            email=user_data['email'],
            defaults={
                'username': user_data['email'],
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'department': user_data.get('department', ''),
                'role': user_data.get('role', 'user'),
                'is_active': True
            }
        )
        if created:
            # Set temporary password - users should reset
            user.set_password('TempPassword123!')
            user.save()
            print(f'Created user: {user.email}')

def import_rooms(json_file):
    \"\"\"Import rooms from JSON file\"\"\"
    with open(json_file, 'r') as f:
        rooms_data = json.load(f)
    
    for room_data in rooms_data:
        room, created = Room.objects.get_or_create(
            name=room_data['name'],
            defaults=room_data
        )
        if created:
            print(f'Created room: {room.name}')

# Run imports
# import_users('users_export.json')
# import_rooms('rooms_export.json')
EOF

# Execute import
docker compose -f docker-compose.production.yml exec backend python import_data.py
```

## Database Maintenance

### 1. Regular Maintenance Tasks

```bash
# Create maintenance script
cat > db_maintenance.sh << 'EOF'
#!/bin/bash

echo "Starting database maintenance at $(date)"

# Update statistics
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "ANALYZE;"

# Vacuum database
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "VACUUM;"

# Check for unused indexes
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
ORDER BY n_distinct DESC;
"

echo "Database maintenance completed at $(date)"
EOF

chmod +x db_maintenance.sh

# Schedule weekly maintenance
(crontab -l 2>/dev/null; echo "0 1 * * 0 /path/to/db_maintenance.sh >> /var/log/db_maintenance.log 2>&1") | crontab -
```

### 2. Performance Optimization

```sql
-- Create performance monitoring queries

-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

### 3. Backup and Recovery

```bash
# Database backup script
cat > backup_database.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

echo "Starting database backup at $(date)"

# Full database backup
docker compose -f docker-compose.production.yml exec -T postgres pg_dump \
    -U icpac_user -d icpac_bookings \
    --verbose --clean --no-owner --no-privileges \
    | gzip > $BACKUP_DIR/icpac_booking_$DATE.sql.gz

# Schema-only backup
docker compose -f docker-compose.production.yml exec -T postgres pg_dump \
    -U icpac_user -d icpac_bookings \
    --schema-only --verbose --clean --no-owner --no-privileges \
    > $BACKUP_DIR/schema_$DATE.sql

# Data-only backup
docker compose -f docker-compose.production.yml exec -T postgres pg_dump \
    -U icpac_user -d icpac_bookings \
    --data-only --verbose --no-owner --no-privileges \
    | gzip > $BACKUP_DIR/data_$DATE.sql.gz

# Remove old backups
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete

echo "Database backup completed at $(date)"
echo "Backup saved to: $BACKUP_DIR/icpac_booking_$DATE.sql.gz"
EOF

chmod +x backup_database.sh

# Test backup
./backup_database.sh
```

### 4. Database Recovery

```bash
# Database recovery script
cat > restore_database.sh << 'EOF'
#!/bin/bash

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE=$1

if [[ ! -f $BACKUP_FILE ]]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Starting database restore from $BACKUP_FILE"

# Stop backend services
docker compose -f docker-compose.production.yml stop backend celery celery-beat

# Restore database
gunzip -c $BACKUP_FILE | docker compose -f docker-compose.production.yml exec -T postgres \
    psql -U icpac_user -d icpac_bookings

# Start services
docker compose -f docker-compose.production.yml start backend celery celery-beat

echo "Database restore completed"
EOF

chmod +x restore_database.sh

# Usage example:
# ./restore_database.sh /backup/database/icpac_booking_20250810_120000.sql.gz
```

## Database Monitoring

### 1. Connection Monitoring

```bash
# Monitor database connections
cat > monitor_db.sh << 'EOF'
#!/bin/bash

echo "=== Database Monitoring $(date) ==="

# Check connection count
echo "Active connections:"
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
"

# Check database size
echo "Database size:"
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
SELECT pg_size_pretty(pg_database_size('icpac_bookings')) as database_size;
"

# Check table sizes
echo "Largest tables:"
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 5;
"

# Check locks
echo "Active locks:"
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
SELECT mode, count(*) 
FROM pg_locks 
GROUP BY mode;
"
EOF

chmod +x monitor_db.sh
```

### 2. Health Checks

```bash
# Database health check
cat > health_check_db.sh << 'EOF'
#!/bin/bash

# Test database connectivity
if docker compose -f docker-compose.production.yml exec -T postgres pg_isready -U icpac_user -d icpac_bookings; then
    echo "✓ Database is accessible"
else
    echo "✗ Database is not accessible"
    exit 1
fi

# Test simple query
if docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "SELECT 1;" > /dev/null; then
    echo "✓ Database queries working"
else
    echo "✗ Database queries failing"
    exit 1
fi

# Check Django database connection
if docker compose -f docker-compose.production.yml exec -T backend python manage.py check --database default; then
    echo "✓ Django database connection working"
else
    echo "✗ Django database connection issues"
    exit 1
fi

echo "Database health check passed"
EOF

chmod +x health_check_db.sh

# Schedule health checks
(crontab -l 2>/dev/null; echo "*/15 * * * * /path/to/health_check_db.sh >> /var/log/db_health.log 2>&1") | crontab -
```

## Troubleshooting

### Common Issues

#### 1. Migration Failures
```bash
# Check migration status
docker compose -f docker-compose.production.yml exec backend python manage.py showmigrations

# Fake a migration if needed (use cautiously)
docker compose -f docker-compose.production.yml exec backend python manage.py migrate --fake app_name migration_name

# Roll back migration
docker compose -f docker-compose.production.yml exec backend python manage.py migrate app_name previous_migration_name
```

#### 2. Connection Issues
```bash
# Check PostgreSQL logs
docker compose -f docker-compose.production.yml logs postgres

# Test connection manually
docker compose -f docker-compose.production.yml exec postgres psql -U icpac_user -d icpac_bookings

# Check connection limits
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "SHOW max_connections;"
```

#### 3. Performance Issues
```bash
# Enable slow query logging
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
"

# Check for long-running queries
docker compose -f docker-compose.production.yml exec -T postgres psql -U icpac_user -d icpac_bookings -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

## Security Considerations

### 1. Database Access Control
```sql
-- Revoke public schema privileges
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO icpac_user;

-- Create read-only user for reporting
CREATE USER reporting_user WITH PASSWORD 'secure-reporting-password';
GRANT CONNECT ON DATABASE icpac_bookings TO reporting_user;
GRANT USAGE ON SCHEMA public TO reporting_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting_user;
```

### 2. SSL Configuration
```bash
# Enable SSL in PostgreSQL (if using external database)
# Add to postgresql.conf:
# ssl = on
# ssl_cert_file = '/path/to/server.crt'
# ssl_key_file = '/path/to/server.key'

# Update connection string to require SSL
DATABASE_URL=postgresql://icpac_user:password@host:5432/icpac_bookings?sslmode=require
```

---

**Last Updated**: August 10, 2025  
**Version**: 1.0.0  
**Database**: PostgreSQL 15+