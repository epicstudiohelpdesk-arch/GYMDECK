#!/usr/bin/env bash
# Disposable local dry-run for paired backup scripts. No production data.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGDATA_TMP="$(mktemp -d)"
BACKUP_TMP="$(mktemp -d)"
OPENWA_SRC="$(mktemp -d)"
OPENWA_RESTORE="$(mktemp -d)"
PORT=$((24000 + RANDOM % 10000))
export DATABASE_URL="postgresql://gymdeck_test@127.0.0.1:${PORT}/gymdeck_test"

USE_EXTERNAL_PG=0
DRILL_DB=""
RESTORE_DB=""

# Discover initdb if not in standard PATH (e.g., standard Debian/Ubuntu locations)
if ! command -v initdb >/dev/null 2>&1; then
  for p in /usr/lib/postgresql/*/bin; do
    if [ -x "$p/initdb" ]; then
      export PATH="$p:$PATH"
      break
    fi
  done
fi

cleanup() {
  if [ "$USE_EXTERNAL_PG" = "1" ]; then
    PGPASSWORD="${PGPASSWORD:-gymdeck_password}" psql -h "${PGHOST:-127.0.0.1}" -p "${PGPORT:-5432}" -U "${PGUSER:-gymdeck_user}" -d "${PGDATABASE:-gymdeck_cloud}" -q -c \
      "DROP DATABASE IF EXISTS ${DRILL_DB}; DROP DATABASE IF EXISTS ${RESTORE_DB};" >/dev/null 2>&1 || true
  else
    pg_ctl -D "$PGDATA_TMP" stop -m immediate >/dev/null 2>&1 || true
  fi
  rm -rf "$PGDATA_TMP" "$BACKUP_TMP" "$OPENWA_SRC" "$OPENWA_RESTORE"
}
trap cleanup EXIT

bash -n "$ROOT/infrastructure/scripts/backup-db.sh"
bash -n "$ROOT/infrastructure/scripts/backup-openwa.sh"
grep -q 'backup-db.sh' "$ROOT/infrastructure/systemd/gymdeck-backup.service"
grep -q 'backup-openwa.sh' "$ROOT/infrastructure/systemd/gymdeck-backup.service"
echo 'PASS script syntax and paired timer wiring'

if command -v initdb >/dev/null 2>&1; then
  initdb -D "$PGDATA_TMP" -U gymdeck_test --auth=trust --no-instructions >/dev/null
  pg_ctl -D "$PGDATA_TMP" -o "-p ${PORT} -k ${PGDATA_TMP} -c listen_addresses=127.0.0.1" -l "$PGDATA_TMP/server.log" start >/dev/null
  createdb -h 127.0.0.1 -p "$PORT" -U gymdeck_test gymdeck_test
  createdb -h 127.0.0.1 -p "$PORT" -U gymdeck_test gymdeck_restore_test
  psql -h 127.0.0.1 -p "$PORT" -U gymdeck_test -d gymdeck_test -q -c \
    'CREATE TABLE drill (id int); INSERT INTO drill VALUES (1),(2),(3);'

  BACKUP_DIR="$BACKUP_TMP" DB_HOST=127.0.0.1 DB_PORT="$PORT" DB_USER=gymdeck_test \
    DB_NAME=gymdeck_test BACKUP_ENCRYPTION_KEY=drill_key \
    bash "$ROOT/infrastructure/scripts/backup-db.sh" >/dev/null
  BACKUP_FILE="$(ls "$BACKUP_TMP"/*.dump.enc | head -1)"
  DB_HOST=127.0.0.1 DB_PORT="$PORT" DB_USER=gymdeck_test BACKUP_ENCRYPTION_KEY=drill_key \
    bash "$ROOT/infrastructure/scripts/restore-db.sh" "$BACKUP_FILE" gymdeck_restore_test >/dev/null
  COUNT="$(psql -h 127.0.0.1 -p "$PORT" -U gymdeck_test -d gymdeck_restore_test -tA -c 'SELECT COUNT(*) FROM drill')"
  [ "$COUNT" = "3" ] || { echo "FAIL: restored row count $COUNT"; exit 1; }
  echo 'PASS encrypted DB backup and restore drill (3/3 rows)'
else
  # Fall back to running PostgreSQL service (e.g., CI container or host server)
  USE_EXTERNAL_PG=1
  DRILL_DB="gymdeck_drill_${PORT}"
  RESTORE_DB="gymdeck_restore_${PORT}"
  PG_HOST="${PGHOST:-127.0.0.1}"
  PG_PORT="${PGPORT:-5432}"
  PG_USER="${PGUSER:-gymdeck_user}"
  export PGPASSWORD="${PGPASSWORD:-gymdeck_password}"
  ADMIN_DB="${PGDATABASE:-gymdeck_cloud}"

  psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$ADMIN_DB" -q -c \
    "CREATE DATABASE ${DRILL_DB}; CREATE DATABASE ${RESTORE_DB};"
  psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$DRILL_DB" -q -c \
    'CREATE TABLE drill (id int); INSERT INTO drill VALUES (1),(2),(3);'

  BACKUP_DIR="$BACKUP_TMP" DB_HOST="$PG_HOST" DB_PORT="$PG_PORT" DB_USER="$PG_USER" \
    DB_NAME="$DRILL_DB" BACKUP_ENCRYPTION_KEY=drill_key \
    bash "$ROOT/infrastructure/scripts/backup-db.sh" >/dev/null
  BACKUP_FILE="$(ls "$BACKUP_TMP"/*.dump.enc | head -1)"
  DB_HOST="$PG_HOST" DB_PORT="$PG_PORT" DB_USER="$PG_USER" BACKUP_ENCRYPTION_KEY=drill_key \
    bash "$ROOT/infrastructure/scripts/restore-db.sh" "$BACKUP_FILE" "$RESTORE_DB" >/dev/null
  COUNT="$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$RESTORE_DB" -tA -c 'SELECT COUNT(*) FROM drill')"
  [ "$COUNT" = "3" ] || { echo "FAIL: restored row count $COUNT"; exit 1; }
  echo 'PASS encrypted DB backup and restore drill against running service (3/3 rows)'
fi

mkdir -p "$OPENWA_SRC/sessions/session-drill/Default"
printf 'disposable sqlite payload\n' > "$OPENWA_SRC/openwa.sqlite"
printf 'disposable main sqlite payload\n' > "$OPENWA_SRC/main.sqlite"
printf '{"id":"session-drill","status":"ready"}\n' > "$OPENWA_SRC/sessions/session-drill/Default/session.json"
printf 'disposable auth material\n' > "$OPENWA_SRC/sessions/session-drill/Default/Cookies"
START="$(date +%s)"
OPENWA_DATA_DIR="$OPENWA_SRC" BACKUP_DIR="$BACKUP_TMP" BACKUP_ENCRYPTION_KEY=drill_key \
  bash "$ROOT/infrastructure/scripts/backup-openwa.sh" >/dev/null
OPENWA_ARCHIVE="$(ls "$BACKUP_TMP"/openwa_*.tar.gz.enc | head -1)"
rm -rf "$OPENWA_RESTORE"
BACKUP_ENCRYPTION_KEY=drill_key bash "$ROOT/infrastructure/scripts/restore-openwa.sh" "$OPENWA_ARCHIVE" "$OPENWA_RESTORE" >/dev/null
ELAPSED="$(( $(date +%s) - START ))"
for f in openwa.sqlite main.sqlite sessions/session-drill/Default/session.json sessions/session-drill/Default/Cookies; do
  cmp -s "$OPENWA_SRC/$f" "$OPENWA_RESTORE/$f" || { echo "FAIL: OpenWA restore mismatch: $f"; exit 1; }
done
echo "PASS paired OpenWA encrypted backup/restore drill (sqlite + session metadata + auth; ${ELAPSED}s)"
echo 'PASS disposable paired recovery drill (no live data, no Docker daemon required)'
