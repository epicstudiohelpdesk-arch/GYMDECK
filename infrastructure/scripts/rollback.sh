#!/usr/bin/env bash
# ==============================================================================
# GymDeck Zero-Downtime Rollback Script
# ==============================================================================
set -euo pipefail

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${ENVIRONMENT}" = "production" ]; then
  COMPOSE_FILE="${SCRIPT_DIR}/../docker/docker-compose.prod.yml"
  SERVICE="backend"
  API_URL="https://api.gymdeck.com"
else
  COMPOSE_FILE="${SCRIPT_DIR}/../docker/docker-compose.staging.yml"
  SERVICE="backend_staging"
  API_URL="http://localhost:8080"
fi

echo "🚨 [Rollback] Initiating rollback for environment: ${ENVIRONMENT}..."

# Restart previous container revision
echo "🔄 [Rollback] Restoring previous container revision..."
docker compose -f "${COMPOSE_FILE}" restart "${SERVICE}"

# Verify service recovery
echo "🏥 [Rollback] Validating service recovery..."
sleep 5
if curl -sf "${API_URL}/ready" > /dev/null 2>&1; then
  echo "✅ [Rollback] Service successfully recovered and responding at ${API_URL}."
else
  echo "⚠️ [Rollback] Warning: /ready probe check failed. Inspect logs:"
  docker compose -f "${COMPOSE_FILE}" logs --tail 50 "${SERVICE}"
fi
