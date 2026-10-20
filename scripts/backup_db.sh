#!/usr/bin/env bash
# ==============================================================================
# EduBD Platform - PostgreSQL Automated Backup Script
# Creates timestamped, gzip-compressed SQL dumps of the PostgreSQL database.
# ==============================================================================

set -euo pipefail

# Configuration with defaults
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATE_STR="$(date +'%Y%m%d_%H%M%S')"
DATABASE_URL="${DATABASE_URL:-postgresql://mizanurrahman@localhost:5432/edubd_db}"

# Create backup directory if it does not exist
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/edubd_backup_${DATE_STR}.sql.gz"

echo "=========================================================="
echo " Starting EduBD Database Backup"
echo " Timestamp: $(date)"
echo " Target file: ${BACKUP_FILE}"
echo "=========================================================="

START_TIME=$(date +%s)

# Execute pg_dump and pipe through gzip
if pg_dump --clean --if-exists --no-owner --no-privileges "${DATABASE_URL}" | gzip -9 > "${BACKUP_FILE}"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

    echo " Backup completed successfully in ${DURATION}s."
    echo " Backup file size: ${FILE_SIZE}"
    echo " File location: $(cd "${BACKUP_DIR}" && pwd)/$(basename "${BACKUP_FILE}")"
else
    echo " Backup failed! Check PostgreSQL connection and permissions." >&2
    exit 1
fi

# Rotate / Prune older backups
echo " Rotating backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "edubd_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -type f -exec rm -f {} + -print | wc -l | tr -d ' ')
echo " Pruned ${DELETED_COUNT} old backup file(s)."

echo " Current available backups in ${BACKUP_DIR}:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null || echo " No previous backups."

echo "=========================================================="
echo " Backup process finished at $(date)"
echo "=========================================================="
