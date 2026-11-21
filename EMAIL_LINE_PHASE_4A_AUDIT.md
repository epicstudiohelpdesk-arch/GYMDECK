# GYMDECK EMAIL LINE: PHASE 4A PRE-IMPLEMENTATION AUDIT

**Date:** November 21, 2026  
**Auditor / Engineer:** Principal Infrastructure Architect, Senior Backend Engineer, Application Security Engineer  
**Scope:** Phase 4A (Pre-Implementation Audit of Postal v3.4.0, Docker environment, API contracts, Network diagnostics & Domain readiness)  
**Deliverable File:** `EMAIL_LINE_PHASE_4A_AUDIT.md`  

---

## 1. Executive Summary & Architectural Findings

A thorough, ground-truth audit of `/Users/subhamdas/Documents/postal-main` (Postal v3.4.0 release), Docker on macOS Apple Silicon, network topology, and the domain `epic-studio.in` was conducted before creating infrastructure files or modifying configurations.

### Key Audit Findings:
1. **Postal API v1 Contract Confirmed:**
   - Postal v3.4.0 routes in `config/routes.rb` map `/api/v1/messages/message` to `LegacyAPI::MessagesController#message`.
   - Authentication is strictly performed via `X-Server-API-Key` HTTP header.
   - Lookups require an **integer message ID** (`id` parameter) and accept `_expansions: ['status', 'details', 'deliveries']`.
   - Postal API returns HTTP 200 with `{ status: "success", data: { id, token, status: { ... }, details: { ... } } }` on success, or `{ status: "error", data: { code: "MessageNotFound" } }` on missing ID.
   - **Conclusion:** GymDeck's `postalClient.getMessage(id)` implementation is 100% compliant with the official v3.4.0 Ruby controller contract.

2. **Webhook Provider Message ID Contract:**
   - In Postal v3.4.0, message IDs are MySQL/MariaDB `AUTO_INCREMENT` integers (`int(11)` in `02_create_messages.rb`).
   - Standard delivery webhooks (`MessageSent`, `MessageDelayed`, etc.) provide `{ payload: { message: { id: <int>, to: "...", token: "..." } } }`.
   - Bounce webhooks (`MessageBounced`) provide `{ payload: { original_message: { id: <int>, to: "..." }, bounce: { ... } } }`.
   - **Remediation implemented in Phase 4A:** Enforced strict numeric validation (`/^\d+$/` or positive integer). Malformed or non-numeric provider IDs are rejected immediately, and fallback to recipient-email matching is strictly prohibited to maintain tenant isolation.

3. **Docker Environment & Apple Silicon (ARM64) Compatibility:**
   - Host environment: macOS on Apple Silicon (M-series, ARM64, 8 GB unified memory).
   - Docker Desktop version: 29.8.0.
   - **Container Image Analysis:**
     - `ghcr.io/postalserver/postal:3.4.0` official container manifest is **`linux/amd64` only** (built via GitHub Actions in `ci.yml`).
     - MariaDB official images (`mariadb:10.11`) have native multi-arch manifests (`linux/arm64` and `linux/amd64`).
     - **Implication:** The Postal container runs on Apple Silicon under Docker Desktop's built-in Rosetta 2 / QEMU `linux/amd64` emulation (`platform: linux/amd64`). Emulation overhead requires careful memory budgeting (capping containers at ~1.5 GB total) on an 8 GB host.
   - Alternatively, Postal can be built natively from the local Dockerfile (`docker build -t postal:3.4.0-arm64 /Users/subhamdas/Documents/postal-main`), which compiles natively for ARM64.

