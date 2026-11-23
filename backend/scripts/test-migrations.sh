#!/usr/bin/env bash
# Disposable PostgreSQL migration regression suite.
# Uses a temporary local cluster on a random port. Never touches a production DB.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"
PGDATA_TMP="$(mktemp -d)"
PORT=$((20000 + RANDOM % 20000))
export DATABASE_URL="postgresql://gymdeck_test@127.0.0.1:${PORT}/gymdeck_test"

cleanup() {
  pg_ctl -D "$PGDATA_TMP" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$PGDATA_TMP" "${TMP_MIGRATIONS:-/nonexistent}" /tmp/gymdeck-migrate-*.log
}
trap cleanup EXIT

initdb -D "$PGDATA_TMP" -U gymdeck_test --auth=trust --no-instructions >/dev/null
pg_ctl -D "$PGDATA_TMP" -o "-p ${PORT} -k ${PGDATA_TMP} -c listen_addresses=127.0.0.1" -l "$PGDATA_TMP/server.log" start >/dev/null
createdb -h 127.0.0.1 -p "$PORT" -U gymdeck_test gymdeck_test

cd "$BACKEND"
echo "== 1. clean install =="
npx tsx shared/database/migrate.ts

echo "== 2. repeated execution (idempotency) =="
npx tsx shared/database/migrate.ts | tee /tmp/gymdeck-migrate-repeat.log
! grep -q '^APPLIED' /tmp/gymdeck-migrate-repeat.log

echo "== 3. status =="
npx tsx shared/database/migrate.ts --status

echo "== 4. baseline on existing schema =="
psql -h 127.0.0.1 -p "$PORT" -U gymdeck_test -d gymdeck_test -q -c 'DROP TABLE IF EXISTS gymdeck_schema_migrations'
npx tsx shared/database/migrate.ts --baseline
npx tsx shared/database/migrate.ts | tee /tmp/gymdeck-migrate-baseline.log
! grep -q '^APPLIED' /tmp/gymdeck-migrate-baseline.log

echo "== 5. interrupted migration rolls back =="
TMP_MIGRATIONS="$(mktemp -d)"
cp shared/database/migrations/*.sql "$TMP_MIGRATIONS/"
printf '\nTHIS IS INVALID SQL;\n' > "$TMP_MIGRATIONS/9999_broken.sql"
set +e
GYMDECK_MIGRATIONS_DIR="$TMP_MIGRATIONS" npx tsx shared/database/migrate.ts >/tmp/gymdeck-migrate-broken.log 2>&1
CODE=$?
set -e
if [ "$CODE" -eq 0 ]; then echo "FAIL: broken migration did not fail"; exit 1; fi
cat /tmp/gymdeck-migrate-broken.log
grep -q 'transaction rolled back' /tmp/gymdeck-migrate-broken.log
echo "checkpoint: rollback confirmed"
GYMDECK_MIGRATIONS_DIR="$TMP_MIGRATIONS" npx tsx shared/database/migrate.ts --status | tee /tmp/gymdeck-migrate-status.log
grep '9999_broken.sql' /tmp/gymdeck-migrate-status.log | grep -q PENDING
echo "checkpoint: broken version pending"

echo "== 6. scoped webhook event uniqueness =="
export GYMDECK_MIGRATIONS_DIR="$BACKEND/shared/database/migrations"
psql -h 127.0.0.1 -p "$PORT" -U gymdeck_test -d gymdeck_test -q << 'SQL'
INSERT INTO gyms (id, name, code) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Gym A', 'GA'),
  ('22222222-2222-4222-8222-222222222222', 'Gym B', 'GB');
INSERT INTO email_messages (id, gym_id, subject, body_html, from_address, status, created_at)
VALUES ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 's', 'b', 'test@example.invalid', 'SENT', now());
INSERT INTO email_delivery_events (gym_id, email_message_id, provider_event_id, provider, provider_instance_id, event_type, event_timestamp)
VALUES ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'evt-1', 'BREVO', 'default', 'delivered', now()),
       ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'evt-1', 'POSTAL', 'default', 'delivered', now()),
       ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'evt-1', 'BREVO', 'instance-2', 'delivered', now());
DO $$
BEGIN
  INSERT INTO email_delivery_events (gym_id, email_message_id, provider_event_id, provider, provider_instance_id, event_type, event_timestamp)
  VALUES ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'evt-1', 'BREVO', 'default', 'delivered', now());
  RAISE EXCEPTION 'duplicate within same provider/instance was accepted';
EXCEPTION WHEN unique_violation THEN NULL;
END $$;
SELECT COUNT(*) AS scoped_rows FROM email_delivery_events;
SQL
COUNT="$(psql -h 127.0.0.1 -p "$PORT" -U gymdeck_test -d gymdeck_test -tA -c 'SELECT COUNT(*) FROM email_delivery_events')"
[ "$COUNT" = "3" ] || { echo "FAIL: expected 3 scoped event rows, got $COUNT"; exit 1; }
echo "ALL MIGRATION SCENARIOS PASSED"
