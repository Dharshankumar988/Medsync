#!/bin/bash
# Backup PostgreSQL database
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "Starting Database Backup..."
docker exec -t medsync-db-1 pg_dump -U medsync_user -d medsync_db -F c -b -v -f /tmp/db_backup.dump
docker cp medsync-db-1:/tmp/db_backup.dump $BACKUP_DIR/db_backup_$TIMESTAMP.dump
echo "Backup saved to $BACKUP_DIR/db_backup_$TIMESTAMP.dump"
