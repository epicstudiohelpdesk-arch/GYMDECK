#!/usr/bin/env bash
# Disposable certificate/key validation. Never reads production certificate paths.
set -euo pipefail
command -v openssl >/dev/null 2>&1 || { echo "FAIL: openssl required"; exit 1; }

TMP="$(mktemp -d)"
trap 'chmod -R u+rwX "$TMP" 2>/dev/null || true; rm -rf "$TMP"' EXIT
CERT="$TMP/fullchain.pem"
KEY="$TMP/privkey.pem"
BAD="$TMP/bad.pem"

expect_fail() {
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "FAIL: $label was accepted"
    exit 1
  fi
  echo "PASS: $label rejected"
}

check_pair() {
  openssl x509 -in "$1" -noout >/dev/null 2>&1 || return 1
  openssl pkey -in "$2" -noout >/dev/null 2>&1 || return 1
  node -e 'const fs=require("fs");if((fs.statSync(process.argv[1]).mode & 0o077)!==0)process.exit(1)' "$2" || return 1
  node -e 'const fs=require("fs");if((fs.statSync(process.argv[1]).mode & 0o022)!==0)process.exit(1)' "$1" || return 1
  local a b
  a="$(openssl x509 -noout -modulus -in "$1" | openssl sha256)"
  b="$(openssl rsa -noout -modulus -in "$2" | openssl sha256)"
  [ "$a" = "$b" ]
}

openssl req -x509 -newkey rsa:2048 -nodes -keyout "$KEY" -out "$CERT" \
  -days 1 -subj '/CN=gymdeck-local-test.invalid' >/dev/null 2>&1
chmod 0644 "$CERT"
chmod 0600 "$KEY"
printf 'NOT A CERTIFICATE\n' > "$BAD"

check_pair "$CERT" "$KEY" || { echo "FAIL: valid pair rejected"; exit 1; }
echo "PASS: valid certificate/key pair accepted"

expect_fail "missing certificate" check_pair "$TMP/missing.pem" "$KEY"
expect_fail "malformed certificate" check_pair "$BAD" "$KEY"

chmod 0000 "$KEY"
expect_fail "unreadable private key" check_pair "$CERT" "$KEY"
chmod 0666 "$KEY"
expect_fail "world-writable private key" check_pair "$CERT" "$KEY"
chmod 0600 "$KEY"

echo "PASS certificate file validation (disposable, no ACME/DNS involved)"
