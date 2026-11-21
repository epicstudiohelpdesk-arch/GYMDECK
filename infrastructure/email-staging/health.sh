#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================="
echo "🔍 POSTAL STAGING HEALTH & STATUS REPORT"
echo "================================================================="

docker compose ps

echo -e "\n🌐 Web Interface / API Port Check:"
if curl -s -I http://127.0.0.1:5000 | head -n 1; then
  echo "✅ Web UI / API is responsive on http://127.0.0.1:5000"
else
  echo "⚠️ Web UI / API is not responding on http://127.0.0.1:5000"
fi

echo -e "\n📧 SMTP Ingress Port Check:"
if nc -z 127.0.0.1 2525; then
  echo "✅ Local SMTP Ingress is listening on 127.0.0.1:2525"
else
  echo "⚠️ Local SMTP Ingress is not listening on 127.0.0.1:2525"
fi
