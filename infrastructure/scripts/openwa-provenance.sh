#!/usr/bin/env bash
# Record verifiable OpenWA source provenance. No image digest is claimed here:
# the image digest MUST be produced by an authorized build and recorded in the
# deployment evidence after that build succeeds.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
VERSION="$(node -p "require('./services/openwa/package.json').version")"
COMMIT="$(git log -1 --format=%H -- services/openwa)"
SRC_DIGEST="$(find services/openwa -type f \
  -not -path '*/node_modules/*' -not -path '*/.git/*' -not -name '*.sqlite*' \
  -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -d' ' -f1)"
printf 'version=%s\nsource_commit=%s\nsource_tree_sha256=%s\nimage_digest=PENDING_AUTHORIZED_BUILD\n' \
  "$VERSION" "$COMMIT" "$SRC_DIGEST"
[ "$VERSION" = "0.30.3" ] || { echo "FATAL: OpenWA version is not 0.30.3" >&2; exit 1; }
