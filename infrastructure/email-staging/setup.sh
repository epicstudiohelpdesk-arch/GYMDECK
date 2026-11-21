#!/usr/bin/env bash
# ==============================================================================
# Postal v3.4.0 Local Staging Environment Initializer
# Prepares configuration, databases, signing keys, and initializes Postal.
# ==============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================================="
echo "🚀 INITIALIZING POSTAL v3.4.0 LOCAL STAGING ENVIRONMENT"
echo "================================================================="

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  
  # Generate cryptographically secure random passwords
  ROOT_PW=$(openssl rand -hex 16)
  POSTAL_PW=$(openssl rand -hex 16)
  SECRET_KEY=$(openssl rand -hex 64)
  
  sed -i '' "s/postal_staging_root_pass_change_me/$ROOT_PW/g" .env
  sed -i '' "s/postal_staging_db_pass_change_me/$POSTAL_PW/g" .env
  sed -i '' "s/RAILS_SECRET_KEY=.*/RAILS_SECRET_KEY=$SECRET_KEY/g" .env
  echo "✅ .env initialized with fresh credentials."
fi

# Load variables
export $(grep -v '^#' .env | xargs)

# 2. Ensure config/postal.yml exists
mkdir -p config
if [ ! -f config/postal.yml ]; then
  echo "⚙️ Generating config/postal.yml..."
  cat << EOF > config/postal.yml
version: 2

postal:
  web_hostname: ${POSTAL_WEB_HOSTNAME:-localhost:5000}
  web_protocol: ${POSTAL_WEB_PROTOCOL:-http}
  smtp_hostname: ${POSTAL_SMTP_HOSTNAME:-localhost}
  use_ip_pools: false
  signing_key_path: /config/signing.key
  default_maximum_delivery_attempts: 10
  default_maximum_hold_expiry_days: 7
  # Allow internal docker network and host loopback webhooks
  allowed_request_destinations:
    - 127.0.0.1/32
    - 10.0.0.0/8
    - 172.16.0.0/12
    - 192.168.0.0/16
    - host.docker.internal

web_server:
  default_port: 5000
  default_bind_address: 0.0.0.0
  max_threads: 4

worker:
  threads: 2

main_db:
  host: mariadb
  port: 3306
  username: root
  password: ${MARIADB_ROOT_PASSWORD}
  database: ${MARIADB_DATABASE:-postal}
  pool_size: 5
  encoding: utf8mb4

message_db:
  host: mariadb
  port: 3306
  username: root
  password: ${MARIADB_ROOT_PASSWORD}
  encoding: utf8mb4
  database_name_prefix: postal

dns:
  mx_records:
    - mail.epic-studio.in
  spf_include: spf.mail.epic-studio.in
  return_path_domain: rp.mail.epic-studio.in
  helo_hostname: mail.epic-studio.in
  dkim_identifier: postal
  dkim_key_size: 2048
  custom_return_path_prefix: psrp

smtp_server:
  default_port: 25
  default_bind_address: 0.0.0.0
  tls_enabled: false

smtp:
  host: 127.0.0.1
  port: 25
  from_name: GymDeck
  from_address: notifications@mail.epic-studio.in

rails:
  environment: production
  secret_key: ${RAILS_SECRET_KEY}

logging:
  enabled: true
  level: INFO
EOF
  echo "✅ config/postal.yml generated."
fi

# 3. Start MariaDB first to prepare databases
echo "📦 Starting MariaDB container..."
docker compose up -d mariadb

echo "⏳ Waiting for MariaDB to report healthy..."
until docker compose exec -T mariadb healthcheck.sh --connect --innodb_initialized > /dev/null 2>&1; do
  sleep 2
  echo "   Waiting for MariaDB engine initialization..."
done
echo "✅ MariaDB is healthy and accepting connections."

# 4. Initialize databases and signing keys via Postal CLI
echo "🔑 Initializing Postal databases and signing key..."
docker compose run --rm --entrypoint "" postal-web postal initialize-config || true
docker compose run --rm --entrypoint "" postal-web postal initialize

echo "================================================================="
echo "🎉 POSTAL v3.4.0 INITIALIZATION COMPLETE!"
echo "   Run ./start.sh to launch web, smtp, and worker containers."
echo "================================================================="
