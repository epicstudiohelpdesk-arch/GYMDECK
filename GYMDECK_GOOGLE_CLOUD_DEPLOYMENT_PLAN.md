# GymDeck — Google Cloud VPS Deployment Preparation Plan

**Document status:** AUDIT + PLAN ONLY — NOT A DEPLOYMENT AUTHORIZATION

**Repository audited:** `https://github.com/epicstudiohelpdesk-arch/GymDeck` (local tree `/Users/subhamdas/Documents/GYMDECK`)
**Audit date:** 2026-11-22
**Branch:** `main` at `eaa4203`. Three pre-existing modified frontend files (`frontend/DashboardWidgets.jsx`, `frontend/index.html`, `frontend/script.js`) were left untouched.
**Target host (candidate):** `api.epic-studio.in`
**Target VM:** Google Compute Engine `e2-standard-2` (2 vCPU / 8 GB RAM), Ubuntu 24.04 LTS

---

## 0. READINESS VERDICT — READ THIS FIRST

**GymDeck is NOT verified as deployment-ready for the target Google Cloud VPS.**

This document is the result of a read-only source/configuration audit. No GCP resources were provisioned; no DNS was changed; no database was migrated or deleted; no production configuration was modified; no real email or WhatsApp message was sent; no credentials, tokens, session files, or private member data were accessed or disclosed; nothing was committed or pushed; the local development environment was not replaced.

The verdict is **NOT READY** because (full list in §19):

- No live cloud deployment has ever been executed. Repository documentation stops at `INFRASTRUCTURE NOT DEPLOYED`, `cloud provider credentials not injected`, and `PRODUCTION CONDITIONALLY READY`.
- The candidate API hostname `api.epic-studio.in` **does not exist anywhere in the repository**. Every existing API setting targets `api.gymdeck.com` / `staging-api.gymdeck.com`. `epic-studio.in` exists only as the **email sending domain** (`mail.epic-studio.in`).
- The production compose defines only `postgres`, `backend`, `openwa`. There is **no nginx service, no TLS/certbot service, and no Email Line (Brevo/Postal) service** in it.
- PostgreSQL migration is ambiguous: two competing mechanisms, no Drizzle journal/meta directory, and the custom bootstrap runner is called only from tests.
- OpenWA is pinned to **v0.30.3 by vendored source tree only** — no image tag or digest — and its vendored `CHANGELOG.md` contains post-0.30.3 `[Unreleased]` changes. Exact provenance of the built image must be fixed before deployment.
- Multiple dev-only defaults silently remain valid in production because fail-closed validation covers only some of them.
- A real WhatsApp QR scan/live send and a confirmed Brevo inbox delivery have never been performed.
- GCP blocks outbound SMTP port 25 by default; Postal-as-sender from this VM is not viable without a relay.

**This plan describes a proposed target design, not a validated configuration.** Every "acceptance test" in §18 is a gate that must actually be executed and passed before anyone may claim readiness.

---

## 1. EXACT DEPLOYMENT ARCHITECTURE (PROPOSED)

### 1.1 Topology

```
Internet
   |
   | TCP 80/443 (only publicly exposed ports)
   v
[ nginx + certbot ]  -- Docker network: gymdeck_ingress
   |  reverse proxy / TLS termination / rate limiting
   v
[ backend ]  -- Express gateway :8080 (internal only)
   |-- in-process workers: email outbox, WhatsApp queue, communication retention
   |
   +--> [ postgres:16-alpine ] :5432  -- network: gymdeck_internal ONLY
   +--> [ openwa v0.30.3 ] :2785 (internal only)
   |       |-- SQLite: openwa.sqlite, main.sqlite
   |       |-- session auth dirs: /app/data/sessions/session-<sessionId>
   |       |-- media: /app/data/media
   |       `-- one headless Chromium process per active gym session
   +--> Brevo REST API  https://api.brevo.com/v3  (HTTPS, outbound)
   +--> Brevo webhook   inbound POST /v1/webhooks/brevo (public HTTPS)
   +--> Postal (rollback): external/relay endpoint only; NOT self-hosted outbound SMTP on GCP
   +--> Cloudflare R2 / S3 (document storage, existing integration)
   +--> Resend (legacy auth email only), Expo (push only)
