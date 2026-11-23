#!/usr/bin/env bash
# Staging deploy: fail closed on validation, migration or health failure.
set -euo pipefail
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../docker/docker-compose.staging.yml"
API_URL="${API_URL:-http://localhost:8080}"

compose() { "${DOCKER_BIN:-docker}" compose -f "${COMPOSE_FILE}" "$@"; }
probe() { "${CURL_BIN:-curl}" -sf "${API_URL}/ready" >/dev/null 2>&1; }

echo "[deploy] validating compose configuration"
compose config --quiet

echo "[deploy] building images"
compose build

echo "[deploy] starting postgres"
compose up -d postgres_staging

echo "[deploy] waiting for postgres"
ok=0
for _ in $(seq 1 ${READINESS_ATTEMPTS:-30}); do
  if compose exec -T postgres_staging pg_isready -U gymdeck_staging_user -d gymdeck_cloud_staging >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
[ "$ok" = "1" ] || { echo "FATAL: postgres not ready"; exit 1; }

echo "[deploy] applying migrations (failure aborts deployment)"
compose run --rm backend_staging npm run db:migrate

echo "[deploy] starting backend"
compose up -d backend_staging

echo "[deploy] waiting for readiness"
ok=0
for _ in $(seq 1 ${READINESS_ATTEMPTS:-30}); do
  if probe; then ok=1; break; fi
  sleep 2
done
if [ "$ok" != "1" ]; then
  compose logs backend_staging || true
  echo "FATAL: readiness check failed"
  exit 1
fi
echo "[deploy] staging healthy"
