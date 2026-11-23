#!/usr/bin/env bash
# Local static checks for ingress/TLS wiring. No live certificate issuance.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NGINX="$ROOT/infrastructure/nginx/nginx.conf"
COMPOSE="$ROOT/infrastructure/docker/docker-compose.prod.yml"

for token in 'server_name api.gymdeck.com' 'listen 443 ssl http2' 'ssl_protocols TLSv1.2 TLSv1.3' \
  'Strict-Transport-Security' 'zone=webhook_ingress' '$request_method $uri' \
  '/etc/letsencrypt/live/api.gymdeck.com/fullchain.pem'; do
  grep -qF "$token" "$NGINX" || { echo "FAIL nginx missing: $token"; exit 1; }
done
echo 'PASS nginx static checks'

for token in 'gymdeck-nginx-prod' '443:443' 'certbot_etc:/etc/letsencrypt:ro' 'gymdeck-certbot-prod' \
  'certbot renew' 'kill -HUP' 'networks: [gymdeck_ingress]'; do
  grep -qF "$token" "$COMPOSE" || { echo "FAIL compose missing: $token"; exit 1; }
done
echo 'PASS certbot + compose wiring checks'

if command -v nginx >/dev/null 2>&1; then
  nginx -t -c "$NGINX" >/dev/null 2>&1 && echo 'PASS nginx -t' || { echo 'FAIL nginx -t'; exit 1; }
else
  echo 'SKIP nginx -t (binary unavailable); static checks only'
fi