```

### 1.2 Persistence model

| Data | Store | Volume / location | Notes |
|---|---|---|---|
| GymDeck tenant + messaging + email data | PostgreSQL 16 | `postgres_prod_data` named volume | Never published to host |
| OpenWA sessions, SQLite state, media | Filesystem + SQLite inside OpenWA | `openwa_prod_data` named volume (`/app/data`) | Must be backed up with the DB; contains WhatsApp auth state |
| TLS certificates | Let's Encrypt / certbot | host or named volume `/etc/letsencrypt` | Renewal job required |
| Application/encrypted DB backups | Encrypted `.dump.enc` | `/var/backups/gymdeck` + off-VM copy | Script exists; scheduler does not |
| Document vault | Cloudflare R2 / S3 (existing) | external | `STORAGE_*` env vars gate live vs dev provider |

### 1.3 Key preservation requirements

- Multi-tenant gym identity remains derived **server-side** from verified JWT `gymId` (`backend/shared/security/crypto.ts`, `gateway/src/middleware/authMiddleware.ts`); routes never trust client-supplied gym IDs. Webhooks resolve the tenant from stored OpenWA session ID / provider instance, never from the request body.
- Tenant isolation is **application-layer compound scoping** (`WHERE gym_id = ...`), **not PostgreSQL RLS**. Any new query must preserve this; there is no database-level safety net.
- Existing outbox, quota, dispatch attempt, provider snapshot, webhook event/quarantine tables and migrations `0000`–`0010` must be preserved unchanged in order.
- Brevo is the intended primary provider; **Postal remains the rollback path** via `EMAIL_DELIVERY_PROVIDER=postal`. Provider is pinned per job on first attempt — switching the env var affects only newly enqueued jobs.
- OpenWA stays at **v0.30.3**. GymDeck sends `linkPreview`, which requires ≥ 0.30.3; downgrading breaks message creation and sends.
- Tauri desktop continues to use Rust IPC (`cloud_communications_request_command`) so tokens stay out of JavaScript and the OS Keychain keeps refresh tokens.

---

## 2. AUDIT INVENTORY — SERVICES, WORKERS, DATABASE, MIGRATIONS, ENV VARS, INTEGRATIONS

### 2.1 Services and entrypoints

| Item | Fact | Source |
|---|---|---|
| Backend gateway | Single Express + WebSocket Node process, `node dist/gateway/src/server.js`. Listens `config.PORT` (default 3001; compose sets 8080) on `0.0.0.0`. WS upgrade only for `/v1/cctv/signaling`. | `backend/gateway/src/server.ts:19-55`; `backend/package.json:6-11` |
| Route mounts | `/health`, `/v1/payments`, `/v1/cctv`, `/v1/owner/email`, `/v1/auth`, `/v1/member`, `/v1/owner`, `/v1/sync`, `/v1/webhooks` | `backend/gateway/src/routes/index.ts:16-39` |
| Webhooks | `POST /v1/webhooks/openwa`, `/postal`, `/brevo` (HMAC/token auth). Legacy aliases under `/v1/owner/email/webhooks/*`. | `backend/gateway/src/routes/webhooks.ts:25,46,72`; `routes/email.ts:54-87` |
| Health | `GET /health` (liveness, always 200), `GET /ready` (DB `SELECT 1`; in `development` reports ready even if DB down), `GET /v1/cctv/health` (static). | `routes/health.ts:13-73`; `routes/cctv.ts:369-380` |
| Workers process | `backend/workers/src/index.ts` only exports a name — no listener, no npm script. All active workers are in-process timers started by `server.ts`. | `server.ts:45-52` |
| OpenWA | Separate container built from vendored `services/openwa`, port 2785 inside Docker, never published to host. | `docker-compose.prod.yml:87-134` |
| PostgreSQL | `postgres:16-alpine` container, internal Docker network only. | `docker-compose.prod.yml:7-37` |
| nginx / certbot | Config exists at `infrastructure/nginx/nginx.conf`; no container, no compose service, no renewal job. Deployment mechanism unknown. | `nginx.conf:1-120` |
| Desktop app | Tauri v2, `com.gymdeck.desktop`, ~90 IPC commands, SQLCipher local vault, `keyring` v3.0.4. | `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs:225-305`, `Cargo.toml:45` |

### 2.2 Workers (all in-process timers in the gateway)

| Worker | File | Schedule / concurrency |
|---|---|---|
| Communication retention | `backend/services/communications/retentionWorker.ts` | First tick 60 s, then every 6 h; purges expired broadcast audit rows (90-day TTL). No env config. |
| WhatsApp queue | `backend/services/whatsapp/worker.ts`, `queueProcessor.ts` | Boot `recoverStale()`, then `setInterval` default 15 000 ms; batch 25; 120 s lease; stale recovery + 7-day expiry; automation rules every 5 ticks. |
| Email outbox | `backend/services/email/deliveryWorker.ts` | `setInterval` default 5000 ms; batch 25; 5 min lease with heartbeat ~100 s; provider-snapshot pinning; ambiguous outcomes become `RECONCILIATION_REQUIRED`, never auto-resend. |
| Notification external delivery | `backend/services/notifications/deliveryWorker.ts` | Has `start()` but **no production caller**; only tests invoke `processPendingDeliveries()`. |
| Domain event bus | `backend/services/notifications/domainEventBus.ts` | `processPendingEvents()` called only by tests; no scheduler. |
| Rate-limit / check-in nonce cleanup | `shared/security/rateLimiter.ts`, `services/member/checkInPassService.ts` | In-memory `setInterval(..., 300000).unref()` — per-process only. |

**Deployment consequence:** with one backend process, all workers run once. If `deploy.replicas: 2` were ever enacted (Swarm), two processes would run all workers. DB leases make double-processing mostly safe, but in-memory rate limiters and nonce sets are per-process and would diverge. On a single VPS, run **one backend replica**.

### 2.3 Database and migrations

- Driver `pg` + `drizzle-orm/node-postgres`, lazy singleton pool (`backend/shared/database/index.ts:14-42`), pool min 2 / max 10, `statement_timeout` and `query_timeout` both 10 s.
- TLS: `ssl: { rejectUnauthorized: false }` **only when `NODE_ENV=production`** — encrypted but unverified. For a same-Docker-network connection this is low risk, but it should be noted in the security review.
- Two competing migration mechanisms:
  1. `drizzle-kit generate` / `drizzle-kit migrate` (`backend/package.json:12-13`, `backend/drizzle.config.ts`). **No `meta/_journal.json` directory exists**, so `drizzle-kit migrate` behavior is unverified.
  2. `bootstrapDatabaseSchema()` (`backend/shared/database/bootstrap.ts:7-674`) executes inline DDL plus SQL files `0002`–`0010` (`:676-793`). It is called **only from tests**; `0000_initial_domain_schema.sql` and `0001_communication_mode_a.sql` are **not** in its explicit file list.
- Migration files in `backend/shared/database/migrations/`: `0000` base multi-tenant schema, `0001` communication consent flags, `0002` payments v2, `0003` CCTV, `0004` check-in QR, `0005` legacy WhatsApp, `0006` OpenWA columns, `0007` email system, `0008` dispatch attempts/leases, `0009` provider instance scoping, `0010` provider abstraction (Brevo snapshots).
- `0010` is applied unconditionally by bootstrap despite its header saying "applied ONLY when `EMAIL_DELIVERY_PROVIDER=brevo` on staging" — a doc/code mismatch that must be resolved before migration.
- `drizzle.config.ts:11` and the default `DATABASE_URL` both fall back to `localhost:5432`.

### 2.4 Environment variables (complete inventory)

Authoritative schema: `backend/shared/config/index.ts`. Production fail-closed rules: `:127-225`. Parsed at `:241-249` — invalid config throws and the process exits.

**Runtime / infra:** `NODE_ENV` (default `development`), `PORT` (3001), `HOST` (0.0.0.0), `CORS_ORIGINS` (`*`; forbidden in production), `DATABASE_URL` (dev localhost), `DATABASE_POOL_MIN` (2), `DATABASE_POOL_MAX` (10), `JWT_SECRET` (dev default; production needs ≥32 chars, non-dev), `JWT_ACCESS_EXPIRATION_SECONDS` (900), `JWT_REFRESH_EXPIRATION_SECONDS` (604800).

**Legacy auth email / push:** `RESEND_API_KEY` (dev placeholder), `RESEND_FROM_EMAIL` (`auth@notifications.gymdeck.com`), `EXPO_ACCESS_TOKEN` (none), `EXPO_PUSH_API_URL` (`https://exp.host/--/api/v2/push/send`).

**WhatsApp / OpenWA:** `WHATSAPP_PROVIDER` (`openwa`), `OPENWA_API_URL` (`http://127.0.0.1:2785/api`), `OPENWA_API_KEY` (dev default; production ≥16 chars), `OPENWA_WEBHOOK_SECRET` (dev default; production ≥16 chars), `OPENWA_WEBHOOK_URL` (`http://127.0.0.1:3001/v1/webhooks/openwa`), `OPENWA_REQUEST_TIMEOUT_MS` (30000), `OPENWA_SESSION_PREFIX` (`gymdeck`), `OPENWA_ENGINE` (`whatsapp-web.js`), `WHATSAPP_DEFAULT_COUNTRY_CODE` (91), `WHATSAPP_MAX_SENDS_PER_HOUR` (200), `WHATSAPP_QUEUE_BATCH_SIZE` (25), `WHATSAPP_WORKER_INTERVAL_MS` (15000), `WHATSAPP_TEST_RECIPIENT` (empty).

**Legacy Meta WhatsApp (read-only legacy rows):** `WHATSAPP_API_URL` (`https://graph.facebook.com/v22.0`), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (all dev defaults).

**Email Line (Postal):** `POSTAL_API_URL` (`http://127.0.0.1:5000/api/v1`), `POSTAL_SERVER_API_KEY` (dev default), `POSTAL_WEBHOOK_KEY` (dev default), `POSTAL_SIGNING_PUBLIC_KEY`, `POSTAL_SIGNING_KEY_ID`, `POSTAL_AUTHORIZED_PUBLIC_KEYS`, `POSTAL_ALLOW_LEGACY_SHA1` (false), `POSTAL_FROM_DOMAIN` (`mail.epic-studio.in`), `POSTAL_DEFAULT_FROM_NAME` (`GymDeck`), `POSTAL_DEFAULT_FROM_EMAIL` (`notifications@mail.epic-studio.in`), `POSTAL_DELIVERY_MODE` (`mock`), `POSTAL_INSTANCE_ID` (read directly via `process.env`, default `default`; not in Zod schema).

**Email Line (Brevo / shared):** `EMAIL_DELIVERY_PROVIDER` (`postal`), `BREVO_DELIVERY_MODE` (`sandbox` — note: `sandbox` takes the live HTTP path; only `mock` is a real short-circuit), `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_WEBHOOK_SECRET`, `EMAIL_MONTHLY_QUOTA_DEFAULT` (300), `EMAIL_WORKER_INTERVAL_MS` (5000), `EMAIL_BATCH_SIZE` (25), `EMAIL_STAGING_LIVE_TEST_ENABLED` (false; **declared but not enforced in code**), `EMAIL_STAGING_AUTHORIZED_RECIPIENTS` (empty; unused), `EMAIL_STAGING_DAILY_LIMIT` (10; unused).

**Other direct `process.env` reads:** `COMMUNICATION_TIMEZONE` (`Asia/Kolkata`), `STORAGE_ENDPOINT` (`https://vault.r2.cloudflarestorage.com`), `STORAGE_BUCKET`, `STORAGE_SECRET_KEY` (dev `dev_secret`), `STORAGE_ACCESS_KEY` (gates live S3 provider), `PAYMENT_ENCRYPTION_KEY` (throws in production if missing), `TURN_SHARED_SECRET`, `TURN_SERVER_HOST`, `STUN_SERVER`.

**Test-only:** `RUN_WHATSAPP_INTEGRATION`, `OPENWA_TEST_SESSION_ID`, `WHATSAPP_TEST_ALLOW_SEND`, `WHATSAPP_TEST_BODY`, `RUN_WHATSAPP_DB_TESTS`, `ARTIFACT_DIR`.

**Template gaps:** `backend/.env.example` omits all Postal, Email worker/quota/staging, Brevo webhook, storage, encryption and TURN variables. `backend/.dockerignore` excludes `.env.*`, which also excludes `.env.example` from the backend image build context (fine, but note it).

### 2.5 External integrations inventory

| Integration | Purpose | Endpoint / config | Production requirement |
|---|---|---|---|
| PostgreSQL | Tenant + messaging + email storage | internal `postgres:5432` | Internal Docker network only |
| OpenWA v0.30.3 | WhatsApp gateway | `http://openwa:2785/api`, header `X-API-Key` | Internal Docker DNS; no public port |
| Brevo | Transactional email (primary) | `https://api.brevo.com/v3/smtp/email`, header `api-key`; webhook `POST /v1/webhooks/brevo` | HTTPS hardcoded; public HTTPS webhook + secret header |
| Postal | Transactional email (rollback) | `POSTAL_API_URL`, header `X-Server-API-Key`; webhook `POST /v1/webhooks/postal` | RSA-signed webhooks required in staging/prod; **GCP outbound port 25 blocked** |
| Resend | Legacy auth email only | `https://api.resend.com/emails` | Only if `NOTIFICATION_PROVIDER_MODE=live` |
| Expo / APNs | Push notifications | `https://exp.host/--/api/v2/push/send` | `EXPO_ACCESS_TOKEN` for live |
| Cloudflare R2 / S3 | Private document vault | `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY` | Live provider gated on production + access key |
| nginx / Let's Encrypt | TLS ingress | `/etc/letsencrypt/live/<host>/...` | Must be created; not in compose |
| Google Workspace | Existing root mail for `epic-studio.in` | Root MX/SPF/DMARC | Do not modify |

---

## 3. LOCALHOST URLS AND DEVELOPMENT-ONLY SETTINGS TO REPLACE

Every item below is a **candidate** change. No value is applied by this plan.

| Current value | Location | Production target |
|---|---|---|
| `postgresql://...@localhost:5432/gymdeck_cloud` | `backend/shared/config/index.ts:19`, `backend/drizzle.config.ts:11`, `backend/.env.example` | `postgres://...@postgres:5432/<db>` (Docker DNS) |
| `http://127.0.0.1:2785/api` | `config/index.ts:48`, `backend/.env.example` | `http://openwa:2785/api` (already in prod compose) |
| `http://127.0.0.1:3001/v1/webhooks/openwa` | `config/index.ts:60`, `backend/.env.example` | `http://backend:8080/v1/webhooks/openwa` (already in prod compose) |
| `http://127.0.0.1:5000/api/v1` | `config/index.ts:66` | `POSTAL_API_URL` for relay/external Postal (never loopback) |
| `Host: localhost:5000` hardcoded HTTP header | `backend/services/email/postalClient.ts:143,223` | **Must be removed/made configurable** or it will break non-local Postal routing/TLS |
| `PORT=3001` template vs `PORT=8080` compose | `backend/.env.example:13` vs `docker-compose.prod.yml:53` | Standardize on 8080 inside Docker; keep 3001 only for local dev |
| `CORS_ORIGINS=*` | `config/index.ts:25` | Explicit desktop/web staging + production origins (production validation rejects `*`) |
| `POSTAL_DELIVERY_MODE=mock`, `BREVO_DELIVERY_MODE=sandbox` | `config/index.ts:81,87` | `live` when authorized; never rely on default |
| Dev `OPENWA_API_KEY` / `OPENWA_WEBHOOK_SECRET` | `config/index.ts:49,50-53` | Strong ≥16-char non-dev values (production validation enforces) |
| Dev JWT / DB / storage encryption secrets | `config/index.ts:18-19`, `storageProvider.ts:37`, `fieldEncryption.ts:10-23` | Strong secrets from secret manager |
| `http://localhost:3001` browser fallback (4 API clients) | `frontend/emailApi.js:9-12`, `whatsappApi.js:9-12`, `communicationsApi.js:7-10`, `paymentsV2Api.js:14-17` | Keep for local dev; desktop uses Rust IPC so production is unaffected. Browser dev mode needs explicit `localStorage.gymdeck_cloud_url` |
| `http://127.0.0.1:3001` Rust fallback | `src-tauri/src/commands/cloud_enroll_commands.rs:60`, `auth_commands.rs:119-120,210-211`, `lib.rs:188` | Set `GYMDECK_CLOUD_URL=https://api.epic-studio.in` on shipped apps (no repo mechanism exists) |
| `http://localhost:8080` sync worker fallback | `src-tauri/src/sync/worker.rs:105` | Same |
| `api.gymdeck.com` nginx `server_name` + cert paths | `infrastructure/nginx/nginx.conf:53,68,71-72` | `api.epic-studio.in` (candidate hostname) |
| `api.gymdeck.com` in scripts/docs/mobile configs | `rollback.sh:13,17`, `production-deployment-guide.md`, mobile `config/index.ts`, `.env.example:14` | New hostname decision required |
| `https://gymdeck.app/checkin` | `src-tauri/.../gym_qr_repo.rs:31`, `gym_qr_sync.rs:46` | Product decision — out of scope unless check-in QR must move |
| `http://127.0.0.1:49152` CCTV gateway | `frontend/CCTV.jsx:67-68`, edge gateway service | Unchanged — local edge device, not VPS |

---

## 4. OPENWA v0.30.3 — EXACT COMPATIBLE DEPLOYMENT APPROACH

### 4.1 Version verification (from source)

| Evidence | Exact value |
|---|---|
| `services/openwa/package.json:2-3` | `"name": "openwa"`, `"version": "0.30.3"` |
| `services/openwa/package-lock.json:2-3,7-9` | `0.30.3` |
| `services/openwa/openapi.json:18594-18597` | OpenAPI `version: 0.30.3` |
| `services/openwa/charts/openwa/Chart.yaml:5-6` | chart `0.1.33`, `appVersion: '0.30.3'` |
| `services/openwa/CHANGELOG.md:95` | `## [0.30.3] - 2026-11-16` |
| `docs/whatsapp/OPENWA_REAL_WORLD_TEST_REPORT.md:6` | `OpenWA v0.30.3 on port 2785` |

**Do not upgrade.** GymDeck calls `POST /api/sessions` with `config: { linkPreview: false }` (`openwaClient.ts:194-199`) and sends `linkPreview: false` (`:321`). Upstream SDK docs state this key requires **OpenWA ≥ 0.30.3** (`services/openwa/sdk/*/README.md:3`; `src/common/sdk-docs-server-contract.spec.ts:33-35`). A downgrade returns HTTP 400 and silently stores the key unread.

### 4.2 Provenance hazard — must fix before deployment

- Compose builds from `build.context: ../../services/openwa` (`docker-compose.prod.yml:91-93`) — **no image tag or digest is pinned**.
- The vendored `services/openwa/CHANGELOG.md:8` has an `[Unreleased]` section with post-0.30.3 changes (e.g. `whatsapp-web.js` 1.34.8, Puppeteer 25.17.0, Chrome 156→157) while `package.json`/`openapi.json` still read 0.30.3. The source tree may not be a pristine 0.30.3 release.
- Required action (plan only): resolve the exact commit for the 0.30.3 release, verify version strings agree, build once, record the **image digest**, deploy by digest rather than `latest`.
- Do not change `ENGINE_TYPE`; it must stay `whatsapp-web.js` to match the integration and existing session auth directories.

### 4.3 Exact deployment approach (from `docker-compose.prod.yml:87-134`)

```yaml
openwa:
  build:
    context: ../../services/openwa      # keep; pin resulting digest on the VM
  restart: always
  environment:
    NODE_ENV: production
    PORT: 2785
    DATABASE_TYPE: sqlite
    DATABASE_NAME: /app/data/openwa.sqlite
    MAIN_DATABASE_NAME: /app/data/main.sqlite
    DATABASE_SYNCHRONIZE: "false"
    MAIN_DATABASE_SYNCHRONIZE: "false"
    ENGINE_TYPE: whatsapp-web.js
    SESSION_DATA_PATH: /app/data/sessions
    STORAGE_TYPE: local
    STORAGE_LOCAL_PATH: /app/data/media
    REDIS_ENABLED: "false"
    QUEUE_ENABLED: "false"
    CACHE_ENABLED: "false"
    AUTO_START_SESSIONS: "true"
    PUPPETEER_HEADLESS: "true"
    PUPPETEER_ARGS: --no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu
    API_MASTER_KEY: ${OPENWA_API_KEY:?FATAL}
    WEBHOOK_SSRF_PROTECT: "true"
    SSRF_ALLOWED_HOSTS: backend
  volumes:
    - openwa_prod_data:/app/data
  networks: [gymdeck_internal, gymdeck_ingress]