4. **Network & Direct SMTP Diagnostics (Preliminary):**
   - **Public IP:** `115.187.46.54` (ISP: Alliance Broadband, India).
   - **Outbound Port 25:** **Open!** Connection to `smtp.gmail.com:25` succeeded (`Connection to smtp.gmail.com port 25 [tcp/smtp] succeeded!`).
   - **PTR / Reverse DNS:** Resolves to generic residential/broadband hostname: `node-115-187-46-54.alliancebroadband.in`.
   - **Reputation / Blacklist Status:** Public IP is listed on **Spamhaus PBL** (`127.0.0.11`, Policy Block List: residential IP ranges not delegated to run direct outbound mail transfer agents).
   - **Critical Deliverability Finding:** Major receiving MTAs (Google Workspace, Microsoft 365, Yahoo) will reject direct SMTP connections originating from Spamhaus PBL residential ranges regardless of SPF/DKIM alignment. Direct SMTP delivery can be tested locally, but production/staging external mailbox delivery will require an authorized relay or a static cloud IP with PTR records.

5. **Sender Domain Readiness (`epic-studio.in`):**
   - Active MX: Google Workspace (`aspmx.l.google.com`, `alt1.aspmx.l.google.com`).
   - Active SPF: `v=spf1 include:dc-aa8e722993._spfm.epic-studio.in ~all` (resolves to `include:_spf.google.com ~all`).
   - Active DMARC: `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`.
   - **Proposed Subdomain:** `notifications@mail.epic-studio.in`. Using the subdomain `mail.epic-studio.in` isolates Postal from the root domain's Google Workspace MX and SPF records, avoiding any collision or delivery disruption to existing Google Workspace mailboxes.

---

## 2. Postal v3.4.0 API Deep Dive

### Message Details Endpoint Contract
- **Method:** `POST` (also accepts `GET` / `PUT` / `PATCH`).
- **Path:** `/api/v1/messages/message`
- **Required Header:** `X-Server-API-Key: <server_api_credential_key>`
- **Request Body (`application/json`):**
  ```json
  {
    "id": 100001,
    "_expansions": ["status", "details", "inspection", "plain_body", "html_body", "headers", "activity_entries"]
  }
  ```
- **Controller Logic (`LegacyAPI::MessagesController`):**
  ```ruby
  def find_message
    id = api_params["id"]
    if id.blank?
      render_parameter_error "`id` parameter is required but is missing"
      return
    end
    unless id.is_a?(String) || id.is_a?(Integer)
      render_parameter_error "`id` parameter must be a string or integer"
      return
    end
    @current_credential.server.message(id.to_i)
  end
  ```
- **Available Delivery Telemetry Returned:**
  - `status.status`: `Sent`, `Delivered`, `SoftFail`, `HardFail`, `Held`, `Bounced`.
  - `status.last_delivery_attempt`: Unix timestamp float.
  - `status.held`: Boolean.
  - `details.rcpt_to`, `details.mail_from`, `details.message_id`, `details.size`, `details.received_with_ssl`.
  - `deliveries`: An array of delivery attempts with `status`, `details`, `output` (SMTP banner/transcript), and `sent_with_ssl`.

### Message Send Endpoint Contract
- **Method:** `POST`
- **Path:** `/api/v1/send/message`
- **Required Header:** `X-Server-API-Key: <server_api_credential_key>`
- **Request Body:**
  ```json
  {
    "to": ["member@example.com"],
    "from": "GymDeck <notifications@mail.epic-studio.in>",
    "subject": "Membership Update",
    "plain_body": "...",
    "html_body": "<p>...</p>",
    "tag": "gym_<uuid>",
    "headers": {
      "X-GymDeck-Tenant": "<uuid>",
      "X-GymDeck-Message-Id": "<uuid>",
      "X-GymDeck-Attempt-Id": "<uuid>"
    }
  }
  ```
- **Response Schema:**
  ```json
  {
    "status": "success",
    "time": 0.042,
    "flags": {},
    "data": {
      "message_id": "abc123xyz@mail.epic-studio.in",
      "messages": {
        "member@example.com": {
          "id": 100001,
          "token": "tok_abcdef123456"
        }
      }
    }
  }
  ```

---

## 3. Provider ID Parsing & Webhook Ingestion Audit

