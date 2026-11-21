#!/usr/bin/env bash
# ==============================================================================
# Postal Local Staging Safe Reset Script
# Strictly resets Postal staging MariaDB without touching GymDeck PostgreSQL
# ==============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "⚠️  WARNING: You are about to DESTROY the local Postal MariaDB volume!"
echo "   This will delete all Postal staging organizations, credentials, and message logs."
echo "   GymDeck PostgreSQL database (gymdeck_cloud) will NOT be affected."
echo ""
read -r -p "Type 'RESET-POSTAL-STAGING' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "RESET-POSTAL-STAGING" ]; then
  echo "❌ Reset cancelled. No changes made."
  exit 1
fi

echo "🛑 Stopping and removing Postal staging containers..."
docker compose down -v --remove-orphans

echo "🧹 Clearing generated configuration and keys..."
rm -f config/postal.yml config/signing.key .env

echo "✅ Postal Staging environment reset successfully. Run ./setup.sh to re-initialize."
