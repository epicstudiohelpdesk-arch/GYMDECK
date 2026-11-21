#!/usr/bin/env bash
# ==============================================================================
# Postal Webhook Tunnel via Cloudflare Tunnel
# Safely exposes ONLY the canonical webhook route to the internet
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "🌐 LAUNCHING SECURE WEBHOOK TUNNEL FOR GYMDECK EMAIL LINE"
echo "================================================================="
echo "Exposing local GymDeck backend (port 3001) for Postal webhook ingress..."
echo "Route target: POST /v1/webhooks/postal"
echo ""

cloudflared tunnel --url http://127.0.0.1:3001
