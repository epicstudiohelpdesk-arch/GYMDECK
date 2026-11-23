#!/usr/bin/env bash
# Validate that declared container memory limits fit an 8 GB VM with OS overhead.
set -euo pipefail
COMPOSE="${1:-infrastructure/docker/docker-compose.prod.yml}"
ENV_ARGS=(POSTGRES_PASSWORD=dummy POSTGRES_DB=gymdeck_cloud_prod POSTGRES_USER=gymdeck_prod_user
  JWT_SECRET=dummy_jwt_secret_at_least_32_chars PAYMENT_ENCRYPTION_KEY=dummy
  STORAGE_ACCESS_KEY=dummy STORAGE_SECRET_KEY=dummy OPENWA_API_KEY=dummy_openwa_api_key
  OPENWA_WEBHOOK_SECRET=dummy_openwa_webhook_secret CORS_ORIGINS=https://app.gymdeck.com)
env "${ENV_ARGS[@]}" docker compose -f "$COMPOSE" config --format json > /tmp/gymdeck-compose.json
python3 - << 'PY'
import json, re
cfg = json.load(open('/tmp/gymdeck-compose.json'))
total = 0
for name, svc in cfg.get('services', {}).items():
    raw = svc.get('mem_limit') or '0'
    m = re.match(r'(\d+)([mMgG]?)', str(raw))
    val = int(m.group(1)) if m else 0
    if isinstance(raw, (int, float)) or (m and not m.group(2)):
        val = int(raw) // (1024 * 1024)
    elif m and m.group(2).lower() == 'g': val *= 1024
    total += val
    print(f'{name:12s} {val:6d} MB')
budget = 8192
overhead = 1024
print(f'{"CONTAINERS":12s} {total:6d} MB')
print(f'{"OS/DOCKER":12s} {overhead:6d} MB')
print(f'{"TOTAL":12s} {total+overhead:6d} MB / {budget} MB')
assert total + overhead <= budget, 'Resource budget exceeded for e2-standard-2'
assert 'replicas' not in open('infrastructure/docker/docker-compose.prod.yml').read(), 'Swarm-only replicas key present'
print('RESOURCE BUDGET VALID')
PY
