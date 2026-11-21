#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKUP_DIR="${SCRIPT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "💾 Backing up Postal staging environment to $BACKUP_DIR..."

export $(grep -v '^#' .env | xargs)

# 1. Dump MariaDB databases
docker compose exec -T mariadb mariadb-dump -u root -p"${MARIADB_ROOT_PASSWORD}" --all-databases > "$BACKUP_DIR/postal_all_databases.sql"

# 2. Copy config files
cp config/postal.yml "$BACKUP_DIR/"
if [ -f config/signing.key ]; then
  cp config/signing.key "$BACKUP_DIR/"
fi
cp .env "$BACKUP_DIR/"

echo "✅ Backup completed successfully in $BACKUP_DIR."
