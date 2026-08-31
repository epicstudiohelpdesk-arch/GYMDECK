#!/usr/bin/env bash
# ==============================================================================
# GymDeck Database Automated Encrypted Backup Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/gymdeck}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-gymdeck_prod_user}"
DB_NAME="${DB_NAME:-gymdeck_cloud_prod}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:?FATAL: BACKUP_ENCRYPTION_KEY must be set}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump.enc"

mkdir -p "${BACKUP_DIR}"

echo "📦 [Backup] Starting encrypted backup for ${DB_NAME} at ${TIMESTAMP}..."

# Execute logical dump with compression and AES-256-CBC encryption
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Fc | \
  openssl enc -aes-256-cbc -salt -pbkdf2 -out "${BACKUP_FILE}" -pass pass:"${BACKUP_ENCRYPTION_KEY}"

echo "✅ [Backup] Encrypted backup created successfully: ${BACKUP_FILE}"
echo "📊 [Backup] File size: $(ls -lh "${BACKUP_FILE}" | awk '{print $5}')"

# Purge snapshots older than retention threshold
echo "🧹 [Backup] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.dump.enc" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "🎉 [Backup] Completed successfully."
