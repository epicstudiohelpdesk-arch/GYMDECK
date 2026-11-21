# Postal Staging Restore Documentation

## 1. Prerequisites
- Docker Desktop running.
- Backup folder created by `./backup.sh` (e.g. `infrastructure/email-staging/backups/YYYYMMDD_HHMMSS/`).

## 2. Restore Steps

### Step 1: Stop Postal services
```bash
cd infrastructure/email-staging
./stop.sh
```

### Step 2: Restore Configuration & Keys
```bash
BACKUP_PATH="./backups/20261121_090000" # Replace with your target backup directory
cp "$BACKUP_PATH/.env" ./
cp "$BACKUP_PATH/postal.yml" ./config/
if [ -f "$BACKUP_PATH/signing.key" ]; then
  cp "$BACKUP_PATH/signing.key" ./config/
fi
```

### Step 3: Start MariaDB only
```bash
docker compose up -d mariadb
```

### Step 4: Import Database Dump
```bash
export $(grep -v '^#' .env | xargs)
docker compose exec -T mariadb mariadb -u root -p"${MARIADB_ROOT_PASSWORD}" < "$BACKUP_PATH/postal_all_databases.sql"
```

### Step 5: Start all Postal services
```bash
./start.sh
./health.sh
```
