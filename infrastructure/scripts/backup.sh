#!/bin/bash
# Backup PostgreSQL database
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "Starting Database Backup..."
docker exec -t medsync_db pg_dump -U ${POSTGRES_USER:-medsync} -d ${POSTGRES_DB:-medsync} -F c -b -v -f /tmp/db_backup.dump
docker cp medsync_db:/tmp/db_backup.dump $BACKUP_DIR/db_backup_$TIMESTAMP.dump
echo "Backup saved to $BACKUP_DIR/db_backup_$TIMESTAMP.dump"
