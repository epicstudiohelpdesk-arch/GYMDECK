#!/usr/bin/env bash
# Restore an encrypted OpenWA volume backup into an isolated directory.
set -euo pipefail
ARCHIVE="${1:?usage: restore-openwa.sh <archive> <target-dir>}"
TARGET="${2:?usage: restore-openwa.sh <archive> <target-dir>}"
KEY="${BACKUP_ENCRYPTION_KEY:?FATAL: BACKUP_ENCRYPTION_KEY must be set}"
[ -f "$ARCHIVE" ] || { echo "FATAL: archive not found"; exit 1; }
[ ! -e "$TARGET" ] || { echo "FATAL: restore target already exists"; exit 1; }
mkdir -p "$TARGET"
openssl enc -d -aes-256-cbc -pbkdf2 -in "$ARCHIVE" -pass pass:"$KEY" | tar -xzf - -C "$TARGET"
COUNT="$(find "$TARGET" -type f | wc -l | tr -d ' ')"
[ "$COUNT" -gt 0 ] || { echo "FATAL: empty archive"; exit 1; }
echo "OpenWA restore complete: $TARGET ($COUNT files)"
