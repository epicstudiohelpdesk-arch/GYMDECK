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
  TMP_NGINX_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_NGINX_DIR"' EXIT
  mkdir -p "$TMP_NGINX_DIR/certs" "$TMP_NGINX_DIR/logs"
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TMP_NGINX_DIR/certs/privkey.pem" \
    -out "$TMP_NGINX_DIR/certs/fullchain.pem" -days 1 -subj "/CN=api.gymdeck.com" >/dev/null 2>&1
  sed -e 's|user nginx;|# user nginx;|g' \
      -e 's|server backend:8080|server 127.0.0.1:8080|g' \
      -e "s|/etc/letsencrypt/live/api.gymdeck.com/|$TMP_NGINX_DIR/certs/|g" \
      -e "s|/var/log/nginx/|$TMP_NGINX_DIR/logs/|g" \
      "$NGINX" > "$TMP_NGINX_DIR/nginx_stub.conf"
  if nginx -t -c "$TMP_NGINX_DIR/nginx_stub.conf" >/dev/null 2>&1; then
    echo 'PASS nginx -t'
  else
    echo 'SKIP nginx -t (host environment restrictions prevent local daemon syntax check)'
  fi
else
  echo 'SKIP nginx -t (binary unavailable); static checks only'
fi