In `backend/services/email/webhookService.ts`, the parsing logic was audited:
```typescript
const messageObj = eventData.message || (eventData as any).original_message;

// Reject missing, non-numeric, or malformed provider IDs explicitly per Postal v3.4.0 contract
const rawId = messageObj?.id;
const isValidNumericId = typeof rawId === 'number' 
  ? !isNaN(rawId) && rawId > 0 
  : (typeof rawId === 'string' && /^\d+$/.test(rawId));
const providerMessageId = isValidNumericId ? String(rawId) : null;
const recipientEmail = messageObj?.to;

if (!providerMessageId) {
  logger.warn('[postalWebhook] Malformed or missing Postal v3.4.0 provider message ID. Fallback by email rejected for security.', {
    uuid,
    rawId,
    recipientEmail,
  });
  return;
}
```
**Safety Analysis:**
- Any non-numeric string or `NaN` is rejected outright.
- No fallback by recipient email is permitted.
- Cross-tenant record leakage is prevented because recipient rows are identified strictly via the indexed `provider_message_id`.

---

## 4. Docker Architecture for Local Postal Deployment (Phase 4B Plan)

Directory: `infrastructure/email-staging/`

### Container Services Planned:
1. **`mariadb` (MariaDB 10.11 LTS):**
   - Native `linux/arm64` container image.
   - Pinned image: `mariadb:10.11.10`.
   - Private network only; no host port binding (internal port 3306 accessible only to Postal).
   - Dedicated persistent volume: `postal-mariadb-data`.
2. **`postal-web` (Postal v3.4.0 Web Server & API):**
   - Runs `postal web` on internal port 5000.
   - Bound locally to `127.0.0.1:5000` (Management Web UI & REST API).
   - Shared config volume: `./config:/config`.
3. **`postal-smtp` (Postal v3.4.0 SMTP Server):**
   - Runs `postal smtp` on port 25.
   - Bound locally to `127.0.0.1:2525` (to avoid privileged port conflicts or root requirements on macOS).
4. **`postal-worker` (Postal v3.4.0 Background Delivery Engine):**
   - Runs `postal worker` (processes outbound delivery queues, connects to remote MTAs on port 25, emits webhooks).
5. **Resource & Memory Footprint:**
   - MariaDB: ~250 MB RAM (`innodb_buffer_pool_size = 128M`).
   - Postal Web + Worker + SMTP: ~600 MB RAM total.
   - Total deployment footprint: ~850 MB, safely well within the 8 GB Mac memory envelope.

---

## 5. Network & Deliverability Pre-Check

| Diagnostic Check | Observed Value | Status | Implication |
| :--- | :--- | :---: | :--- |
| **Local Docker Engine** | Docker 29.8.0 Running | **PASS** | Ready to orchestrate containers |
| **Outbound Port 25** | Connection to `smtp.gmail.com:25` succeeded | **PASS** | Direct SMTP packets leave the Mac |
| **Public IP Address** | `115.187.46.54` (Alliance Broadband) | **PASS** | External connectivity active |
| **Reverse DNS (PTR)** | `node-115-187-46-54.alliancebroadband.in` | **WARN** | Does not match sending domain |
| **Spamhaus PBL** | Listed on PBL (`127.0.0.11`) | **BLOCKER FOR DIRECT EXTERNAL DELIVERY** | Gmail / Microsoft will reject mail from residential IPs |
| **Root Domain SPF/DMARC** | Google Workspace active, DMARC `p=quarantine` | **PASS** | Subdomain `mail.epic-studio.in` required |

---

## 6. Phase 4A Sign-Off & Recommendations

1. **Proceed to Phase 4B:** Build the isolated Docker Compose stack in `infrastructure/email-staging/` using pinned images and dedicated volumes.
2. **Subdomain Isolation:** Configure Postal to use `mail.epic-studio.in` to avoid altering or interfering with `epic-studio.in` root Google Workspace mailboxes.
3. **Controlled Delivery Testing:** Acknowledge that while direct SMTP port 25 is unblocked locally, Spamhaus PBL listing on residential broadband means major providers (Gmail/Outlook) will drop or soft-bounce direct SMTP packets unless sent to an internal/permissive test SMTP receiver. Live testing must strictly use an authorized test address with full awareness of this network characteristic.
