#!/usr/bin/env bash
# Encrypted backup of the OpenWA volume (SQLite + session auth dirs + media).
# Must run in the same maintenance window as backup-db.sh. Prints no secrets.
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gymdeck}"
CONTAINER="${OPENWA_CONTAINER:-gymdeck-openwa-prod}"
KEY="${BACKUP_ENCRYPTION_KEY:?FATAL: BACKUP_ENCRYPTION_KEY must be set}"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/openwa_${TS}.tar.gz.enc"
mkdir -p "$BACKUP_DIR"

# OPENWA_DATA_DIR is a disposable-drill override. Production leaves it unset
# and always snapshots the named volume through the container.
if [ -n "${OPENWA_DATA_DIR:-}" ]; then
  tar -C "$OPENWA_DATA_DIR" -czf - . | \
    openssl enc -aes-256-cbc -salt -pbkdf2 -out "$OUT" -pass pass:"$KEY"
else
  docker run --rm \
    -v "$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' "$CONTAINER")":/data:ro \
    alpine:3.20 tar -C /data -czf - . | \
    openssl enc -aes-256-cbc -salt -pbkdf2 -out "$OUT" -pass pass:"$KEY"
fi

find "$BACKUP_DIR" -name 'openwa_*.tar.gz.enc' -type f -mtime +"${RETENTION_DAYS:-30}" -delete
echo "OpenWA backup complete: $OUT"