```

- No `ports:` — OpenWA must never be publicly reachable. Reachable from backend only as `http://openwa:2785/api`.
- Backend → OpenWA auth header is `X-API-Key: $OPENWA_API_KEY` (`openwaClient.ts:71`); the same value is `API_MASTER_KEY` in OpenWA.
- Webhook callback stays **internal**: `OPENWA_WEBHOOK_URL=http://backend:8080/v1/webhooks/openwa`, signed with `X-OpenWA-Signature: sha256=<hex>` using `OPENWA_WEBHOOK_SECRET`, verified with `timingSafeEqual` (`openwaWebhookProcessor.ts:41-52`, `signature.ts:15-36`).
- Subscribe events: `message.received`, `message.sent`, `message.ack`, `message.failed`, `session.status` (`accountService.ts:22-28`).
- Add `stop_grace_period: 75s` to the compose service (present in upstream `services/openwa/docker-compose.yml:50`, missing in GymDeck compose) so Chromium can flush session state on `docker compose down`/restart.
- Build-time patchers must be preserved: `services/openwa/Dockerfile:190-240` applies `patch-wwebjs-*` / `patch-baileys-*` scripts; a spec fails if a patcher is added without being copied/run. Any rebuild must keep this step intact.
- Chromium is pinned in the Dockerfile to `chrome@157.0.8103.78` on amd64 (`:262-287`). **Rolling back across a Chrome major requires restoring `sessions/` from a backup taken before first start on the newer image**, because older Chrome deletes the IndexedDB holding whatsapp-web.js logins (`CHANGELOG.md:89`, `docs/14-migration-guide.md:918`).
- Upstream states `replicaCount` MUST remain 1 (process-local API keys, SQLite audit, reconnect timers, in-flight batches). GymDeck compose correctly sets `replicas: 1` (Swarm syntax; with plain `docker compose up` it is inert but the single `container_name` still enforces one instance).

---

## 5. ISOLATED, PERSISTENT WHATSAPP SESSIONS PER GYM + MEMORY SIZING

### 5.1 Current session model (verified)

- `backend/services/whatsapp/accountService.ts:4-7`: "Each gym owns exactly one OpenWA session". Uniqueness enforced by `gym_whatsapp_accounts.gym_id` (`schema/whatsapp.ts:55`) and `openwa_session_id` unique index (migration `0006:12-32`).
- Naming: `sessionNameForGym()` (`:61-68`) produces `<prefix>-<gymId-without-dashes-sliced-to-24>`, default prefix `gymdeck`, e.g. `gymdeck-15a8189e0b2d4f21a5af0792`.
- GymDeck stores `openwa_session_id` (UUID), `openwa_session_name`, `openwa_webhook_id`, `openwa_status` in Postgres. OpenWA stores its own session record in `openwa.sqlite` and auth state on disk.
- Auth directory: `services/openwa/src/engine/auth-dir-paths.ts:18-21` → `<SESSION_DATA_PATH>/session-<sessionId>` for whatsapp-web.js; Baileys uses `<authDir>/<sessionId>`.
- On disconnect, GymDeck calls logout → stop → delete and explicitly documents purging on-disk auth directories (`accountService.ts:403-438,429-430`).
- Webhook tenant resolution uses **session ID only** (`findByOpenWASessionId`, `accountService.ts:468-477`) — never a client-supplied gym ID. This mapping is the critical link that must survive migration.

### 5.2 Isolation design for the VPS

1. Keep **one OpenWA container** (single instance rule). Do not create one container per gym.
2. Keep **one OpenWA session per gym** with the existing naming function unchanged. Do not change `OPENWA_SESSION_PREFIX` after sessions exist — it changes new session names and breaks the stable mapping.
3. Persistence: the entire `/app/data` tree (SQLite files + `sessions/` + `media/`) lives in the single named volume `openwa_prod_data`. Back up the volume and the Postgres DB **together** — they are one logical dataset.
4. Access control: `chmod` the volume so only the `openwa` uid/gid 997 can read session dirs; never copy `session-*` dirs into logs, support tickets, git, or backups that leave the encrypted backup store.
5. Guardrails to add (not currently set by GymDeck compose):
   - `MAX_CONCURRENT_SESSIONS` — OpenWA default is `0` (unlimited) (`services/openwa/src/config/configuration.ts:264-267`). Set an explicit cap (see §5.3).
   - `WWEBJS_AUTH_TIMEOUT_MS` — default 30000; sessions that end `failed` are **not** auto-started by `AUTO_START_SESSIONS=true` (`CHANGELOG.md:90`). Plan a monitored recovery path.
   - `WEBHOOK_TIMEOUT=10000`, `WEBHOOK_RETRY_DELAY=5000` — present in `.env.gymdeck.example:34-35` but not in GymDeck compose; align explicitly.
   - Do NOT set `PUPPETEER_EXECUTABLE_PATH` on the VPS. The host-specific macOS path in local `services/openwa/.env:19` must not be copied. The Docker image sets its own pinned Chrome path (`:287`).

### 5.3 Memory requirements for concurrent sessions

Evidence:
- `services/openwa/.env.example:173-184`: "full Chromium per session"; `OPENWA_MEM_LIMIT=2g` and `OPENWA_PIDS_LIMIT=2048` fit "**~8-10 whatsapp-web.js sessions**" (≈200-250 MB/session including shared browser overhead).
- `services/openwa/docs/03-system-architecture.md:320-327`: SQLite + local storage + no Redis is the "Production (Small)" profile for **1-3 sessions**; 5-10 is "Medium"; 10+ needs Redis/S3/HA.
- GymDeck compose sets `REDIS_ENABLED=false`, `QUEUE_ENABLED=false`, `CACHE_ENABLED=false` — i.e. the "Small/Medium" profile.

Planning figures (estimates — **must be validated by a load test before accepting more than a handful of gyms**):

| Concurrent active sessions | Expected OpenWA RSS | Recommended VM | Action |
|---|---|---|---|
| 1-3 | ~0.5-1.0 GB | e2-standard-2 | Fits current design |
| 4-8 | ~1.0-2.0 GB | e2-standard-2 | Fits with care; set cap at 8 |
| 9-12 | ~2.0-3.0 GB | e2-standard-2 (tight) | Reduce other limits or move to e2-standard-4 |
| >12 | >3 GB | e2-standard-4 (4 vCPU/16 GB) | Required; also revisit Redis/queue/storage profile |

**Recommendation:** on e2-standard-2 set `MAX_CONCURRENT_SESSIONS=8` initially, set the OpenWA container memory limit to ~3 GB (see §7 budget), and alert at 6 active sessions. Each inactive-but-linked session still consumes disk (IndexedDB profile) but not a Chromium process. A restart with `AUTO_START_SESSIONS=true` will attempt to start all linked sessions simultaneously — this is the peak memory moment and must be tested.

**Not verified:** actual production session count, actual per-session RSS on Ubuntu 24.04 with the pinned Chrome 157, and behavior when the cap is reached. These are acceptance gates in §18.

---

## 6. DOCKER COMPOSE DESIGN (PROPOSED — DO NOT APPLY WITHOUT APPROVAL)

### 6.1 Changes required relative to `docker-compose.prod.yml`

