# OpenWA × GymDeck Desktop Integration Architecture

**Document Version:** 1.0.0  
**Scope:** Production-grade end-to-end integration between GymDeck and OpenWA WhatsApp Gateway.

---

## 1. Architectural Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                 GYMDECK DESKTOP (Tauri v2)                  │
│                                                             │
│  [Settings → Gym Profile]      [Communication Hub & Send]   │
│   WhatsAppConnectionCard.jsx    CommunicationHub.jsx        │
│          │                                 │                │
│          └───────────────┬─────────────────┘                │
│                          ▼                                  │
│                 whatsappApi.js                              │
│                          │                                  │
│                          ▼                                  │
│         cloud_communications_request_command (Rust)         │
└──────────────────────────┬──────────────────────────────────┘
                           │ Authenticated HTTP / Bearer JWT
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 GYMDECK CLOUD GATEWAY (Node)                │
│                                                             │
│   • Route: /v1/owner/whatsapp/*                             │
│   • Tenant Isolation & Auth Middleware                      │
│   • Services: accountService, messageService, openwaClient  │
│   • PostgreSQL: whatsapp_provider_connections, messages     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Authenticated REST / X-Api-Key
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     OPENWA SIDECAR (Port 2785)              │
│                                                             │
│   • Headless Chromium Engine (Puppeteer / WEBJS)            │
│   • WhatsApp Session & Pairing State Machine                │
│   • Direct WhatsApp Web Socket Connection                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Encrypted WhatsApp Protocol
                           ▼
                 CONNECTED WHATSAPP PHONE
```

---

## 2. Key Modules & Implementation Details

### 2.1 Desktop Client Layer
- **`frontend/whatsappApi.js`:**
  Abstracted client that routes requests via Tauri's native `cloud_communications_request_command` IPC bridge. This guarantees that API secrets and direct server URLs are never exposed in webview runtime memory.
- **`frontend/WhatsAppConnectionCard.jsx`:**
  Mounted under **Settings → Gym Profile → Contact & Communication**.
  Provides live QR code rendering, real-time polling during `CONNECTING`, session health badges (`NOT_CONNECTED`, `CONNECTING`, `CONNECTED`, `DISCONNECTED`), and disconnect controls.
- **`frontend/CommunicationHub.jsx`:**
  Mounted under sidebar navigation **Communication → Communication Hub**.
  Provides a unified dashboard for compose, message history, status badges (`QUEUED`, `ACCEPTED`, `SENT`, `DELIVERED`, `READ`, `FAILED`), and opt-out preferences.

### 2.2 Tauri Rust Cloud Bridge
- **`src-tauri/src/commands/cloud_enroll_commands.rs`:**
  Authorized whitelist routes include `/v1/owner/whatsapp` alongside enrollment and tenant endpoints. Signs outgoing desktop calls with the locally encrypted gym owner session token.

### 2.3 Backend Gateway & Isolation
- **`backend/services/whatsapp/accountService.ts`:**
  Manages session lifecycle in SQLite/PostgreSQL `whatsapp_provider_connections`. Automatically formats session names as `gymdeck-<sanitized_gym_id>` ensuring one gym cannot link or manipulate another gym's WhatsApp session.
- **`backend/services/whatsapp/openwaClient.ts`:**
  Direct REST client adhering strictly to OpenWA OpenAPI specifications (`/api/sessions/{sessionId}/start`, `/api/sessions/{sessionId}/qr`, `/api/sessions/{sessionId}/messages/send-text`).
- **`backend/gateway/src/routes/webhooks.ts`:**
  Listens for OpenWA incoming webhook events (`message.ack`, `session.status`), cryptographically verifies HMAC signatures, and updates delivery tracking in `whatsapp_messages` and `whatsapp_message_events`.

---

## 3. Real-World Operation Runbook

1. **Service Startup:**
   - OpenWA Gateway starts independently on `http://127.0.0.1:2785`.
   - GymDeck Backend runs on `http://localhost:3001`.
   - GymDeck Desktop App boots via `npm run tauri:dev` on port `3000`.

2. **Connecting a Gym WhatsApp Account:**
   - Navigate to **Settings → Gym Profile**.
   - Scroll to **Contact & Communication**.
   - Click **Connect WhatsApp** on the connection card.
   - GymDeck requests an OpenWA session and renders the generated QR code.
   - Scan the QR code on the gym's physical phone via **WhatsApp → Linked Devices → Link a Device**.
   - The card status immediately flips to **Connected** with phone number metadata.

3. **Sending Notifications:**
   - Navigate to **Communication → Communication Hub** (or **Send Notification**).
   - Compose announcement or select members.
   - Click **Send WhatsApp Notification**.
   - Message is committed to database, dispatched to OpenWA, and delivered to the recipient.
