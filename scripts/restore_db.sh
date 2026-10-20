#!/usr/bin/env bash
# ==============================================================================
# EduBD Platform - PostgreSQL Database Restore Script
# Safely decompresses and restores a timestamped .sql.gz dump into PostgreSQL.
# ==============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"
FORCE="${2:-}"
DATABASE_URL="${DATABASE_URL:-postgresql://mizanurrahman@localhost:5432/edubd_db}"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz> [--force]" >&2
    echo "Example: $0 backups/edubd_backup_20261020_143852.sql.gz --force" >&2
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' not found!" >&2
    exit 1
fi

# Verify gzip integrity
echo " Verifying integrity of '${BACKUP_FILE}'..."
if ! gzip -t "${BACKUP_FILE}"; then
    echo "Error: Backup file is corrupted or not a valid gzip file!" >&2
    exit 1
fi

echo "=========================================================="
echo " EduBD Database Restoration"
echo " Target Database URL: ${DATABASE_URL}"
echo " Source Backup File: ${BACKUP_FILE}"
echo " File Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
echo "=========================================================="

if [ "${FORCE}" != "--force" ] && [ "${FORCE}" != "-y" ]; then
    read -p "⚠ WARNING: This will overwrite existing data in the target database! Continue? (y/N): " -r CONFIRM
    if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
        echo " Restoration aborted by user."
        exit 0
    fi
fi

START_TIME=$(date +%s)
echo " Starting restoration at $(date)..."

# Pipe decompressed SQL into psql
if gunzip -c "${BACKUP_FILE}" | psql -q "${DATABASE_URL}" > /dev/null 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo " Restoration completed successfully in ${DURATION}s."
else
    echo " Restoration failed! Check PostgreSQL logs and permissions." >&2
    exit 1
fi

# Verify tables
echo " Verifying restored tables..."
TABLE_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
echo " Restored public tables count: ${TABLE_COUNT}"

USER_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")
QUESTION_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"Question\";" 2>/dev/null || echo "0")
echo " Verified Records: Users = ${USER_COUNT// /}, Questions = ${QUESTION_COUNT// /}"

echo "=========================================================="
echo " Restore process finished at $(date)"
echo "=========================================================="