| Area | Current | Proposed |
|---|---|---|
| `backend` | `deploy.replicas: 2`, no compose healthcheck | 1 replica (single VM); add healthcheck on `http://127.0.0.1:8080/ready` |
| `backend` env | No Email Line vars at all | Add all `EMAIL_*`, `POSTAL_*`, `BREVO_*`, `PAYMENT_ENCRYPTION_KEY`, `COMMUNICATION_TIMEZONE`, `EXPO_*`, CORS, storage secrets |
| `backend` limits | 1.5 CPU / 2048 MB ×2 | 1.0 CPU / 1536 MB ×1 |
| `postgres` limits | 2.0 CPU / 4096 MB | 1.5 CPU / 2560 MB |
| `openwa` limits | 2.0 CPU / 4096 MB | 1.5 CPU / 3072 MB |
| `openwa` | no `stop_grace_period` | `stop_grace_period: 75s` |
| `nginx` | absent | Add container (or host nginx) on `gymdeck_ingress`, publish 80/443 |
| `certbot` | absent | Add renewal sidecar or host timer; share `/etc/letsencrypt` + `/var/www/certbot` |
| `postal` | absent | **Do not add** — keep as external relay/rollback; GCP blocks outbound 25 |
| `depends_on` | backend waits only for postgres | Optionally require `openwa` healthy before backend starts workers |
| `volumes` | `postgres_prod_data`, `openwa_prod_data` | Add cert volume; keep local driver + off-VM backups |
| `networks` | `gymdeck_internal` (internal), `gymdeck_ingress` (false) | Keep. Postgres only internal; nginx only ingress; backend/openwa on both |

Critical: `gymdeck_internal` has `internal: true`, meaning **no outbound internet**. Only `postgres` belongs there exclusively. `backend` and `openwa` must also be on `gymdeck_ingress` (`internal: false`) or they cannot reach Brevo/Resend/R2/WhatsApp Web.

### 6.2 Proposed service skeleton (illustrative, not applied)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    networks: [gymdeck_internal]
    volumes: [postgres_prod_data:/var/lib/postgresql/data]
    # NO ports: -- never publish 5432
    healthcheck: pg_isready ...

  backend:
    build: { context: ../../backend, dockerfile: ../infrastructure/docker/Dockerfile.backend }
    restart: always
    depends_on: { postgres: { condition: service_healthy } }
    networks: [gymdeck_internal, gymdeck_ingress]
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://127.0.0.1:8080/ready"]
    # NO ports: -- nginx reaches it as backend:8080

  openwa:
    build: { context: ../../services/openwa }
    restart: always
    stop_grace_period: 75s
    volumes: [openwa_prod_data:/app/data]
    networks: [gymdeck_internal, gymdeck_ingress]
    # NO ports:

  nginx:
    image: nginx:1.27-alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot_etc:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    networks: [gymdeck_ingress]
    depends_on: [backend]

  certbot:
    image: certbot/certbot:latest
    # renewal loop (6h) using webroot /var/www/certbot; reload nginx via docker kill -s HUP
    volumes: [certbot_etc, certbot_www]
    networks: [gymdeck_ingress]
```

### 6.3 Health checks and restart policy summary

- PostgreSQL: existing `pg_isready` check (10s/5s/5) — keep.
- Backend: Dockerfile already has `HEALTHCHECK` on `/health` (30s/5s/10s/3); add a compose-level check on `/ready` so nginx/Compose can distinguish DB-connected readiness. Note `/ready` is logged (only `/health` is excluded from access logs).
- OpenWA: image `HEALTHCHECK` on `/api/health/ready` (30s/10s/30s/3) — keep; backend's `openwaClient.ts:152-154` also calls `/api/health/live`.
- All services `restart: always`. Backend handles `SIGTERM`/`SIGINT` gracefully: stops email → WhatsApp → retention workers, closes HTTP server, drains PG pool, forced exit after 10s (`server.ts:58-89`). OpenWA needs the 75s grace period for Chromium session flush.

---

## 7. VM SIZING AND ESTIMATED RESOURCE CONSUMPTION

### 7.1 Problem with current limits

Current prod compose limits sum to **~12.3 GB RAM**: postgres 4096 + backend 2048×2 + openwa 4096. This cannot fit on an 8 GB VM. The limits must be reduced (§6.1) before deployment.

### 7.2 Proposed budget for `e2-standard-2` (2 vCPU / 8 GB)

| Component | CPU limit | Memory limit | Expected steady state |
|---|---|---|---|
| PostgreSQL 16 | 1.5 | 2560 MB | 600 MB - 1.5 GB |
| Backend (1 replica) | 1.0 | 1536 MB | 300 - 600 MB |
| OpenWA (≤8 sessions) | 1.5 | 3072 MB | 1.0 - 2.5 GB |
| nginx + certbot | 0.25 | 192 MB | 40 - 100 MB |
| Docker + OS + page cache | — | ~700 MB | ~700 MB |
| **Total limits** | **4.25** | **~8.0 GB** | — |
| **Expected usage** | — | — | **~2.7 - 5.3 GB** |

Headroom is thin at peak; monitor closely. CPU is oversubscribed by design (4.25 vCPU limits on 2 vCPU) but actual usage is bursty and usually far lower.

### 7.3 Disk

- OS + Docker images: 20-30 GB (the OpenWA image with Chrome is large).
- PostgreSQL data: depends on tenant volume; start at 20 GB.
- OpenWA session/media data: 10-20 GB (grows with linked gyms and media).
- Backups on VM: 20-50 GB.
- **Recommended persistent disk: 100 GB balanced (`pd-balanced`)**; 150 GB if media volumes grow.

### 7.4 When to upsize

Move to `e2-standard-4` (4 vCPU / 16 GB) if any of: >8 concurrent WhatsApp sessions, sustained CPU >70%, DB working set >2 GB, or memory pressure causing OOM kills. Do not attempt to run the existing 12.3 GB limit configuration on e2-standard-2.

---

## 8. NETWORK AND FIREWALL RULES

### 8.1 GCP VPC firewall (plan only — no rules are created by this document)

| Direction | Port / protocol | Source | Action | Reason |
|---|---|---|---|---|
| Ingress | 22/TCP | IAP range `35.235.240.0/20` only | Allow | SSH via Identity-Aware Proxy; no public SSH |
| Ingress | 80/TCP | `0.0.0.0/0`, `::/0` | Allow | ACME challenge + HTTPS redirect |
| Ingress | 443/TCP | `0.0.0.0/0`, `::/0` | Allow | Public API + webhooks |
| Ingress | 5432/TCP | none | **Deny** | PostgreSQL never public |
| Ingress | 2785/TCP | none | **Deny** | OpenWA API never public |
| Ingress | 5000/2525/TCP | none | **Deny** | Postal local ports never public |
| Ingress | 8080/TCP | none | **Deny** | Backend only via nginx |
| Ingress | 6379/TCP | none | Deny | Redis not used |
| Egress | 443/TCP | `0.0.0.0/0` | Allow | Brevo, Resend, R2, Expo, Certbot, WhatsApp Web |
| Egress | 25/TCP | — | **Blocked by GCP** | Use Brevo/relay; do not self-host outbound SMTP |
| Egress | 3478/UDP, STUN | — | Allow if CCTV TURN relay used | `TURN_SERVER_HOST` |

### 8.2 Docker network segmentation

- `gymdeck_internal` (`internal: true`): `postgres` only (plus backend/openwa for DB access). No internet egress.
- `gymdeck_ingress` (`internal: false`): nginx, backend, openwa. Provides outbound internet.
- nginx must **not** be attached to `gymdeck_internal` (least privilege).
- Do not publish container ports to `0.0.0.0`; only nginx publishes 80/443.
- OpenWA `WEBHOOK_SSRF_PROTECT=true`, `SSRF_ALLOWED_HOSTS=backend` — keep.
- No host firewall should expose Docker's default bridge beyond the above.

### 8.3 TLS and public surface

- Only `https://<host>/v1/*` is public. Webhook endpoints are public but authenticated:
  - Brevo: bearer/`X-Webhook-Secret`/`X-Sib-Webhook-Token` shared secret, constant-time compare (`brevoWebhookService.ts:90-121`); **no `?secret=` query parameter** (explicitly rejected).
  - Postal: RSA signature verification; staging/production fail closed without keys.
  - OpenWA: HMAC-SHA256 signature — but its callback URL is **internal**, so no public exposure needed for it.
- nginx rate zones already defined: `api_general` 30 r/s, `api_auth` 5 r/s. Webhook ingress also has app-level 300 req/min per IP (`rateLimiter.ts:143-148`).

---

## 9. DNS AND HTTPS CONFIGURATION (PLAN ONLY — NO DNS IS MODIFIED)

### 9.1 Hostname decision — BLOCKER

The candidate `api.epic-studio.in` **does not appear anywhere in the repository**. Existing values:

| Setting | Current value | Source |
|---|---|---|
| Tauri `.env.example` | `GYMDECK_CLOUD_URL=https://api.gymdeck.com` | `.env.example:14` |
| nginx `server_name` | `api.gymdeck.com staging-api.gymdeck.com` | `nginx.conf:53` |
| nginx TLS cert paths | `/etc/letsencrypt/live/api.gymdeck.com/...` | `nginx.conf:71-72` |
| Rollback script probe | `https://api.gymdeck.com` | `rollback.sh:13,17` |
| Mobile apps | `api.gymdeck.com` staging/prod | `apps/*/src/config/index.ts` |
| Email sender domain | `mail.epic-studio.in` (separate, already in use) | multiple |

A decision is required: either (a) add a new `api.epic-studio.in` A/AAAA record to the VM's static external IP, or (b) keep `api.gymdeck.com`. This plan uses `api.epic-studio.in` as the candidate per the request, but **no DNS change is authorized or performed**. Note that `epic-studio.in` currently uses GoDaddy nameservers (`ns03/ns04.domaincontrol.com`) and has root Google Workspace MX/SPF/DMARC which must not be disturbed.

### 9.2 Required DNS records (to be applied by an authorized operator, not by this plan)

- `api.epic-studio.in` → A record → VM static external IP.
- (Optional) `staging-api.epic-studio.in` → same or separate VM.
- No MX/TXT changes to the root or `mail.` subdomain are required for the API. Email DNS work is tracked separately in `EMAIL_LINE_PHASE_4_DNS_READINESS.md` and is **currently unapplied**.

### 9.3 nginx changes required

- Duplicate/parameterize the port-443 server block for the new `server_name`.
- Replace cert paths with `/etc/letsencrypt/live/api.epic-studio.in/fullchain.pem` and `privkey.pem`.
- The existing port-80 block lists `staging-api.gymdeck.com` but there is **no port-443 block for staging** — add one if staging is deployed on this VM.
- Keep TLS 1.2/1.3, HSTS, security headers, `client_max_body_size 10M`.
- Keep `limit_req` zones; consider a dedicated route for `/v1/webhooks/*` with its own limit.

### 9.4 Certificate issuance and renewal — BLOCKER

