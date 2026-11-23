#!/usr/bin/env bash
# Fail-closed Compose validation: both stacks must parse with explicit secrets,
# and must refuse to start with missing required variables.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOCKER_BIN="${DOCKER_BIN:-docker}"
command -v "$DOCKER_BIN" >/dev/null 2>&1 || { echo "FAIL: $DOCKER_BIN is required"; exit 1; }

PROD="$ROOT/infrastructure/docker/docker-compose.prod.yml"
STAGING="$ROOT/infrastructure/docker/docker-compose.staging.yml"

COMPOSE_ENV=(
  POSTGRES_PASSWORD=ci-placeholder-password
  CORS_ORIGINS=https://example.invalid
  JWT_SECRET=ci-placeholder-jwt-secret
  PAYMENT_ENCRYPTION_KEY=ci-placeholder-payment-key
  STORAGE_ACCESS_KEY=ci-placeholder-access-key
  STORAGE_SECRET_KEY=ci-placeholder-secret-key
  OPENWA_API_KEY=ci-placeholder-openwa-key
  OPENWA_WEBHOOK_SECRET=ci-placeholder-openwa-secret
  POSTGRES_STAGING_PASSWORD=ci-placeholder-staging-password
  JWT_STAGING_SECRET=ci-placeholder-staging-jwt
  OPENWA_STAGING_API_KEY=ci-placeholder-staging-openwa-key
  OPENWA_STAGING_WEBHOOK_SECRET=ci-placeholder-staging-openwa-secret
  CORS_ORIGINS_STAGING=https://staging.example.invalid
  PAYMENT_ENCRYPTION_KEY_STAGING=ci-placeholder-staging-payment-key
  STORAGE_ACCESS_KEY_STAGING=ci-placeholder-staging-access-key
  STORAGE_SECRET_KEY_STAGING=ci-placeholder-staging-secret-key
)
UNSET_ENV=(
  POSTGRES_PASSWORD CORS_ORIGINS JWT_SECRET PAYMENT_ENCRYPTION_KEY
  STORAGE_ACCESS_KEY STORAGE_SECRET_KEY OPENWA_API_KEY OPENWA_WEBHOOK_SECRET
  POSTGRES_STAGING_PASSWORD JWT_STAGING_SECRET OPENWA_STAGING_API_KEY
  OPENWA_STAGING_WEBHOOK_SECRET CORS_ORIGINS_STAGING PAYMENT_ENCRYPTION_KEY_STAGING
  STORAGE_ACCESS_KEY_STAGING STORAGE_SECRET_KEY_STAGING
)

for file in "$PROD" "$STAGING"; do
  name="$(basename "$file")"
  if env "${COMPOSE_ENV[@]}" "$DOCKER_BIN" compose -f "$file" config --quiet; then
    echo "PASS $name parses with explicit configuration"
  else
    echo "FAIL $name does not parse"; exit 1
  fi

  unset_args=()
  for var in "${UNSET_ENV[@]}"; do unset_args+=("-u" "$var"); done
  set +e
  env "${unset_args[@]}" "$DOCKER_BIN" compose -f "$file" config --quiet >/dev/null 2>&1
  code=$?
  set -e
  [ "$code" -ne 0 ] || { echo "FAIL $name accepted missing required variables"; exit 1; }
  echo "PASS $name fails closed on missing required variables (exit $code)"
done
