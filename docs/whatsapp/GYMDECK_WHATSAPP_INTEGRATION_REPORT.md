# GymDeck WhatsApp — OpenWA Integration

**Date:** 18 November 2026
**Scope:** Bundled OpenWA WhatsApp gateway replacing the previous Meta Cloud API transport.
**Status:** Implemented and smoke-tested locally (gateway health, session creation, QR
generation, webhook registration, tenant lookup, signed webhook processing and idempotency).
**Not verified here:** a real phone scan and live delivery, which require the gym's own
WhatsApp account.

---

## 1. What changed

| Area | Implementation |
| --- | --- |
| WhatsApp service | Complete OpenWA NestJS service vendored at `services/openwa/` (MIT) |
| Account lifecycle | `backend/services/whatsapp/accountService.ts` drives one OpenWA session per gym |
| Outbound transport | `transport.ts` → `openwaClient.ts` → `POST /api/sessions/:id/messages/send-text` |
| Queue | Existing durable queue/idempotency/retry retained; jobs require `CONNECTED` + session id |
| Delivery receipts | `POST /v1/webhooks/openwa`, HMAC `X-OpenWA-Signature`, idempotent event rows |
| Templates | GymDeck templates render locally to text; no Meta review |
| Owner UI | `WhatsAppConnectionCard.jsx` shows the live QR and polls until linked |
| Communication Hub | Compose/history/automation kept; Meta approval, sandbox and cost wording removed |
| Database | `0006_openwa_messaging.sql`: provider, session id/name, webhook id, status |
| Deployment | `docker-compose.staging.yml` / `docker-compose.prod.yml` include the sidecar |

The previous Meta webhook, OAuth callback, Embedded Signup routes and Cloud API transport
were removed from the runtime. Legacy Meta columns remain in the database so existing rows
stay readable; migration `0006` resets any unlinked legacy row to `NOT_CONNECTED`.

---

## 2. Architecture

```
React (Gym Profile card, Communication Hub)
        │  authenticated owner API
        ▼
GymDeck Cloud Gateway (tenant from JWT only)
        │
        ├─ Account service ── ensure/start OpenWA session, fetch QR, store session id
        ├─ Message service ── preview = send evaluation (consent, 24h window, template)
        ├─ Queue + worker ── durable jobs, retries, idempotency
        └─ OpenWA webhook ── signature → idempotency → tenant by session id → state
        │
        ▼
OpenWA sidecar (NestJS + whatsapp-web.js) ── linked gym phone ──► member WhatsApp
```

**Tenant isolation:** the webhook resolves the gym from `openwa_session_id`; it never accepts
a gym id from the request body. Session names are derived from the gym UUID.

**Connection truth:** `CONNECTED` is written only when OpenWA reports `ready` and a linked
phone. A typed WhatsApp number in Gym Profile never implies a connection.

**Delivery truth:** `SENT`, `DELIVERED`, `READ` and `FAILED` come from OpenWA
`message.ack` / `message.failed` webhooks, correlated by the provider message id.

---

## 3. Run locally

1. Install and build OpenWA:

   ```bash
   cd services/openwa
   PUPPETEER_SKIP_DOWNLOAD=true npm ci
   npm run build
   ```

2. Configure the sidecar from `.env.gymdeck.example` (copy to `.env`), or export the same
   variables. Local defaults:

   - `OPENWA_API_URL=http://127.0.0.1:2785/api`
   - `OPENWA_API_KEY=dev_openwa_api_key_change_me_32chars`
   - `OPENWA_WEBHOOK_SECRET=dev_openwa_webhook_secret_32chars`
   - `OPENWA_WEBHOOK_URL=http://127.0.0.1:3001/v1/webhooks/openwa`
   - `WEBHOOK_SSRF_PROTECT=false` (loopback webhook only)

3. Start OpenWA:

   ```bash
   cd services/openwa
   npm run start:prod
   ```

   Health: `GET http://127.0.0.1:2785/api/health/live`.

4. Apply migration `0006` and start the GymDeck backend on port 3001.

5. In GymDeck: **Settings → Gym Profile → WhatsApp → Connect WhatsApp**, scan the QR with
   the dedicated gym phone, wait for **Connected**, then send a test message.

### Docker

Both staging and production compose files build `services/openwa`, keep its SQLite data on
a named volume, expose it only on the internal network, and point GymDeck at
`http://openwa:2785/api`. Set real `OPENWA_API_KEY` and `OPENWA_WEBHOOK_SECRET` values; the
API key must be at least 32 characters in production.

---

## 4. Security and operational notes

- OpenWA is **unofficial** and uses WhatsApp Web. WhatsApp may restrict accounts that send
  automated or bulk messages. Use a dedicated gym number you can afford to lose.
- Consent, opt-out, utility-only content, rate limits and the 24-hour window remain enforced
  by GymDeck.
- The OpenWA API key and webhook secret are server-side only; the frontend receives no
  credentials.
- The OpenWA sidecar must stay running for sends and session status. If it is down, the UI
  reports the gateway as unreachable instead of claiming a connection.
- Back up the OpenWA data volume (`openwa_prod_data`) to avoid re-linking after a host loss.
- Session logout during Disconnect is intentional. Reconnecting creates a fresh QR.

---

## 5. Verification performed

| Check | Result |
| --- | --- |
| `pnpm --dir backend typecheck` | Passed |
| OpenWA `/api/health/live` | `{"status":"ok"}` |
| Create + start session, fetch QR | `qr_ready`, PNG data URL returned |
| Register webhook with five events | Webhook id returned |
| GymDeck `connect()` against OpenWA + Postgres | `CONNECTING`, QR present, account row stored |
| Tenant lookup by session id | Correct gym |
| Signed `session.status` webhook | Processed; account moved to `CONNECTED` |
| Replay of same webhook | `duplicates: 1`, no second state change |
| Invalid signature | `401 Invalid OpenWA webhook signature.` |
| `disconnect()` | `DISCONNECTED`, session logged out |
| Real phone scan / live delivery | Not performed (no phone available) |