- No certbot container, no renewal cron/systemd timer, and no nginx container exist in the repo. TLS paths assume `/etc/letsencrypt`, which will not exist on a fresh VM.
- Required plan: install certbot with webroot (`/var/www/certbot`, already referenced at `nginx.conf:55-57`), issue the cert, and add a renewal timer that reloads nginx. Verify auto-renewal with a dry run before relying on it.
- Use a **reserved static external IP** so DNS and cert issuance are stable.

---

## 10. POSTGRESQL MIGRATION AND BACKUP/RESTORE STRATEGY

### 10.1 Pre-migration verification (mandatory — no migration may run before these pass)

1. Identify the exact migration mechanism used for any existing deployment. Two exist and they are not equivalent (§2.3).
2. Verify whether `drizzle-kit migrate` works at all without a `meta/_journal.json`. If it does not, use the explicit ordered SQL files (`0000` → `0010`) via `psql`/`pg_restore`-style runner under transaction control.
3. Confirm `bootstrap.ts` is not needed for a fresh install; if it is, extend it to include `0000` and `0001` or run those explicitly first.
4. Resolve the `0010` doc/code mismatch (conditional header vs unconditional application).
5. Take a full encrypted logical backup of the source DB (if any) before any operation.
6. Rehearse the entire migration on a disposable staging clone of the VM and verify row counts for `gyms`, `gym_members`, `member_accounts`, `email_outbox`, `gym_whatsapp_accounts`, `whatsapp_message_jobs`.

### 10.2 Migration procedure (planned)

- Start only `postgres` via Compose; wait for `pg_isready`.
- Run migrations with the application **stopped** (maintenance window) so workers cannot write mid-DDL:
  `docker compose ... run --rm backend npm run db:migrate` (with verified mechanism), or apply SQL files in order.
- **Never** use `prisma db push`-style or `--clean` operations on the live DB. The existing `restore-db.sh` uses `pg_restore --clean --if-exists` — suitable for a controlled restore, not migration.
- After migration, start one backend, check `/ready`, then run smoke reads of tenant-scoped queries.
- Record the applied migration version in an operator log; the repo has no reliable version table.

### 10.3 Backup strategy

- Existing script `infrastructure/scripts/backup-db.sh`: `pg_dump -Fc` piped to `openssl enc -aes-256-cbc -salt -pbkdf2`; requires `BACKUP_ENCRYPTION_KEY`; 30-day retention; defaults `DB_HOST=localhost`, `DB_USER=gymdeck_prod_user`, `DB_NAME=gymdeck_cloud_prod`.
- **Adaptation needed:** on the VPS, PostgreSQL is inside Docker with no published port. Either run the script with `DB_HOST` set to a container-reachable address via `docker exec`, or add a dedicated backup sidecar on `gymdeck_internal`. `localhost:5432` from the host will not work.
- **No scheduler exists.** Add a host cron or systemd timer for daily backups. Documented intent in `docs/operations/disaster-recovery.md` is 02:00 UTC daily with 30-day/12-week/12-month retention and off-site replication — only the base script is implemented.
- Back up the OpenWA volume **in the same maintenance window**. A DB-only restore with a mismatched `openwa_session_id` mapping will orphan WhatsApp sessions. Include `openwa_prod_data` (SQLite + `sessions/` + `media/`) in a separate encrypted archive.
- Store encrypted backups off the VM (e.g. Cloud Storage with object versioning), keep `BACKUP_ENCRYPTION_KEY` in a secret manager, and test restore quarterly.

### 10.4 Restore and rollback

