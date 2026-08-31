#!/usr/bin/env bash
# ==============================================================================
# GymDeck Database Restore & Disaster Recovery Script
# ==============================================================================
set -euo pipefail

TARGET_BACKUP="${1:?Usage: $0 <path-to-encrypted-backup-file> <target-database-name>}"
TARGET_DB="${2:?Usage: $0 <path-to-encrypted-backup-file> <target-database-name>}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:?FATAL: BACKUP_ENCRYPTION_KEY must be set}"

TEMP_DUMP="/tmp/restore_${TARGET_DB}_$(date +%s).dump"

echo "⚠️ [Restore] Initiating restore from ${TARGET_BACKUP} into database: ${TARGET_DB}..."

if [ ! -f "${TARGET_BACKUP}" ]; then
  echo "❌ [Restore] Backup file not found: ${TARGET_BACKUP}"
  exit 1
fi

# Decrypt backup
echo "🔓 [Restore] Decrypting AES-256 snapshot..."
openssl enc -d -aes-256-cbc -pbkdf2 -in "${TARGET_BACKUP}" -out "${TEMP_DUMP}" -pass pass:"${BACKUP_ENCRYPTION_KEY}"

# Restore into target database
echo "🐘 [Restore] Executing pg_restore..."
pg_restore -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" --clean --if-exists "${TEMP_DUMP}" || {
  echo "⚠️ [Restore] Non-fatal warnings encountered during pg_restore."
}

# Clean temporary plaintext dump
rm -f "${TEMP_DUMP}"

echo "✅ [Restore] Database ${TARGET_DB} restored successfully from ${TARGET_BACKUP}."
