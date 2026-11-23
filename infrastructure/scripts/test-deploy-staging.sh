#!/usr/bin/env bash
# Failure-propagation tests for deploy-staging.sh (no real Docker or HTTP).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/infrastructure/scripts/deploy-staging.sh"
BIN="$(mktemp -d)"
LOG="$(mktemp)"
trap 'rm -rf "$BIN" "$LOG"' EXIT

make_stub() {
  local name="$1"
  cat > "$BIN/$name" <<EOF
#!/usr/bin/env bash
echo "$name \$*" >> "\$STUB_LOG"
if [ "\${STUB_FAIL:-}" = "$name" ]; then exit 1; fi
if [ "\${STUB_FAIL:-}" = "migration" ] && [ "$name" = "docker" ] && [ "\$4" = "run" ]; then exit 1; fi
if [ "$name" = "curl" ]; then exit 1; fi
exit 0
EOF
  chmod +x "$BIN/$name"
}
make_stub docker
make_stub curl

run_case() {
  local fail="$1"
  : > "$LOG"
  set +e
  READINESS_ATTEMPTS=1 STUB_FAIL="$fail" STUB_LOG="$LOG" PATH="$BIN:$PATH" bash "$SCRIPT" >/dev/null 2>&1
  local code=$?
  set -e
  [ "$code" -ne 0 ] || { echo "FAIL: $fail did not abort deployment"; exit 1; }
  echo "PASS: $fail aborts deployment (exit $code)"
}

run_case docker
run_case migration
if grep -q 'up -d backend_staging' "$LOG"; then
  echo "FAIL: backend started after migration failure"
  exit 1
fi
echo "PASS: backend is not started after migration failure"
# Health-check failure: docker succeeds, curl always fails.
set +e
READINESS_ATTEMPTS=1 STUB_FAIL=curl STUB_LOG="$LOG" PATH="$BIN:$PATH" bash "$SCRIPT" >/dev/null 2>&1
code=$?
set -e
[ "$code" -ne 0 ] || { echo "FAIL: health failure did not abort"; exit 1; }
echo "PASS: health failure aborts deployment (exit $code)"
