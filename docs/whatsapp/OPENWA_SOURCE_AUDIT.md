# OpenWA WhatsApp Gateway — Source Audit & Integration Contract

**Document Version:** 1.0.0  
**Audited Codebase:** `/Users/subhamdas/Documents/OpenWA-main`  
**OpenWA API Version:** 0.30.3 (OpenAPI 3.0.0 specification)  
**Host & Port Runtime:** `http://127.0.0.1:2785`  
**Target Consumer:** GymDeck Desktop Application (Tauri v2 + React 19 + Rust IPC + Cloud Gateway)

---

## 1. Executive Summary

This audit establishes the formal integration contracts, lifecycle states, authentication mechanisms, and REST endpoints provided by the local OpenWA service. OpenWA runs as a completely decoupled sidecar process, wrapping headless Chromium (Puppeteer/whatsapp-web.js) to automate WhatsApp Web interactions.

GymDeck communicates with OpenWA exclusively through its authenticated cloud gateway and backend services, preserving tenant isolation (`gym_id`), security credentials, and zero-exposure of secrets to the desktop frontend.

---

## 2. OpenWA Service Topology & Execution

- **Repository Root:** `/Users/subhamdas/Documents/OpenWA-main`
- **Active Service Location:** `services/openwa`
- **Process Entrypoint:** `node dist/main.js`
- **Port:** `2785` (HTTP REST API)
- **Engine Type:** `WEBJS` (Puppeteer WhatsApp Web automation)
- **Configuration Defaults:**
  - `PORT`: `2785`
  - `API_MASTER_KEY`: Master authentication key for management endpoints
  - `API_KEY`: Session/API authorization token (e.g., `dev_openwa_api_key_change_me_32chars`)
  - `WEBHOOK_URL`: Target URL for inbound message and delivery status events

---

## 3. Authentication & Security Model

OpenWA enforces token authentication across all session and messaging endpoints.

1. **Header Requirement:**
   - `X-Api-Key: <API_KEY>` or `Authorization: Bearer <API_KEY>`
2. **GymDeck Boundary Rule:**
   - Desktop frontend (React) NEVER holds the OpenWA API key.
   - Frontend calls Tauri IPC `cloud_communications_request_command`, which routes to GymDeck backend (`http://localhost:3001`).
   - GymDeck backend validates gym session JWT, enforces `gym_id` scoping, attaches `X-Api-Key`, and communicates with OpenWA on `127.0.0.1:2785`.

---

## 4. Verified Core API Endpoints

From `/Users/subhamdas/Documents/OpenWA-main/openapi.json`:

### 4.1 System Health
- **`GET /api/health`**
  - **Auth:** None
  - **Response:** `{"status":"ok","timestamp":"..."}`
- **`GET /api/health/live`**, **`GET /api/health/ready`**

### 4.2 Session Management
- **`GET /api/sessions`**
  - **Summary:** List all configured WhatsApp sessions
  - **Params:** `limit` (integer), `offset` (integer), `name` (string)
- **`POST /api/sessions`**
  - **Summary:** Create a new WhatsApp session
  - **Body:** `{"name": "gymdeck-<gym_id>"}`
- **`GET /api/sessions/{sessionId}`**
  - **Summary:** Retrieve session metadata, engine status, and phone details
  - **Response Shape:**
    ```json
    {
      "id": "813d28d4-165a-416e-ad78-b85476d359eb",
      "name": "gymdeck-15a8189e0b2d4f21a5af0792",
      "status": "qr_ready",
      "phone": null,
      "pushName": null,
      "connectedAt": null,
      "lastActive": null,
      "lastError": null,
      "engineLoaded": true
    }
    ```
- **`POST /api/sessions/{sessionId}/start`**
  - **Summary:** Initializes Puppeteer browser instance, boots WhatsApp Web, and generates QR code.
  - **Transitions:** `disconnected` -> `starting` -> `qr_ready`.
- **`GET /api/sessions/{sessionId}/qr`**
  - **Summary:** Fetches active QR code string or image
  - **Response:**
    ```json
    {
      "status": "qr_ready",
      "qrCode": "data:image/png;base64,iVBORw0KGgo...",
      "pairingCode": null
    }
    ```
- **`POST /api/sessions/{sessionId}/stop`**
  - **Summary:** Gracefully stops session without destroying pairing credentials.
- **`POST /api/sessions/{sessionId}/logout`**
  - **Summary:** Unlinks device from WhatsApp and wipes cached local authentication keys.

### 4.3 Message Dispatching
- **`POST /api/sessions/{sessionId}/messages/send-text`**
  - **Summary:** Dispatches a plain text message to a WhatsApp user or group
  - **Headers:** `Idempotency-Key` (Optional UUID to prevent duplicate sends within 24h)
  - **Request Body:**
    ```json
    {
      "chatId": "919876543210@c.us",
      "text": "Hello from GymDeck! Your membership expires tomorrow."
    }
    ```
  - **Formatting Rules:**
    - Recipient numbers must include country code without symbols: e.g. `919876543210`.
    - 1-to-1 chats must be suffixed with `@c.us`.
    - Group chats must be suffixed with `@g.us`.
  - **Success Response (201 Created):**
    ```json
    {
      "id": "true_919876543210@c.us_3EB0...",
      "timestamp": 1773829000,
      "status": "sent",
      "ack": 1
    }
    ```

### 4.4 Webhook Subscriptions
- **`POST /api/sessions/{sessionId}/webhooks`**
  - **Summary:** Registers callback webhook for inbound messages and delivery acknowledgments.
  - **Supported Events:**
    - `message`: Inbound messages from members.
    - `message.ack`: Delivery tracking (`ack: 1` sent, `ack: 2` delivered, `ack: 3` read).
    - `session.status`: Connection changes (`authenticated`, `ready`, `disconnected`, `qr_ready`).
  - **Payload Signature:** `X-OpenWA-Signature: sha256=...` verified against webhook shared secret.

---

## 5. Session State Lifecycle Diagram

```text
               ┌───────────────┐
               │  DISCONNECTED │
               └───────┬───────┘
                       │ POST /api/sessions/{sessionId}/start
                       ▼
               ┌───────────────┐
               │    STARTING   │
               └───────┬───────┘
                       │ Browser launched & QR generated
                       ▼
               ┌───────────────┐
         ┌────►│    QR_READY   │◄─── (QR refresh every 20-30s)
         │     └───────┬───────┘
         │             │ User scans QR code on phone
         │             ▼
         │     ┌───────────────┐
         │     │ AUTHENTICATED │
         │     └───────┬───────┘
         │             │ WhatsApp Web state loaded
         │             ▼
         │     ┌───────────────┐
         │     │     READY     │ (Can send & receive messages)
         │     └───────┬───────┘
         │             │
         │   Disconnection / Logout
         └─────────────┴────────────► DISCONNECTED / REAUTHORIZATION_REQUIRED
```

---

## 6. Integration Boundaries & Guarantees

1. **Gym Tenant Scoping:**
   - Session names and DB records map `gym_id` -> `whatsapp_provider_connections.provider_session_id`.
   - GymDeck enforces SQL constraints ensuring gym `A` cannot query or trigger messages for gym `B`.
2. **Consent & Quiet Hours:**
   - Every outbound dispatch checks `whatsapp_contact_consent` and gym communication policy.
3. **Graceful Degradation:**
   - If OpenWA is stopped or restarting, the GymDeck UI indicates status `DISCONNECTED` or `CONNECTING` without freezing the desktop app.
   - Message requests are queued in `whatsapp_message_queue` and retried once connection status transitions to `ready`.
