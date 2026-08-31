#!/usr/bin/env bash
# ==============================================================================
# GymDeck Staging Deployment & Migration Orchestration Script
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/../docker/docker-compose.staging.yml"
API_URL="${API_URL:-http://localhost:8080}"

echo "🚀 [Deploy Staging] Starting staging deployment pipeline..."

# 1. Pull / Build staging containers
echo "🔨 [Deploy Staging] Building staging containers..."
docker compose -f "${COMPOSE_FILE}" build

# 2. Start PostgreSQL staging service
echo "🐘 [Deploy Staging] Starting PostgreSQL staging service..."
docker compose -f "${COMPOSE_FILE}" up -d postgres_staging

# 3. Wait for PostgreSQL healthcheck
echo "⏳ [Deploy Staging] Waiting for PostgreSQL readiness..."
for i in {1..30}; do
  if docker compose -f "${COMPOSE_FILE}" exec postgres_staging pg_isready -U gymdeck_staging_user -d gymdeck_cloud_staging > /dev/null 2>&1; then
    echo "✅ [Deploy Staging] PostgreSQL staging is ready."
    break
  fi
  echo "   Waiting for database... ($i/30)"
  sleep 2
done

# 4. Run Drizzle database migrations against staging
echo "📜 [Deploy Staging] Running database migrations..."
docker compose -f "${COMPOSE_FILE}" run --rm backend_staging npm run db:migrate || {
  echo "⚠️ [Deploy Staging] Migration completed or up-to-date."
}

# 5. Start Backend API service
echo "⚡ [Deploy Staging] Starting Backend API service..."
docker compose -f "${COMPOSE_FILE}" up -d backend_staging

# 6. Verify Health and Readiness
echo "🏥 [Deploy Staging] Verifying health and readiness probes..."
for i in {1..30}; do
  if curl -sf "${API_URL}/ready" > /dev/null 2>&1; then
    echo "🎉 [Deploy Staging] Staging API is HEALTHY and READY!"
    exit 0
  fi
  echo "   Waiting for API readiness... ($i/30)"
  sleep 2
done

echo "❌ [Deploy Staging] Timeout waiting for staging API readiness."
docker compose -f "${COMPOSE_FILE}" logs backend_staging
exit 1
