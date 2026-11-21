#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Postal Staging services (mariadb, web, smtp, worker)..."
docker compose up -d

echo "⏳ Checking container health..."
sleep 5
docker compose ps