- `infrastructure/scripts/restore-db.sh` decrypts to `/tmp/restore_<db>_<ts>.dump`, runs `pg_restore --clean --if-exists`, then deletes the plaintext temp file. Review its `|| { echo "Non-fatal warnings"; }` — it can mask real failures; tighten before relying on it.
- Code-level rollback (reverting a config change) does **not** roll back applied DDL. Migrations are additive (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... IF NOT EXISTS`), so a config rollback is safe; a schema rollback requires a restore from backup.
- Container/image rollback: `infrastructure/scripts/rollback.sh` only restarts a service and probes `/ready`. It does not revert an image digest. Improve it to pin and redeploy a known-good digest.

---

## 11. EMAIL LINE DEPLOYMENT PROCEDURE (BREVO PRIMARY, POSTAL ROLLBACK)

### 11.1 Two distinct email paths — do not conflate

- **Email Line / Communication Hub** (`backend/services/email/*`): tenant broadcasts, outbox, quotas, dispatch attempts, provider snapshots, webhooks. Uses `EMAIL_DELIVERY_PROVIDER` (Postal or Brevo). This is the scope of the migration.
- **Legacy auth email** (`backend/services/auth/email/*`): OTP/password reset via Resend, `RESEND_API_KEY`. Keep working; not part of the Email Line cutover.

### 11.2 Brevo configuration (verified)

- API base URL is **hardcoded HTTPS**: `https://api.brevo.com/v3` (`providers/brevoClient.ts:144-153`), endpoint `/smtp/email`, auth header `api-key`. No env override, no proxy setting.
- Required env: `EMAIL_DELIVERY_PROVIDER=brevo`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (fail-closed at `config/index.ts:190-206`), `BREVO_SENDER_NAME` (optional), `BREVO_WEBHOOK_SECRET`, `BREVO_DELIVERY_MODE=live` (only when authorized).
- Webhook: public `POST https://api.epic-studio.in/v1/webhooks/brevo` (alias `/v1/owner/email/webhooks/brevo`). Register this URL in the Brevo dashboard with a secret header (`X-Webhook-Secret` or bearer). **Never use `?secret=`** — explicitly rejected in code.
- Consumed events: `delivered`, `soft_bounce`, `hard_bounce`, `blocked`, `invalid_email`, `spam`, `complaint`, `request`, `sent`, `opened`, `click`, `deferred`. Soft bounce is recorded as failed but **does not create a suppression**; hard bounce/spam/complaint do.
- Brevo does not sign payloads cryptographically; the shared secret is high-value. Keep it only in the secret manager.

### 11.3 Known defects to resolve before enabling Brevo live

- **Sender mismatch:** `emailService.ts:260-262` always sets `fromAddress = config.POSTAL_DEFAULT_FROM_EMAIL`, so `BREVO_SENDER_EMAIL` may not be used on actual sends. Dashboard `relayInfo` reports `BREVO_SENDER_EMAIL`, which can disagree with the real From header. Align `POSTAL_DEFAULT_FROM_EMAIL` and `BREVO_SENDER_EMAIL` (or patch the code).
- **No Brevo idempotency:** architecture recommends `headers.idempotencyKey` with 15-minute TTL (`GYMDECK_BREVO_PHASE_2A_ARCHITECTURE_ASSESSMENT.md:472-478`); `brevoClient` supports headers but `brevoAdapter.ts:64-74` passes none. Retries of ambiguous outcomes are already blocked (`RECONCILIATION_REQUIRED`), which mitigates but does not eliminate duplicate risk.
- **Webhook fingerprint defect:** `brevoWebhookService.ts:209-218` uses `payload.id` when present, but the architecture report (`:381-387`) says Brevo's `id` is the webhook configuration ID, not an event ID. Distinct events could collapse and be dropped. Verify with a real payload.
- **Batched payloads unsupported:** processor expects a single object; Brevo batch shape is unconfirmed.
- **`BREVO_DELIVERY_MODE=sandbox` sends live** (no code branch; only `mock` short-circuits). Do not treat sandbox as safe.
- `EMAIL_STAGING_*` safeguards are declared but unenforced. Do not rely on them as a guardrail.
- Brevo 429/5xx/network errors are classified ambiguous → `RECONCILIATION_REQUIRED`, not auto-retried. Operators need a reconciliation runbook for Brevo (existing `docs/operations/email-reconciliation.md` is Postal-only).
- Outbound: GCP blocks port 25, but Brevo is HTTPS API (443) so it is unaffected — this is the main reason to prefer Brevo on GCP.

### 11.4 Postal rollback

- Provider is pinned per job: first attempt reads prior attempt → outbox → config (`deliveryWorker.ts:734-766`), so switching `EMAIL_DELIVERY_PROVIDER=postal` affects only **new** jobs. Existing Brevo-pinned retries remain on Brevo. Documented rollback: keep Brevo attempts/events, keep Brevo webhook active until terminal state, do not resend.
- Procedure: stop backend → set `EMAIL_DELIVERY_PROVIDER=postal` plus valid `POSTAL_*` values → restart → verify process env and one controlled test.
- **GCP constraint:** do not self-host Postal outbound SMTP on this VM (port 25 blocked, and the repo documents a Spamhaus PBL issue on the current IP: `EMAIL_LINE_PHASE_4A_AUDIT.md:37-49,191`). Rollback therefore means pointing `POSTAL_API_URL` at the **existing external Postal instance** (the `infrastructure/email-arm64` stack was Oracle Cloud oriented) or at an SMTP relay. That instance must be reachable over HTTPS/TLS with valid `POSTAL_SIGNING_*` keys.
- Remove the hardcoded `Host: localhost:5000` header (`postalClient.ts:143,223`) before using a non-local endpoint.
- DNS for `mail.epic-studio.in` (SPF/DKIM/DMARC/return-path) is documented in `EMAIL_LINE_PHASE_4_DNS_READINESS.md` but explicitly **not applied**. Brevo does not need those records for API sending, but Postal rollback does.

### 11.5 Deployment order

1. Configure secrets (§13) and set `EMAIL_DELIVERY_PROVIDER=postal` with mock/live posture documented.
2. Deploy backend and verify `/ready` with Email Line vars — no sends.
3. Register Brevo webhook URL and secret; verify signature/secret auth with a synthetic request (no real email).
4. One controlled single-recipient live send **only after explicit authorization**, with inbox confirmation recorded.
5. Flip `EMAIL_DELIVERY_PROVIDER=brevo` for new jobs; monitor `email_dispatch_attempts`, `email_delivery_events`, `email_webhook_quarantine`, and `RECONCILIATION_REQUIRED` states for 48h.
6. Keep Postal credentials and webhook active for the rollback window; do not delete migration `0007`-`0010` data.

---

## 12. WHATSAPP SESSION MIGRATION AND ONBOARDING PROCEDURE

### 12.1 What must be preserved (critical mapping)

The entire tenant→session linkage depends on these three pieces staying consistent:

1. Postgres `gym_whatsapp_accounts.gym_id` → `openwa_session_id` → `openwa_session_name`.
2. OpenWA SQLite `sessions` row with that `id` and `name`.
3. On-disk auth directory `<SESSION_DATA_PATH>/session-<openwa_session_id>` containing the WhatsApp Web login (IndexedDB).

If any one is lost or mismatched, the gym must re-scan QR. Webhook resolution uses only `openwa_session_id` (`accountService.ts:468-477`), so a mismatch silently breaks inbound delivery.

### 12.2 Migration options

**Option A — preserve existing sessions (preferred if source host is accessible):**
1. Stop the source backend and OpenWA cleanly (graceful shutdown closes Chromium).
2. Take a consistent snapshot of **both** Postgres and the entire OpenWA `/app/data` volume.
3. Restore Postgres into the VPS DB and the volume into `openwa_prod_data`, preserving file ownership (uid/gid 997), paths, and the exact `SESSION_DATA_PATH=/app/data/sessions`.
4. Start OpenWA **before** the backend; verify `GET /api/sessions` lists the expected session IDs and statuses.
5. Start the backend; verify `/ready` and that `gym_whatsapp_accounts` rows resolve.
6. Confirm the webhook registrations still point to `http://backend:8080/v1/webhooks/openwa` (`openwaClient.ts:275-305`) and that `X-OpenWA-Signature` verifies. Note: local DB observation showed a webhook URL of `http://127.0.0.1:3001/v1/webhooks/openwa` — **any migrated row with a loopback URL must be re-registered** to the internal Docker URL.
7. Do not send a real message until the gym owner confirms receipt.

**Option B — re-onboard (only if source state is unavailable or mismatch is detected):**
1. For each gym, call the existing connect flow from the Communication Hub (or `POST /v1/owner/whatsapp/connection/connect`).
2. GymDeck creates a new OpenWA session named via `sessionNameForGym()`.
3. Scan the QR in the desktop app (Settings → Gym Profile → WhatsApp → Connect WhatsApp). QR refreshes every 20-30 s (`OPENWA_SOURCE_AUDIT.md:134-163`).
4. Wait for `session.status` webhook `ready`; `accountService.ts:70-86` maps `ready` + `session.phone` to `CONNECTED`.
5. Verify webhook registration and one controlled test message per gym after explicit owner authorization.

### 12.3 Version/upgrade hazard (do not upgrade OpenWA)

- Keep v0.30.3. The pinned Chrome in the Dockerfile must not be changed without a session backup: older Chrome deletes the IndexedDB a newer Chrome opened (`services/openwa/docs/11-operational-runbooks.md:714-725`).
- Rolling back past 0.23.5 also requires restoring `baileys/` because auth dirs were renamed from session name to UUID (`docs/11-operational-runbooks.md:727-733`).
- GymDeck's `linkPreview` key requires ≥0.30.3 — downgrade is not an option.

### 12.4 Unverified items (acceptance gates)

- No real phone QR scan or live WhatsApp delivery has ever been performed in the repository's test evidence (`GYMDECK_WHATSAPP_INTEGRATION_REPORT.md:7-8,132`; `OPENWA_REAL_WORLD_TEST_REPORT.md:23`).
- Production/staging session counts are unknown. Local `services/openwa/data/openwa.sqlite` had one session (`a0ea3807-...`, name `gymdeck-15a8189e...`), while the test report names a different session ID for the same name — unexplained. Do not assume local state matches production.
- OpenWA is unofficial; WhatsApp may restrict accounts sending automated/bulk messages. Use a dedicated gym number (`GYMDECK_WHATSAPP_INTEGRATION_REPORT.md:105-106`).

---

## 13. PRODUCTION SECRETS CHECKLIST AND MANAGEMENT STRATEGY

### 13.1 Strategy (proposed)

- Use **GCP Secret Manager** as the source of truth. Do not commit `.env` files. The repo already gitignores `.env` and `.env.*` (with exceptions only for templates).
- Inject secrets into Compose via a root-only `.env` file on the VM (`chmod 600`), populated from Secret Manager at deploy time; never bake secrets into images. `Dockerfile.backend` does not copy `.env` (backend `.dockerignore` excludes it).
- Use distinct values per environment; rotate on the schedule in `docs/operations/secret-rotation.md`.
- Never place secrets in URLs/query strings (Brevo webhook secret is header-only by design).

### 13.2 Checklist (every secret referenced by code)

| Variable | Purpose | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | DB password | Compose fail-required; no default |
| `DATABASE_URL` | Derived from DB creds | Docker DNS host `postgres`, not localhost |
| `JWT_SECRET` | Token signing | ≥32 chars, non-dev; production validation enforced |
| `PAYMENT_ENCRYPTION_KEY` | Field encryption | Throws if missing in production |
| `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | R2 vault | Live provider gated on access key; dev `dev_secret` must be replaced |
| `RESEND_API_KEY` | Legacy auth email | Compose fail-required even though Email Line uses Brevo |
| `BREVO_API_KEY` | Email Line primary | Required when provider=brevo |
| `BREVO_WEBHOOK_SECRET` | Webhook auth | Header-only; rotate with Brevo dashboard |
| `POSTAL_SERVER_API_KEY`, `POSTAL_WEBHOOK_KEY` | Rollback | Keep valid during rollback window |
| `POSTAL_SIGNING_PUBLIC_KEY`, `POSTAL_SIGNING_KEY_ID`, `POSTAL_AUTHORIZED_PUBLIC_KEYS` | Postal webhook RSA | Staging/prod fail closed without them |
| `OPENWA_API_KEY` | OpenWA API + backend client | Same value in both; ≥16 chars, non-dev |
| `OPENWA_WEBHOOK_SECRET` | Webhook HMAC | Same value in both; ≥16 chars, non-dev |
| `TURN_SHARED_SECRET` | CCTV TURN | Falls back to JWT_SECRET then hardcoded dev value — set explicitly |
| `EXPO_ACCESS_TOKEN` | Push | Only if live push used |
| `BACKUP_ENCRYPTION_KEY` | DB backup encryption | Required by `backup-db.sh` |
| `GYMDECK_DB_KEY` | Desktop SQLCipher key | Staging/prod fail closed without it; **do not share with VM** |
| `GYMDECK_UPDATER_PUBKEY` | Desktop updater | Currently a placeholder in `tauri.conf.json` |
| `CORS_ORIGINS` | Not a secret but production-critical | Must be explicit; `*` rejected |
| `EMAIL_STAGING_*` | Staging-only guards | Declared but unenforced — do not rely on |

### 13.3 Local secret hygiene findings

- Untracked local files with real-looking values exist (`backend/.env`, `infrastructure/email-staging/.env`, `config/postal.yml`, `config/signing.key`, `services/openwa/.env`). They are gitignored and were **not** read for values or reproduced in this document.
- The Brevo API key was reportedly pasted into chat and requires rotation (`GYMDECK_BREVO_API_VALIDATION_REPORT.md:157,179`); an earlier SMTP relay key must be revoked (`:93,180`). Rotation status unknown — treat as rotated until proven otherwise.
- Staging compose has insecure defaults (`POSTGRES_STAGING_PASSWORD:-staging_secure_pass_123`, `JWT_STAGING_SECRET:-staging_jwt_secret_must_be_rotated`) — replace before any staging deployment.

---

## 14. DEPLOYING THE TAURI DESKTOP APP AGAINST THE CLOUD API (WITHOUT BREAKING LOCAL DEV)

### 14.1 Current mechanism

- Frontend API clients (`emailApi.js`, `whatsappApi.js`, `communicationsApi.js`, `paymentsV2Api.js`) call `isTauri()` → `window.__TAURI__.core.invoke('cloud_communications_request_command', { request: { method, path, body } })`. Tokens never enter JavaScript; they are attached in Rust.
- Rust resolves the base URL: payload override → env `GYMDECK_CLOUD_URL` → hardcoded `http://127.0.0.1:3001` (`cloud_enroll_commands.rs:53-61`; `auth_commands.rs:119-120,210-211`; `lib.rs:188`). Sync worker falls back to `http://localhost:8080` (`sync/worker.rs:105`).
- IPC proxy allowlist (`:318-326`): `/v1/owner/communications`, `/v1/owner/whatsapp`, `/v1/owner/email`, `/v1/owner/payment-accounts`, `/v1/owner/payment-reconciliation`, `/v1/payments`.
- Refresh tokens stored in OS Keychain via `keyring` v3.0.4 (`sessions/manager.rs:52`, `sessions/cloud_session.rs:54-67`); device ID `desktop-node-<uuid>`.
- `window.__GYMDECK_CLOUD_URL__` is read by the frontend but **never assigned anywhere**; browser mode always falls back to `http://localhost:3001` unless `localStorage.gymdeck_cloud_url` is set manually.

### 14.2 Deployment approach (plan only)

1. **Keep local dev untouched.** Do not change hardcoded fallback strings. Local `pnpm run dev` + backend on 3001 continues to work.
2. For production builds, set `GYMDECK_CLOUD_URL=https://api.epic-studio.in` (or chosen host) **at runtime** on each desktop, because there is no repo mechanism that writes a root `.env` into the Rust process. Options: installer-provided environment variable, a per-user config written by the app, or a build-time injection that must be added to CI. Decide before shipping.
3. Set `GYMDECK_ENV=production` and `GYMDECK_DB_KEY` for production builds; Rust fails closed without a non-dev DB key.
4. Fix the updater before shipping installers: `tauri.conf.json:51` hardcodes `https://releases.gymdeck.com/desktop/...` and the pubkey is the literal `UPDATE_SIGNING_PUBLIC_KEY_PLACEHOLDER`. CI passes `GYMDECK_UPDATER_PUBKEY`, but the Tauri updater plugin config does not read it (`config/mod.rs:84-85` only feeds `AppConfig`).
5. CSP: `tauri.conf.json:14` has no `connect-src` for a cloud origin. Desktop mode is safe because HTTP happens in Rust, but any direct browser-mode fetch to the cloud will be blocked by `default-src 'self'`. Decide whether to add `connect-src https://<host>`.
6. Cloud enrollment: existing desktop enrollments are stored in the OS Keychain (`gymdeck_cloud_refresh_token`, `gymdeck_cloud_enrollment_meta`, `gymdeck_device_id`). Moving the API host does not inherently invalidate them, but the new backend must share the same `JWT_SECRET` and the same Postgres tenant data, otherwise refresh/session restore fails. Re-enrollment may be required if secrets change.
7. Acceptance: enroll one test desktop against the new host, verify IPC proxy paths, verify 401→single-flight refresh→retry once, verify Communication Hub and Email Line screens render from cloud data, then repeat with a fresh install to confirm no localhost fallback is used.

---

## 15. MONITORING, LOG REDACTION, RESTART RECOVERY

### 15.1 Monitoring signals

- Liveness `GET /health` (always 200) and readiness `GET /ready` (DB check; 503 when down). Use `/ready` for alerts; note the development bypass (`routes/health.ts:45`) does not apply in production.
- Docker healthchecks for all three core services (§6.3).
- Application metrics to alert on:
  - `email_dispatch_attempts` with status `UNKNOWN_OUTCOME` / `RECONCILIATION_REQUIRED`;
  - `email_webhook_quarantine` growth;
  - `whatsapp_message_jobs` stuck in `PROCESSING` past the 120 s lease;
  - `gym_whatsapp_accounts.openwa_status = REAUTHORIZATION_REQUIRED` or `ERROR`;
  - OpenWA `/api/health/ready` and session count vs `MAX_CONCURRENT_SESSIONS`;
  - Postgres connections vs pool max (10), disk usage, and backup job success;
  - VM memory/CPU, OOM kills, certificate expiry (30/14/7 days).
- Notifications from OpenWA: `WEBHOOK_OUTBOX_RETENTION_DAYS=7` and `webhook_delivery_failures` table exist; add alerting on delivery failures (no alerting subsystem shipped — `services/openwa/docs/04-security-design.md:630`).

### 15.2 Log redaction — current state and gaps

- Custom JSON logger (`backend/shared/logging/logger.ts:9-54`) redacts **context object** keys matching `password`, `secret`, `token`, `otp`, `code`, `authorization`, `bearer`, `cookie`, `api[_-]?key`, `resend`, `database_url`, `signed_?url`.
- Gaps:
  - The free-form `message` string is **not** redacted.
  - HTTP access logs (`gateway/src/app.ts:52-68`) include `originalUrl` — query strings could carry tokens/secrets.
  - nginx `log_format gymdeck_combined` logs the full `$request` line including query string.
  - Config validation failures print raw Zod error JSON via `console.error` (`config/index.ts:243-247`) — may echo field values.
- Action: sanitize query strings in both access logs, avoid putting secrets in `message` strings, and review error payloads before enabling centralized log shipping. Do not ship logs containing session file paths or member PII to third-party services without a DPA.

### 15.3 Restart recovery

- `restart: always` on all services. Backend drains workers and the PG pool on SIGTERM (10 s forced exit). OpenWA needs `stop_grace_period: 75s` (add it).
- On backend restart, the email worker recovers expired leases, the WhatsApp worker calls `recoverStale()`, and retention resumes. Ambiguous email outcomes are intentionally left in `RECONCILIATION_REQUIRED` — **never auto-resend**.
- On OpenWA restart with `AUTO_START_SESSIONS=true`, all linked sessions attempt to start simultaneously; peak memory event. Sessions that end `failed` are not auto-started — monitor and restart manually.
- Postgres volume and OpenWA volume must be restored as a pair for WhatsApp consistency (§12).

---

## 16. BACKUP AND RECOVERY STRATEGY (CONSOLIDATED)

| Asset | Method | Schedule (proposed) | Off-site | Restore test |
|---|---|---|---|---|
| PostgreSQL | `backup-db.sh` (`pg_dump -Fc` + AES-256-CBC) | Daily 02:00 UTC via host cron/timer | Yes (object versioning) | Quarterly |
| OpenWA volume | Encrypted archive of `/app/data` (SQLite + `sessions/` + `media/`) | Same window as DB, after clean stop | Yes | Quarterly with DB |
| TLS certs | Secret Manager copy of `/etc/letsencrypt` | On issuance/renewal | Yes | Dry-run renewal |
| Secrets | GCP Secret Manager versions | On change | Native | Annual restore drill |
| Desktop vault | Existing SQLCipher daily `VACUUM INTO` backup at 03:00 (`lib.rs:96-135`) | Local | User-managed | Documented in DR guide |

RPO/RTO targets are stated in `docs/operations/disaster-recovery.md` but explicitly **NOT YET PROVEN** in cloud. Do not quote them as achieved. Gaps: no scheduler, no off-site copy automation, no timed failover drill, and `restore-db.sh` can mask `pg_restore` errors.

---

## 17. COST CONSIDERATIONS (ESTIMATES — VERIFY CURRENT GCP PRICING)

| Item | Estimate / note |
|---|---|
| `e2-standard-2` VM (2 vCPU / 8 GB) on-demand | Roughly US$45-60/month in a US region; sustained-use discounts may apply. Confirm at `cloud.google.com/pricing`. |
| Persistent disk 100 GB `pd-balanced` | Roughly US$10-15/month. |
| Static external IP | Small charge while attached; reserve one for stable DNS/cert. |
| Snapshots / Cloud Storage backups | Scales with data; enable lifecycle policies. |
| Cloud Logging / Monitoring | Free tier then per-GB; log volume depends on redaction and retention. |
| Email | Brevo plan cost is separate and **shared across all gyms**; per-gym quota (300/month default) is independent of the Brevo account allowance. Exact plan limits are unknown (`GYMDECK_BREVO_PHASE_2A_ARCHITECTURE_ASSESSMENT.md:637,648`). |
| DNS | Registrar DNS may be free; Cloud DNS has a per-zone monthly charge. |
| Load balancer | Not required initially (single VM + nginx); adding one increases cost substantially. |
| Egress | Typically free up to a quota, then charged; WhatsApp/email API traffic is small. |

**Upsize trigger:** >8 concurrent WhatsApp sessions → `e2-standard-4` (4 vCPU/16 GB), roughly double the VM cost. Do not provision until session counts are measured.

---

## 18. ORDERED DEPLOYMENT AND ACCEPTANCE-TEST CHECKLIST

Each phase is a gate. **Do not proceed if a gate fails.**

**Phase 0 — Decisions and verification (no infrastructure changes)**
- [ ] Choose API hostname (`api.epic-studio.in` vs `api.gymdeck.com`) and record owner approval.
- [ ] Confirm exact OpenWA 0.30.3 commit/digest; confirm no upgrade is authorized.
- [ ] Resolve Drizzle vs bootstrap migration mechanism; confirm journal absence behavior.
- [ ] Confirm Brevo API key rotation status and account limits; confirm Postal rollback endpoint.
- [ ] Confirm actual production session counts and database size.
- [ ] Fix/approve the code defects listed in §11.3 and §15.2 logging gaps that are in scope.

**Phase 1 — Local rehearsal (no cloud)**
- [ ] Build backend and OpenWA images from the exact pinned source; record digests.
- [ ] `docker compose config` validates the proposed file; no secrets in it.
- [ ] Run a disposable full stack locally; `/health` 200, `/ready` 200 with DB up.
- [ ] Run backend test suites (typecheck + all `test/*.test.ts`) and Brevo readiness suites; record results.
- [ ] Rehearse migration `0000`→`0010` on a throwaway DB; verify table/row counts.
- [ ] Rehearse backup + restore of both Postgres and OpenWA volumes.
- [ ] Synthetic (no real send) webhook auth tests for Brevo, Postal, OpenWA.

**Phase 2 — VM base (requires provisioning authorization)**
- [ ] Ubuntu 24.04 LTS, `e2-standard-2`, 100 GB disk, reserved static IP.
- [ ] OS updates, Docker Engine + Compose plugin, non-root deploy user, firewall per §8.
- [ ] IAP-only SSH; no public 22/5432/2785/5000/8080.
- [ ] Secret Manager access configured; root-only `.env` populated.

**Phase 3 — TLS and ingress**
- [ ] DNS A record to static IP (authorized operator only).
- [ ] nginx container + certbot webroot; cert issued for chosen host; dry-run renewal passes.
- [ ] HTTP→HTTPS redirect, HSTS, TLS 1.2/1.3, rate zones verified.
- [ ] Confirm public webhook route reachable: `POST /v1/webhooks/brevo` returns auth error without secret (not 404).

**Phase 4 — Data**
- [ ] Postgres started; DB created with least-privilege user.
- [ ] Encrypted pre-migration backup taken and verified decryptable.
- [ ] Migrations applied on a staged clone first, then on target during maintenance window.
- [ ] Table/row counts and tenant scoping smoke tests pass.

**Phase 5 — Services**
- [ ] OpenWA started first; `/api/health/ready` passes; session list matches expected IDs.
- [ ] Backend started; `/health` and `/ready` pass through nginx HTTPS.
- [ ] Postgres not reachable from outside Docker (`nc` from VM to 5432 via host IP fails).
- [ ] All three in-process workers confirmed running (log lines / DB leases).
- [ ] `restart: always` verified by stopping a container and observing recovery.

**Phase 6 — Email Line**
- [ ] Env vars injected; config validation passes with `EMAIL_DELIVERY_PROVIDER=postal` (or brevo if authorized).
- [ ] Brevo webhook URL + secret registered; synthetic signed request accepted; unsigned/bad-secret rejected.
- [ ] One controlled single-recipient live send **after explicit authorization**; inbox receipt confirmed.
- [ ] Provider snapshot behavior verified: in-flight job stays on pinned provider after env change.
- [ ] Postal rollback rehearsed with synthetic test (no real send).

**Phase 7 — WhatsApp**
- [ ] Session IDs/names/auth dirs verified across Postgres, OpenWA SQLite, and disk.
- [ ] Loopback webhook URLs re-registered to `http://backend:8080/v1/webhooks/openwa`.
- [ ] One gym re-linked (QR scan) if Option B used; `session.status` webhook reaches backend.
- [ ] Synthetic inbound webhook with valid HMAC accepted; invalid rejected.
- [ ] One controlled test message after owner authorization; delivery ack observed.
- [ ] Memory measured with target concurrent session count; cap set accordingly.

**Phase 8 — Desktop and cutover**
- [ ] Test desktop build configured with `GYMDECK_CLOUD_URL` to new host; local dev still works on 3001.
- [ ] Cloud enrollment, token refresh, and IPC proxy allowlist verified.
- [ ] Communication Hub and Email Line screens render from cloud data.
- [ ] Monitoring, alerts, backup timer, and runbook handover complete.
- [ ] Rollback drill executed (image digest + DB restore) on staging.

---

## 19. EVERY BLOCKER AND UNRESOLVED COMPATIBILITY ISSUE

### 19.1 Deployment blockers (must be resolved before any cloud deployment)

1. **No live cloud deployment evidence.** Docs stop at `INFRASTRUCTURE NOT DEPLOYED`, `PRODUCTION CONDITIONALLY READY`, cloud credentials `NOT YET VERIFIED` (`phase16-staging-readiness.md:46`; `phase18-cloud-provisioning-audit.md:24,53`).
2. **Hostname mismatch.** `api.epic-studio.in` absent from repo; all config targets `api.gymdeck.com`. No DNS change authorized.
3. **No nginx/certbot service or renewal job.** `nginx.conf` references cert paths that will not exist on a fresh VM; no staging TLS block.
4. **Migration mechanism ambiguous.** Two mechanisms; no Drizzle journal; bootstrap runs only from tests and omits `0000`/`0001`; `0010` conditional-header mismatch.
5. **OpenWA provenance.** Built from vendored source with no tag/digest; `CHANGELOG.md` has `[Unreleased]` post-0.30.3 changes. Must pin exact commit/digest.
6. **Resource limits exceed VM.** Current compose limits total ~12.3 GB vs 8 GB available.
7. **GCP outbound port 25 blocked.** Postal cannot self-host outbound SMTP on this VM; requires Brevo/relay/external Postal.
8. **Email DNS unapplied.** `EMAIL_LINE_PHASE_4_DNS_READINESS.md` explicitly says no records created; needed for Postal rollback.
9. **Brevo key rotation / inbox confirmation unknown.** Prior key pasted in chat; earlier SMTP relay key to revoke; live inbox delivery never confirmed.
10. **WhatsApp never live-tested.** No real QR scan or live delivery; session counts unknown; local session ID discrepancy unexplained.
11. **No backup scheduler or off-site copy.** `backup-db.sh` exists but no cron/systemd timer; OpenWA volume not in any backup job.
12. **Tauri production cloud URL has no injection mechanism.** All shipped builds fall back to `127.0.0.1:3001`; updater pubkey is a placeholder; CSP has no `connect-src`.
13. **No CI deploy gate.** Workflows build/test only; `deploy-staging.sh` swallows migration failures (`|| echo "completed or up-to-date"`).

### 19.2 Code/configuration defects affecting deployment

14. `postalClient.ts:143,223` hardcodes `Host: localhost:5000` — breaks non-local Postal.
15. Brevo sender mismatch (`emailService.ts:260-262` vs `BREVO_SENDER_EMAIL`).
16. Brevo idempotency header not passed (`brevoAdapter.ts:64-74`).
17. Brevo webhook dedupe may use webhook configuration ID as event ID (`brevoWebhookService.ts:209-218`); batched payloads unsupported.
18. `BREVO_DELIVERY_MODE=sandbox` executes live sends; `EMAIL_STAGING_*` guards declared but unenforced.
19. Cross-month quota reservation/commit mismatch (`quotaService.ts:98-101` vs `deliveryWorker.ts:363-369`).
20. `email_delivery_events.provider_event_id` uniqueness is global, not provider/instance-scoped (`0007:140`).
21. Alias webhook routes lack `webhookIngress` rate limiting (`routes/email.ts:54-87`).
22. Production DB SSL uses `rejectUnauthorized: false`.
23. `/ready` logs `originalUrl`; nginx logs full `$request`; logger does not redact free-form messages.
24. `POSTAL_INSTANCE_ID` not in Zod config schema.
25. Staging compose insecure defaults; `backend/.env.example` missing many required variables.
26. `deploy.replicas: 2` is Swarm-only syntax; plain Compose ignores it — deployment model must be decided.
27. Email Line variables are absent from both compose files; production compose hard-requires `RESEND_API_KEY` even though it is legacy-only.
28. Notification delivery worker and domain event bus have no production scheduler — features relying on them will not run.

### 19.3 OpenWA / WhatsApp compatibility issues

29. `linkPreview` requires ≥0.30.3 — **downgrade is not permitted**.
30. Chrome major rollback hazard: restoring `sessions/` from a pre-upgrade backup is mandatory across Chrome majors.
31. Auth-dir key rename pre-0.23.5 requires restoring `baileys/` too.
32. Sessions ending `failed` are not auto-started by `AUTO_START_SESSIONS=true`.
33. `MAX_CONCURRENT_SESSIONS` unset (unlimited); memory cap must be set and load-tested.
34. No public HTTPS OpenWA webhook URL exists in repo; internal callback must be used; migrated loopback webhook rows must be re-registered.
35. `WWEBJS_*` timeout and `WEBHOOK_TIMEOUT/RETRY_DELAY` not set in GymDeck compose; align with `.env.gymdeck.example`.
36. Upstream OpenWA docs state security features not implemented (no alerting subsystem, no `<NAME>_FILE` Docker secret support); do not rely on them.

### 19.4 Documentation conflicts to resolve

37. Provider docs conflict: `docs/architecture/resend-email.md`, `secret-rotation.md`, `incident-response.md`, and `production-deployment-guide.md` describe Resend/SES; newer reports describe Postal + Brevo. `GYMDECK_BREVO_API_VALIDATION_REPORT.md:42` labels Resend "legacy notification path, not the Email Line."
38. `GYMDECK_BREVO_FINAL_READINESS_REPORT.md` claims `?secret=` query auth is supported and soft bounces are suppressed — both contradicted by code.
39. `GYMDECK_BREVO_PRE_STAGING_CLOSURE_REPORT.md:133` says `BREVO_DELIVERY_MODE=real`, which is not a valid enum.
40. `EMAIL_LINE_PHASE_3C_FINAL_VERIFICATION.md:7` says "FULLY VERIFIED & PRODUCTION READY" but its own verdict (`:137`) is "READY FOR CONTROLLED STAGING DEPLOYMENT" and later Brevo reports record FAIL/BLOCKED gates.
41. README claims Traefik; repo contains nginx.
42. `workspace_structure.md` describes a different directory tree.
43. GCP appears only as a generic option in two "not yet provisioned" docs; no GCP-specific artifacts (Terraform, gcloud, systemd, cloud-init) exist.

### 19.5 Explicitly unverified (do not claim as done)

- Live cloud multi-tenant failover, RPO/RTO timing, zero-downtime rollout, Brevo inbox receipt, WhatsApp live delivery, real QR scan, OpenWA session count on target VM, per-session memory on Ubuntu 24.04, nginx deployment mechanism, certificate renewal, and desktop cloud-URL injection.

---

## 20. REFERENCE INDEX (key source documents)

- `docs/operations/production-deployment-guide.md`
- `docs/architecture/production-readiness.md`, `phase16-staging-readiness.md`, `phase17-cloud-validation.md`, `phase18-cloud-provisioning-audit.md`
- `docs/operations/disaster-recovery.md`, `incident-response.md`, `secret-rotation.md`, `email-reconciliation.md`
- `infrastructure/docker/docker-compose.prod.yml`, `docker-compose.staging.yml`, `Dockerfile.backend`
- `infrastructure/nginx/nginx.conf`; `infrastructure/scripts/{deploy-staging,backup-db,restore-db,rollback}.sh`
- `services/openwa/Dockerfile`, `docker-compose.yml`, `.env.gymdeck.example`, `docs/11-operational-runbooks.md`, `docs/14-migration-guide.md`
- `docs/whatsapp/OPENWA_SOURCE_AUDIT.md`, `OPENWA_GYMDECK_INTEGRATION.md`, `GYMDECK_WHATSAPP_INTEGRATION_REPORT.md`, `OPENWA_REAL_WORLD_TEST_REPORT.md`
- `GYMDECK_BREVO_PHASE_2A_ARCHITECTURE_ASSESSMENT.md`, `GYMDECK_BREVO_API_VALIDATION_REPORT.md`, `GYMDECK_BREVO_STAGING_VALIDATION_REPORT.md`, `GYMDECK_BREVO_PRE_STAGING_CLOSURE_REPORT.md`, `GYMDECK_BREVO_FINAL_READINESS_REPORT.md`
- `EMAIL_LINE_PHASE_3C_FINAL_VERIFICATION.md`, `EMAIL_LINE_PHASE_4_DNS_READINESS.md`, `EMAIL_LINE_PHASE_4A_AUDIT.md`
- `backend/shared/config/index.ts`, `backend/shared/database/{index.ts,bootstrap.ts,migrations/}`, `backend/services/{email,whatsapp}/`, `backend/gateway/src/`
- `src-tauri/tauri.conf.json`, `src-tauri/src/{lib.rs,config/mod.rs,commands/cloud_enroll_commands.rs,sessions/}`
- `frontend/{emailApi.js,whatsappApi.js,communicationsApi.js,paymentsV2Api.js,CCTV.jsx}`

---

## 21. REMEDIATION UPDATE (2026-11-22)

This plan has been revised by the remediation pass recorded in `GYMDECK_GCP_REMEDIATION_REGISTER.md` and `GYMDECK_GCP_REMEDIATION_EXECUTION_REPORT.md`.

- Canonical hostname decision: **`api.gymdeck.com`** (no `api.epic-studio.in` exists in the repository; no DNS was changed).
- Email sending domain remains `mail.epic-studio.in`; OpenWA minimum remains v0.30.3 with no downgrade.
- The production Compose now targets one `e2-standard-2` VM: no Swarm keys, nginx + certbot added, PostgreSQL unpublished, and declared limits total 5,776 MB + 1,024 MB OS/Docker overhead = 6,800 MB of 8,192 MB.
- `npm run db:migrate` now uses the single authoritative runner (`backend/shared/database/migrate.ts`). Five scenarios were executed on a temporary local PostgreSQL 16 cluster and passed.
- Tauri production cloud URL configuration is now fail-closed; three Rust config tests passed.
- OpenWA source provenance is pinned to the source commit/tree digest; the image digest remains pending an authorized build.
- Blockers marked `unresolved` or `blocked` in the register are **not closed**. No deployment-readiness claim is made.

## 22. FINAL P0 CLOSURE SPRINT (2026-11-23)

Detailed evidence is in `GYMDECK_FINAL_P0_CLOSURE_REPORT.md`.

- **#5 OpenWA image provenance remains OPEN.** The Docker daemon is unavailable (`docker version` hung until timeout), so no image was built and no digest was fabricated. `image_digest=PENDING_AUTHORIZED_BUILD` is still the only truthful value; production Compose still builds from source context. Needed: a reachable Docker/buildx daemon plus authorization to build and push the pinned v0.30.3 source, then replace `build:` with an immutable `image: ...@sha256:...`.
- **#3 TLS/certificate lifecycle is PARTIALLY closed.** `resolveDatabaseSsl()` now rejects invalid modes, malformed/non-PEM CA files, unreadable files and group/world-writable CA files; 9 assertions pass. `validate-certificate-files.sh` proves missing/malformed/unreadable/bad-permission cert/key rejection. ACME issuance/renewal and nginx reload are NOT verified locally: `certbot`, `pebble`, `nginx` and a Docker daemon are unavailable.
- **#33 cap contract is verified in disposable form, real capacity is OPEN.** Upstream OpenWA Jest tests for `MAX_CONCURRENT_SESSIONS` passed 10/10; a mock-API drill created 8 sessions, rejected the 9th, released slots and recovered from a simulated failure. Real Chromium/WhatsApp memory and startup under load remain unmeasured.
- **#34 webhook re-registration is verified for the code path.** A disposable local-PostgreSQL + mock-OpenWA test proves loopback replacement, preservation of a valid registration, idempotent retry and partial-failure recovery.
- **Paired recovery drill passes on disposable data.** PostgreSQL 3/3 rows restore and OpenWA SQLite/session/auth checksums restore into isolated directories (`test-backup-scripts.sh`).
- CI now runs certificate validation, Compose validation, resource budget, deployment scripts and the mock capacity drill in addition to the existing gates.

**END OF PLAN — NO DEPLOYMENT ACTIONS HAVE BEEN AUTHORIZED OR PERFORMED.**
