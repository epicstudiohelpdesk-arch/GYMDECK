# GymDeck Email Line — Phase 2A Architecture Assessment

**Date:** 2026-11-21
**Mode:** Read-only engineering assessment (no source, schema, migration, config, DNS, or provider changes)
**Target:** Introduce Brevo as a second delivery provider while preserving Postal and all existing invariants
**Repository:** `epicstudiohelpdesk-arch/GymDeck`

**Evidence convention**

- **[Verified]** means confirmed from the current working tree by reading the referenced file/lines.
- **[Documented]** means confirmed from Brevo's current official documentation (links in §16).
- **[Recommendation]** means proposed design, not implemented.
- **[Assumption]** means a decision still needs confirmation.

**Method and limits:** this assessment was static. No source was modified, no tests were executed, and no emails were sent. Structural claims come from code inspection; runtime behavior (including the 401 path) was not exercised against a running server.

---

## 0. Executive summary

The existing design already has the right primitives: a durable outbox, lease-based worker recovery, per-attempt dispatch records, atomic quota reservation, a whitelist of provider error categories, and a delivery event ledger. It can support a second provider **without a rewrite**.

It is **not safe to add a Brevo adapter today**, because several pre-existing correctness defects would be inherited or amplified:

1. **The email router is mounted without authentication**, so every tenant-scoped email endpoint receives no `req.user` and returns 401. **[Verified]**
2. **Quota reservations leak** whenever recipients are suppressed, a batch permanently fails, or enqueue fails between statements. There is no transaction around reserve → message → recipients → outbox. **[Verified]**
3. **Broadcasts larger than one batch (25 recipients) break**: the re-queued slice reuses attempt number 1, violating `uq_email_dispatch_attempt_num`, and is then misclassified as ambiguous. **[Verified]**
4. **A crash after provider acceptance but before recipient/quota updates can cause duplicate sends**: lease recovery only treats `DISPATCHING` as ambiguous; an `ACCEPTED` attempt is reset to `PENDING`, re-sending recipients that are still `QUEUED`. **[Verified]**
5. **The webhook resolver assumes one recipient per provider message ID**. Brevo returns one `messageId` for a multi-recipient API call, so that lookup would mutate an arbitrary recipient. **[Verified logic + documented Brevo response]**

**Recommendation:** **NO-GO for Brevo adapter work until Phase 2B correctness fixes land.** Then proceed through a Postal-parity adapter, additive schema scoping, Brevo adapter, Brevo webhook, and a controlled cutover. Do **not** implement automatic cross-provider failover.

---

## 1. Existing architecture and exact references

| Layer | Implementation | Reference |
| --- | --- | --- |
| HTTP app | Express, Helmet, CORS, JSON body with raw-body capture | `backend/gateway/src/app.ts:24-64` |
| Route mounting | Email API at `/v1/owner/email`; webhooks at `/v1/webhooks` | `backend/gateway/src/routes/index.ts:25-36` |
| Email routes | Compose/send, drafts, history, message detail, templates, Postal alias | `backend/gateway/src/routes/email.ts:1-181` |
| Canonical webhooks | OpenWA + Postal | `backend/gateway/src/routes/webhooks.ts:31-64` |
| Auth middleware | JWT → `req.user` | `backend/gateway/src/middleware/authMiddleware.ts:16-39` |
| RBAC | `requirePermission`, OWNER/ADMIN bypass | `backend/gateway/src/middleware/rbacMiddleware.ts:58-88` |
| Business service | Quota reservation, idempotency, message/recipient/outbox creation | `backend/services/email/emailService.ts:168-277` |
| Quota | Asia/Kolkata period, conditional atomic reserve, commit/release | `backend/services/email/quotaService.ts:24-179` |
| Delivery worker | Lease lock, suppression, dispatch attempt, Postal call, retries | `backend/services/email/deliveryWorker.ts:1-496` |
| Postal client | HTTP send, error classification, ambiguity, Retry-After, mock mode | `backend/services/email/postalClient.ts:119-303` |
| Postal webhook auth | RSA-SHA256 / RSA-SHA1 public-key verification, KID registry | `backend/services/email/postalWebhookAuth.ts:1-208` |
| Postal webhook processor | Dedupe by provider event UUID, state transitions, suppression | `backend/services/email/webhookService.ts:44-256` |
| Schema | Messages, recipients, outbox, attempts, quota, suppressions, events, quarantine | `backend/shared/database/schema/email.ts:17-227` |
| Migrations | Email system, attempts/leases, provider-instance scoping | `backend/shared/database/migrations/0007`, `0008`, `0009` |
| Config | Postal, quota, worker, staging safety, Brevo credential placeholders | `backend/shared/config/index.ts:65-107` |
| Server lifecycle | Worker started only when `NODE_ENV !== test` | `backend/gateway/src/server.ts:45-58` |
| Brevo config (Phase 1) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | `backend/shared/config/index.ts:81-85` |

**Provider support today:** Postal only. The worker hardcodes `provider: 'POSTAL'` and imports `postalClient` directly (`deliveryWorker.ts:21`, `:249`, `:273`). There is no provider interface.

---

## 2. Complete email lifecycle (verified)

### 2.1 Intake

1. `POST /v1/owner/email/send` is expected to carry a JWT.
2. `tenantContext(req)` derives `gymId`/`userId` **only** from `req.user` (`email.ts:25-30`). No frontend `gym_id` is trusted.
3. Zod validates subject, HTML, recipients (1–1,000), optional idempotency key (`email.ts:33-46`).
4. Rate limit: 15 sends/minute keyed by `req.user.gymId` (`email.ts:15-19`).
5. **Defect:** `emailRouter` is mounted without `requireAuth` (`routes/index.ts:25`), unlike `owner.ts:28`, `member.ts:80`, `cctv.ts:138`. Therefore `req.user` is unset on every email route except the Postal alias, and `requirePermission` returns 401 before any handler runs. **[Verified by code path]**

### 2.2 Enqueue

`EmailService.sendEmail` (`emailService.ts:168-277`):

1. Validates subject/body.
2. Idempotency lookup by `(gymId, idempotencyKey)` (`:178-193`).
3. Normalizes lowercase emails and deduplicates (`:195-209`).
4. `reserveQuota(gymId, count)` (`:213`) — conditional `UPDATE ... WHERE remaining >= count`, atomic for the single row (`quotaService.ts:92-146`).
5. Loads gym sender defaults (`:215-220`) and hardcodes `fromAddress = config.POSTAL_DEFAULT_FROM_EMAIL` (`:221`).
6. Inserts `email_messages` with `status='QUEUED'`, `queued_at` (`:224-243`).
7. Bulk-inserts `email_recipients` with `deliveryStatus='QUEUED'` (`:246-255`).
8. Inserts `email_outbox` with `jobStatus='PENDING'`, `nextAttemptAt=now` (`:257-263`).
9. Fire-and-forget `setImmediate(processOutboxJobs)` (`:265-267`); the interval worker also runs (`server.ts:56`).

**No transaction spans steps 4–8.** Any failure after 4 leaks reserved quota; any failure after 6 leaves a message without an outbox job.

### 2.3 Worker dispatch

`processOutboxJobs` (`deliveryWorker.ts:127-166`):

1. Recovers expired leases (`:36-124`).
2. `UPDATE email_outbox SET PROCESSING, lease=now+5m WHERE status='PENDING' AND next_attempt_at<=now RETURNING *` — no `LIMIT`, no `ORDER BY`, no `SKIP LOCKED` (`:137-156`).
3. For each job, `processSingleJob`:
   - Loads the message scoped by `(id, gymId)` (`:171-186`).
   - Selects up to `EMAIL_BATCH_SIZE` (default 25) `QUEUED` recipients, no stable ordering (`:188-204`).
   - Checks suppressions **by email only, across all tenants** (`:206-215`); marks matches `SUPPRESSED` (`:217-231`).
   - Inserts `email_dispatch_attempts` with `attemptStatus='DISPATCHING'`, `provider='POSTAL'`, batch recipient IDs, 5-minute lease (`:239-261`); stores `currentAttemptId` on the outbox (`:263-273`).
   - Calls Postal (`:275-296`).
   - On error, records an attempt status (`UNKNOWN_OUTCOME`/`REJECTED`/`FAILED`) and rethrows (`:298-331`).
   - On success, marks the attempt `ACCEPTED` with provider `message_id` and full response JSON (`:334-347`), marks each recipient `SENT` with provider message ID/token and increments `attempts` (`:349-365`).
   - Converts quota per slice: `commitQuota(gymId, period, activeCount, activeCount)` (`:358-359`), sets message `SENDING` (`:361-367`).
   - If no `QUEUED` recipients remain, message/outbox become `COMPLETED`; otherwise the outbox is set back to `PENDING` for the next slice (`:369-407`).

### 2.4 Failure paths

- Ambiguous (timeout, 5xx, 429 per `postalClient.ts:279-288`) → outbox `RECONCILIATION_REQUIRED`, no retry (`deliveryWorker.ts:410-427`).
- Permanent 4xx/auth → outbox `FAILED`, message `FAILED`; **recipients stay `QUEUED` and quota stays reserved** (`:429-451`).
- Definite transient (`CONNECTION_FAILED`) → exponential backoff with jitter, ceiling 30 min, honoring `Retry-After`; max 5 attempts (`:453-487`).
- Expired lease → `DISPATCHING` becomes `UNKNOWN_OUTCOME`/`RECONCILIATION_REQUIRED`; anything else is reset to `PENDING` (`:63-108`).

### 2.5 Delivery events

Postal webhook → signature verification (`postalWebhookAuth.ts`) → `handleWebhook`:

1. Requires UUID event ID; malformed → quarantine (`webhookService.ts:54-77`).
2. Requires numeric Postal message ID; fallback by email is explicitly rejected (`:80-92`).
3. Resolves recipient by `(provider_message_id, provider_instance_id)` and `LIMIT 1` (`:97-106`).
4. Inserts `email_delivery_events` with `onConflictDoNothing`; no insert means duplicate (`:136-158`).
5. Applies state transition and counters (`:160-222`); hard bounce inserts suppression (`:190-205`).
6. `MessageSent` **and** `MessageDelivered` both map to `DELIVERED` (`:161-178`).

### 2.6 State vocabulary today

- Message: `DRAFT | QUEUED | SENDING | COMPLETED | FAILED | CANCELLED`.
- Recipient: `QUEUED | SENT | DELIVERED | BOUNCED | FAILED | SUPPRESSED`.
- Outbox: `PENDING | PROCESSING | COMPLETED | FAILED | RECONCILIATION_REQUIRED`.
- Attempt: `PREPARED | DISPATCHING | ACCEPTED | REJECTED | UNKNOWN_OUTCOME | RECONCILIATION_REQUIRED | FAILED_PERMANENT`.

Missing required distinctions: provider-accepted vs delivered (collapsed), `DEFERRED`, `BLOCKED`, `REJECTED`, `COMPLAINED`, `UNKNOWN`.

---

## 3. Strengths and weaknesses

### 3.1 Strengths

- Server-authoritative tenant context; no client-supplied gym ID in the email flow. **[Verified]**
- Atomic quota reservation at the row level. **[Verified]**
- Durable outbox and durable attempt records before provider calls. **[Verified]**
- Explicit ambiguity handling with no blind retry. **[Verified]**
- Provider capability probe for Postal (`getMessage`) exists for reconciliation. **[Verified]**
- Webhook signature verification and event quarantine for Postal. **[Verified]**
- Per-gym isolation in queries (message, recipient, history) is consistently applied. **[Verified]**

### 3.2 Weaknesses (ordered by migration impact)

| ID | Severity | Finding | Reference |
| --- | --- | --- | --- |
| W1 | **P0** | Email API mounted without `requireAuth`; all tenant email endpoints 401 | `routes/index.ts:25`; `email.ts:25-30` |
| W2 | **P0** | Send pipeline is not transactional; quota can leak on any partial failure | `emailService.ts:213-263` |
| W3 | **P0** | Idempotency is check-then-insert; concurrent duplicates hit the unique index as a 500 and leak quota | `emailService.ts:180-193`, `:224` |
| W4 | **P0** | Quota is never released for suppressed recipients or permanent provider rejection | `deliveryWorker.ts:217-231`, `:429-451`, `:359` |
| W5 | **P0** | Multi-batch sends reuse attempt number 1 after re-queue → unique violation → `RECONCILIATION_REQUIRED` for any send > 25 recipients | `deliveryWorker.ts:236`, `:399`; migration `0008` |
| W6 | **P0** | Crash after `ACCEPTED` but before recipient/quota updates: lease recovery re-queues and re-sends still-`QUEUED` recipients; if recipients were marked `SENT` but quota was not committed, the reservation instead leaks | `deliveryWorker.ts:63`, `:104`, `:349-359` |
| W7 | **P1** | Webhook resolves one recipient by message ID; Brevo shares one message ID across recipients | `webhookService.ts:101-106` |
| W8 | **P1** | Provider event uniqueness is global, not scoped to provider instance; 0009 does not change it | `schema/email.ts:210`; `0007`, `0009` |
| W9 | **P1** | Suppression dedupe is ineffective: `onConflictDoNothing` without a unique index | `webhookService.ts:198-205`; no constraint in `0007` |
| W10 | **P1** | Staging live-test allowlist config is never enforced in application code; test 4.1 only tests a local array | `config/index.ts:93-103`; `test/phase4ControlledLiveTest.test.ts:31-40` |
| W11 | **P1** | `POSTAL_INSTANCE_ID` is read from `process.env` but is not in the config schema; recipients default to `default` | `webhookService.ts:97`; config has no key |
| W12 | **P1** | No provider snapshot on messages/outbox; a config switch can change provider for jobs already queued | schema/outbox |
| W13 | **P2** | `MessageSent` is treated as `DELIVERED`, collapsing accepted vs delivered | `webhookService.ts:161-178` |
| W14 | **P2** | Out-of-order webhooks can overwrite newer state; only event dedupe exists | `webhookService.ts:136-222` |
| W15 | **P2** | No complaint (`spam`) handling or complaint suppression | `webhookService.ts:225-250` |
| W16 | **P2** | Worker lock takes the whole due queue without limit/order | `deliveryWorker.ts:137-156` |
| W17 | **P2** | Route permission names do not match the permission catalogue (`communications.write` vs `communications.send`) | `email.ts:79`; `rbacMiddleware.ts:8-27` |
| W18 | **P2** | Provider rejection leaves recipients `QUEUED` and message counters inconsistent | `deliveryWorker.ts:429-451` |

> W1–W6 are not Brevo-specific. They must be fixed first, otherwise Brevo inherits them and the migration cannot be validated honestly.

---

## 4. Proposed provider abstraction

### 4.1 Principles

- The worker owns state transitions; adapters only translate.
- Business logic (quota, suppression, tenant checks, retries, idempotency) stays provider-independent.
- Provider is **snapshotted at enqueue**, not resolved per retry, so an in-flight broadcast cannot switch providers mid-flight.
- No cross-provider retry, ever. A failed/ambiguous submission is reconciled on the provider that saw it.
- Adapters support a `mock` mode for CI, as Postal does today.

### 4.2 Interface (recommendation)

```ts
type ProviderId = 'postal' | 'brevo';

interface ProviderMessage {
  to: Array<{ email: string; name?: string }>;
  from: { name: string; email: string };
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  tag?: string;
  metadata: { gymId: string; messageId: string; attemptId: string };
}

interface ProviderSendResult {
  accepted: true;
  providerMessageId: string | null;
  recipientResults: Array<{ email: string; providerMessageId?: string; token?: string }>;
  httpStatus: number;
  raw: unknown;
}

type ProviderErrorCategory =
  | 'AUTH_FAILED'
  | 'CLIENT_REJECTED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'CONNECTION_FAILED'
  | 'AMBIGUOUS_TIMEOUT';

interface ProviderErrorInfo {
  category: ProviderErrorCategory;
  retryable: boolean;
  ambiguous: boolean;
  httpStatus?: number;
  providerCode?: string;
  retryAfterSeconds?: number;
}

interface EmailProvider {
  readonly id: ProviderId;
  readonly instanceId: string;

  send(msg: ProviderMessage, ctx: { idempotencyKey: string; signal: AbortSignal }): Promise<ProviderSendResult>;

  classifyError(err: unknown): ProviderErrorInfo;

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): { valid: boolean; reason?: string };

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): ProviderEvent | null;

  mapEvent(event: ProviderEvent): {
    recipientEmail: string;
    outcome: 'ACCEPTED' | 'DELIVERED' | 'DEFERRED' | 'BOUNCED' | 'BLOCKED' | 'COMPLAINED' | 'REJECTED' | 'UNSUBSCRIBED' | 'TELEMETRY';
    occurredAt: Date;
    reason?: string;
  };

  /** Optional; only Postal supports it today. */
  probe?(providerMessageId: string): Promise<'accepted' | 'delivered' | 'failed' | 'unknown' | null>;
}
```

### 4.3 Adapter responsibilities

| Concern | Postal adapter | Brevo adapter |
| --- | --- | --- |
| Endpoint | `/api/v1/send/message` | `POST /v3/smtp/email` |
| Auth | `X-Server-API-Key` | `api-key` header |
| Recipient IDs | Per-recipient numeric ID + token | Single `messageId` for the call (batch `messageIds` for versions) |
| Idempotency | None | `headers.idempotencyKey` UUID, 15-minute TTL **[Documented]** |
| Webhook auth | RSA-SHA256/legacy RSA-SHA1 + KID | No payload signature; Bearer/basic/custom header configured at webhook creation **[Documented]** |
| Webhook identity | Event UUID | No event ID; fingerprint required |
| Rate-limit signal | `Retry-After` | 429 plus `x-sib-ratelimit-*` headers; no standard `Retry-After` **[Documented]** |
| Reconciliation | `messages/message` probe | Transactional log/event lookup; no guaranteed lookup by client reference |

### 4.4 Provider selection

**[Recommendation]** Select one active provider per environment through config, e.g.:

```env
EMAIL_DELIVERY_PROVIDER=postal   # postal | brevo
POSTAL_INSTANCE_ID=postal-default
BREVO_INSTANCE_ID=brevo-default
BREVO_DELIVERY_MODE=mock          # mock | live
```

For Phase 2, a **global per-environment switch** is the safest option. Per-gym provider selection adds a policy surface, UI, and more tests; it can come later via a `gym_email_provider_settings` table if genuinely needed.

Selection outcomes:

1. **Brevo primary, Postal retained as controlled alternative (recommended).** One code path, provider snapshot, manual rollback. Trade-off: a single shared Brevo account carries all tenants and its plan limits.
2. Postal primary, Brevo warm standby. Lower risk, but Brevo remains unexercised in production.
3. Per-environment selection (subset of 1). Recommended for staging vs production.
4. Automatic failover. **Rejected.** A timeout after acceptance is indistinguishable from a pre-acceptance failure without provider reconciliation; retrying on another provider can duplicate mail. Only manual failover after draining and reconciling is safe.

---

## 5. Database changes — only what is genuinely necessary

All changes are additive and forward-only. None are authorized in this phase.

### 5.1 Required for correctness

1. **Provider snapshot**
   - `email_messages.provider VARCHAR(32) NOT NULL DEFAULT 'POSTAL'`
   - `email_messages.provider_instance_id VARCHAR(128) NOT NULL DEFAULT 'default'`
   - Backfill existing rows to Postal/default; new rows set from config inside the enqueue transaction.
   - Rationale: prevents mid-flight provider switches (W12) and lets webhook routing know the provider.

2. **Batch identity on attempts**
   - `email_dispatch_attempts.batch_index INTEGER NOT NULL DEFAULT 0`
   - Replace `uq_email_dispatch_attempt_num (outbox_id, attempt_number)` with `(outbox_id, batch_index, attempt_number)`.
   - Rationale: fixes W5 without overloading `attempts` (which is also the retry counter).

3. **Provider-scoped webhook dedupe**
   - `email_delivery_events.provider VARCHAR(32) NOT NULL DEFAULT 'POSTAL'`
   - Drop global `uq_provider_event_id`; add `UNIQUE (provider, provider_instance_id, provider_event_id)`.
   - For Brevo, `provider_event_id` is a SHA-256 fingerprint (see §7) because Brevo supplies no event UUID.
   - Rationale: fixes W8 and makes dedupe meaningful across two providers.

4. **Suppression uniqueness**
   - `CREATE UNIQUE INDEX ... ON email_suppressions (gym_id, email_address) WHERE gym_id IS NOT NULL;`
   - `CREATE UNIQUE INDEX ... ON email_suppressions (email_address) WHERE gym_id IS NULL;`
   - Rationale: makes `onConflictDoNothing` effective (W9) and preserves the documented global-suppression option.

5. **Event ordering**
   - `email_recipients.last_event_at TIMESTAMPTZ` and `last_event_rank SMALLINT` (or equivalent), updated only when `(ts_event, rank)` is newer.
   - Rationale: fixes W14 without relying on arrival order.

### 5.2 Not necessary yet

- A new provider table, provider credentials table, or per-gym provider policy table: defer until per-gym selection is actually required.
- New status columns: statuses are unconstrained `VARCHAR`; add constants/documentation, not columns.
- A separate webhook table per provider: the existing event ledger plus quarantine is sufficient.
- Changing quota tables: current schema supports the required accounting once reservation release is fixed.

---

## 6. API and worker changes

### 6.1 API

1. Mount `requireAuth` for the email router (`routes/index.ts`), or mount email under the authenticated owner router. Keep the signed webhook alias public.
2. Align permissions: use `communications.send` (already in the catalogue) or add `communications.write` to the catalogue with explicit role mapping. Add route tests that prove 401/403/202.
3. Wrap enqueue in a single DB transaction:
   - reserve quota (tx-aware),
   - idempotent `INSERT ... ON CONFLICT (gym_id, idempotency_key) DO NOTHING RETURNING`,
   - on conflict, select and return the existing message without reserving again,
   - insert recipients,
   - insert outbox with provider snapshot.
4. Pre-filter suppressed addresses before reservation, and return counts of excluded recipients; the worker must still recheck at dispatch time.
5. Enforce staging allowlist (`EMAIL_STAGING_LIVE_TEST_ENABLED`, `EMAIL_STAGING_AUTHORIZED_RECIPIENTS`, daily cap) in the service before enqueue **and** in the worker before provider call. Today the config is unused (W10).
6. Reject/limit recipient count consistently with provider caps (Brevo 2,000 total per request; GymDeck route already caps 1,000).
7. Return the existing message on idempotent replay with a stable HTTP 202; do not double-reserve.

### 6.2 Worker

1. Resolve the snapshotted provider from the message; never from current config alone.
2. Insert attempts with `batch_index`; increment it per slice, independent of retry count.
3. Claim only a bounded number of jobs (`LIMIT`, `ORDER BY next_attempt_at`, `FOR UPDATE SKIP LOCKED`) to support multiple instances.
4. On suppression, release reserved quota for suppressed recipients (or exclude them before reservation).
5. On permanent rejection/failure, release reservation for recipients never accepted; mark those recipients `REJECTED`/`FAILED`, not `QUEUED`.
6. On acceptance:
   - persist attempt `ACCEPTED` with provider ID,
   - update recipients and commit quota in the **same transaction**,
   - only then mark the job complete/slice done.
7. Lease recovery must distinguish:
   - `DISPATCHING` + no provider ID → ambiguous reconciliation,
   - `ACCEPTED` + unapplied recipients → **reconcile/apply**, never re-send,
   - `PREPARED`/no attempt → safe requeue.
8. Add heartbeat renewal for long batches, or keep batch/send timeouts well below the lease.
9. Never log API keys, full message bodies, or provider request headers. Log provider code/message, attempt ID, job ID, redacted recipient counts.

---

## 7. Webhook design

### 7.1 Postal (retain)

- Keep RSA-SHA256 verification and KID rotation.
- Keep UUID-based event dedupe, but scope it through the new `(provider, instance, event_id)` key.
- Fix recipient lookup to tolerate one message ID per recipient (Postal already does).
- Correct the mapping: `MessageSent` → provider accepted (`SENT`), `MessageDelivered` → `DELIVERED` (W13). Treat this as a behavior change with regression tests.

### 7.2 Brevo (new)

**Authentication [Documented]**

Brevo does **not** sign transactional webhook payloads. Security must be configured when creating the webhook (`POST /v3/webhooks`):

- `auth: { type: "bearer", token: "<secret>" }`, or
- basic credentials embedded in the URL, or
- custom headers.

Recommendation: Bearer token or custom header, stored backend-only, verified with `crypto.timingSafeEqual`; reject missing/mismatched credentials with 401. Optionally restrict source IPs at the edge if Brevo publishes stable ranges — do not assume that.

**Event identity and dedupe**

Brevo payloads include `message-id`, `email`, `event`, `ts_event`, `ts_epoch`, and the webhook `id` (configuration ID, not an event ID). Therefore:

```text
provider_event_id = sha256(`${provider}|${instance}|${message-id}|${email}|${event}|${ts_event}`)
```

Store the raw payload and insert with the scoped unique key; a duplicate insert is a no-op.

**Recipient resolution**

Resolve by `(provider, provider_instance_id, provider_message_id, lower(email))`. For Brevo, one `messageId` covers multiple recipients, so email is mandatory in the lookup. Never trust the webhook's `email` to choose a gym; derive the gym from the matched recipient row.

**Event mapping [Documented names, mapping recommended]**

| Brevo event | Recipient state | Suppression |
| --- | --- | --- |
| `request` / `sent` | `SENT` (provider accepted) | No |
| `delivered` | `DELIVERED` | No |
| `deferred` | `DEFERRED` | No |
| `soft_bounce` | `DEFERRED` (increment soft-bounce count) | After policy threshold only |
| `hard_bounce` | `BOUNCED` | `HARD_BOUNCE` |
| `spam` | `COMPLAINED` | `COMPLAINT` |
| `invalid_email` / `invalid` | `BLOCKED` | `INVALID_ADDRESS` (decide) |
| `blocked` | `BLOCKED` | Policy decision |
| `unsubscribed` | `UNSUBSCRIBED` | `UNSUBSCRIBE` |
| `opened`, `click`, proxy-open variants | Telemetry only | No |
| `error` / unknown | `UNKNOWN` or log-only | No |

**Out-of-order events**

Use `ts_event` (seconds, UTC) and a precedence rank (`DELIVERED` > `DEFERRED` > `SENT`; terminal bounce/complaint wins over earlier non-terminal states). Apply only if newer; late events still go to the ledger.

**Batched webhooks**

Brevo supports batched webhooks. Treat a batch as an array of events, verify auth once, and process each event idempotently in its own transaction. **[Assumption]** confirm the exact batched payload shape for the account before implementation.

---

## 8. Security and tenant-isolation analysis

| Control | Current | Required |
| --- | --- | --- |
| Gym identity | `req.user.gymId` in service; no client gym ID | Preserve; add route auth (W1) |
| Email API auth | Missing `requireAuth` on mount | Add middleware; test 401 |
| Permission model | `communications.write` not in catalogue | Align with `communications.send` |
| Provider credentials | Backend `.env` only; no frontend references | Keep; adapter reads config at startup; never return in errors |
| Webhook authenticity | Postal RSA signature | Postal unchanged; Brevo bearer/custom header |
| Webhook tenant integrity | Resolved via recipient row | Preserve; never trust payload email/gym |
| Event dedupe | Global UUID | Scope by provider + instance; fingerprint for Brevo |
| Suppression | Email-only, cross-tenant | Document intent; dedupe index; avoid cross-tenant surprise |
| Message content logging | Worker logs errors only | Ensure provider errors cannot embed bodies/headers |
| Staging safety | Config present, not enforced | Enforce allowlist + daily cap in service and worker |
| Secrets in CI | Audit greps for AWS/DB patterns only | Add generic provider-key/secret scanners; never commit `.env` |

Cross-tenant risks to test explicitly:

- Brevo one-message-many-recipients lookup (W7) could mutate another gym's recipient if the query is not email-scoped.
- Global event uniqueness (W8) could let one tenant's event ID suppress another's legitimate event.
- Global suppressions intentionally affect all tenants; this must be a product decision, not an accident.

---

## 9. Quota and idempotency analysis

### 9.1 Quota invariants

- 300 recipient units per gym per Asia/Kolkata month; 40 recipients = 40 units.
- Reservation is atomic today; that part is sound.
- Consumption must occur only on provider acceptance, once per recipient per message.
- Reservation must be released on suppression, enqueue failure, permanent rejection, or cancellation.
- Ambiguous outcomes must **hold** the reservation until reconciled; neither consume nor release.

### 9.2 Verified quota defects

1. **Suppressed recipients are never released.** Worker excludes them from `activeRecipients` and commits only the active count (`deliveryWorker.ts:217-231`, `:359`). Reserved units remain forever.
2. **Permanent failure leaks the whole batch.** Outbox/message become `FAILED`, but no `releaseReservedQuota` call exists (`:429-451`), and recipients remain `QUEUED`.
3. **Enqueue failures leak.** Reserve happens before message/recipient/outbox inserts, with no transaction or compensation (`emailService.ts:213-263`).
4. **Idempotency conflict leaks.** The check-then-insert race loses on the unique index after quota is reserved; the request returns an error and the reservation is orphaned.
5. **Multi-batch breakdown strands the remainder.** The first 25 consume; the rest stay reserved when attempt insertion fails (W5).

### 9.3 Idempotency design

**API request idempotency**

- Rely on the existing partial unique index `(gym_id, idempotency_key)`.
- Use `INSERT ... ON CONFLICT DO NOTHING RETURNING`; on empty result, `SELECT` the existing message and return it.
- Reserve quota only after winning the insert, or reserve + insert in one transaction with the conflict path releasing nothing.
- Never return a 500 for a legitimate replay.

**Provider idempotency (Brevo) [Documented]**

- Brevo accepts `headers.idempotencyKey` as a UUID; TTL is **15 minutes**.
- Use a deterministic UUID per `(outbox job, batch_index)` — for example UUIDv5 over those IDs, or a UUID stored in the attempt before calling.
- Reuse the exact key for retries within the TTL.
- **Never** auto-retry an ambiguous Brevo submission after 15 minutes; the key may have expired and a retry could duplicate. Route to reconciliation instead.
- Postal has no equivalent; keep its ambiguity rule.

**Ambiguous submission**

A timeout after Brevo accepted the request but before GymDeck stored the response is the core risk. Safe handling:

1. Attempt is `DISPATCHING`; lease recovery marks `UNKNOWN_OUTCOME` / `RECONCILIATION_REQUIRED`.
2. Do not resend, on either provider.
3. Reconciliation options: query Brevo transactional events/logs by `messageId` if known; if unknown, the idempotency key may allow a safe retry **only inside the 15-minute TTL**; otherwise require operator resolution.
4. Record the outcome explicitly; never infer "not sent" from a missing response.

---

## 10. Retry and failure-recovery strategy

### 10.1 Recommended classification

| Condition | Retry? | Quota | State |
| --- | --- | --- | --- |
| 400/422 invalid payload, invalid recipient | No | Release | `REJECTED` |
| 401/403 auth | No (alert) | Release | `FAILED` |
| Brevo `not_enough_credits`, `account_under_validation` | No (alert) | Release | `FAILED` |
| 429 rate limit | Yes if provider proves non-acceptance; with idempotency key safe within TTL | Hold | `PENDING` with backoff |
| Connection refused / DNS | Yes | Hold | `PENDING` |
| Timeout / socket reset after send | No auto-retry | Hold | `RECONCILIATION_REQUIRED` |
| 5xx | No auto-retry unless idempotency key is still valid and reuse is guaranteed | Hold | `RECONCILIATION_REQUIRED` |
| Brevo duplicate idempotency response | Treat as accepted; reconcile message ID | Consume when confirmed | `ACCEPTED`/`UNKNOWN` |

### 10.2 Backoff

- Keep bounded exponential backoff with full jitter.
- Base 10 s, factor 2, cap 30 min, max 5 attempts (current values are reasonable).
- For Brevo, parse `x-sib-ratelimit-reset` (seconds) when present; do not assume `Retry-After`.
- Add a per-provider concurrency/rate budget so multiple workers cannot exhaust the shared Brevo plan.

### 10.3 Worker recovery state machine (recommended)

```text
PENDING -> PROCESSING -> DISPATCHING -> ACCEPTED -> APPLIED -> COMPLETED
                              |            |
                              |            +--> crash before APPLIED: reconcile, do not resend
                              +--> timeout/5xx: RECONCILIATION_REQUIRED
                              +--> 4xx: REJECTED (release quota)
```

`APPLIED` must mean recipients and quota were committed in one transaction. This closes W6.

---

## 11. Migration sequence (Phase 2B onward)

### Phase 2B — Correctness gates (no Brevo code)

1. Add `requireAuth` to the email router; fix permission naming; add route auth tests.
2. Make enqueue transactional; implement conflict-safe idempotency.
3. Release quota on suppression, rejection, and enqueue failure.
4. Fix multi-batch attempt identity and add a >25-recipient test.
5. Fix recovery after `ACCEPTED` so it applies rather than resends.
6. Enforce staging allowlist in service and worker; replace the fake test.
7. Fix Postal webhook recipient matching/dedupe scope only as far as needed for parity.

**Exit criteria:** all Phase 2B tests pass against PostgreSQL; no quota leak under injected failures.

### Phase 2C — Provider interface with Postal parity

1. Extract `EmailProvider` and a Postal adapter; no behavior change.
2. Worker resolves provider from the message snapshot (default Postal).
3. Contract tests run the same suite against the Postal adapter in mock mode.

**Exit criteria:** Postal behavior and existing tests unchanged.

### Phase 2D — Additive schema migration

1. Provider snapshot columns + backfill.
2. Attempt `batch_index` + new unique constraint.
3. Scoped event uniqueness; `provider` on events.
4. Suppression partial unique indexes.
5. Event ordering columns.

Deploy code first or migration first only if backward compatible; all columns have defaults.

### Phase 2E — Brevo adapter

1. Implement send, error classification, mock mode, and idempotency key.
2. Handle one `messageId` per call across N recipients.
3. Unit tests: 201, 400, 401, 429, 5xx, timeout, duplicate idempotency, malformed JSON.
4. No production switch.

### Phase 2F — Brevo webhook

1. Create the Brevo webhook with Bearer auth and the required event list.
2. Verify auth, fingerprint dedupe, recipient resolution by message ID + email, ordering, suppression.
3. Add quarantine for malformed payloads.
4. Staging end-to-end: allowlisted recipient only.

### Phase 2G — Controlled cutover

1. Reconcile all existing `RECONCILIATION_REQUIRED` jobs.
2. Switch staging to Brevo; run the full matrix.
3. Switch production config; new messages snapshot Brevo; queued Postal jobs finish on Postal.
4. Keep Postal webhook and provider code active.
5. Rollback: set new messages to Postal; do not delete jobs; continue Brevo webhook processing to close events.

---

## 12. Testing matrix

| Area | Test | Type |
| --- | --- | --- |
| API auth | No token → 401; wrong gym claim ignored; permission denied → 403 | Integration |
| Sender | Unverified sender → provider rejection, no quota consumption | Integration |
| Acceptance | Brevo 201 → attempt `ACCEPTED`, recipients `SENT`, quota consumed once | Integration |
| Rejection | 400/422 → `REJECTED`, quota released for unsent recipients | Unit + integration |
| Timeout | Abort after request sent → `RECONCILIATION_REQUIRED`, no retry | Failure injection |
| Worker crash | Crash after `DISPATCHING`; crash after `ACCEPTED`; assert no duplicate send | Failure injection |
| Duplicate workers | Two workers claim concurrently; one dispatch only | Integration |
| Duplicate webhooks | Same fingerprint twice → one event, one counter increment | Integration |
| Out-of-order | `delivered` then older `sent`; state stays delivered | Integration |
| Rate limit | 429 + reset header → backoff, no quota loss | Unit |
| Invalid recipient | Provider invalid/blocked event → suppressed, no retry | Integration |
| Soft bounce | `soft_bounce` → deferred, no hard suppression | Integration |
| Hard bounce | → bounced + suppression; later sends excluded | Integration |
| Complaint | `spam` → complained + suppression | Integration |
| Quota boundary | 299+2 rejected atomically; exactly 300 succeeds | Integration |
| Month rollover | Asia/Kolkata month change resets period; jobs created in prior month billed to prior period | Time-injection |
| Cross-tenant | Forged message ID/email cannot mutate another gym; scoped event dedupe | Security integration |
| Concurrency | 20 simultaneous sends never exceed quota | Load test |
| Multi-batch | 26/40/101 recipients: all accepted, attempts unique, quota exact | Integration |
| Postal parity | Existing Postal suite passes through adapter | Contract |
| Brevo parity | Same suite against Brevo mock; one live allowlisted send in staging | Contract + staging |
| Secret hygiene | Bundle/log scan contains no provider key | CI |

CI should run the full `test/*.test.ts` matrix (already done in `.github/workflows/backend-ci.yml:53-62`), but email tests must not require live provider credentials; default to mock and gate live tests behind an explicit env flag.

---

## 13. Deployment and rollback

**Deployment**

1. Apply additive migrations (defaults preserve Postal).
2. Deploy Phase 2B–2D code with `EMAIL_DELIVERY_PROVIDER=postal`.
3. Enable Brevo in staging with allowlist and mock/live modes; verify webhook.
4. Production cutover by config only; no schema change at cutover.
5. Monitor: accepted vs delivered, 429s, quota remaining, reconciliation queue, suppressions.

**Rollback**

- Flip `EMAIL_DELIVERY_PROVIDER=postal` for new messages.
- Do not delete Brevo attempts or events; keep the Brevo webhook active until all accepted messages reach terminal state.
- Do not resend anything; ambiguous jobs remain in reconciliation.
- Keep schema changes (additive, backward compatible).

---

## 14. Risks and unresolved decisions

### Critical risks

1. **Shared Brevo plan limits.** One account serves all gyms; the plan's daily allowance is independent of the per-gym 300/month quota. Aggregate demand can exhaust it. Need provider-level budgeting and alerting. Exact current free-plan allowance must be read from the account/dashboard, not assumed. **[Assumption]**
2. **Idempotency TTL.** Brevo's 15-minute window does not cover long backoff. Retries after expiry are unsafe.
3. **No Brevo provider probe by client reference.** If a timeout occurs before a `messageId` is known, reconciliation may require operator action or the transactional log UI.
4. **No webhook signature.** Bearer secret becomes a high-value credential; rotate and never log it.
5. **Multi-recipient message IDs.** Any code path that assumes one message ID per recipient is unsafe for Brevo (W7).
6. **Global suppression semantics.** Cross-tenant suppression may be desirable for abuse prevention but must be explicit.
7. **Account validation/plan state.** Brevo may restrict sending while the account is under validation; surface as a non-retryable alert.

### Unresolved questions

- Is provider selection global per environment or per gym? (Recommend global first.)
- What is the account's exact daily sending allowance and shared-IP reputation?
- Does the duplicate-idempotency response return the original `messageId`, or only an error code?
- Exact webhook enum: docs show both `invalid` (API) and `invalid_email` (event page); confirm against a real payload.
- Batched webhook payload shape and ordering guarantees.
- Does Brevo retry webhooks on non-2xx, and with what schedule? Assume at-least-once and dedupe.
- Should `blocked`/`invalid` addresses be globally suppressed or tenant-scoped?
- Should accepted-but-hard-bounced recipients still consume quota? (Recommend yes; provider accepted the delivery attempt.)
- Do we need a per-gym provider policy for contractual isolation?

---

## 15. Can the existing architecture support the migration safely?

**Yes, with the Phase 2B fixes.** The outbox, attempts, leases, quota row, and event ledger are sufficient. No rewrite or new queue is required.

**No, not as-is.** W1–W6 make the current send path unreliable even for Postal, and W7/W8 would corrupt Brevo delivery tracking. Adding an adapter before fixing these would produce a migration that appears complete but leaks quota and can duplicate mail.

---

## 16. Documentation consulted

- Brevo transactional webhooks (event payloads, no event UUID): https://developers.brevo.com/docs/transactional-webhooks
- Brevo secure webhook calls (Bearer/basic/custom header; no payload signature): https://developers.brevo.com/docs/secured-webhooks
- Brevo send transactional email (response `messageId`, 2,000 recipients/request): https://developers.brevo.com/docs/send-a-transactional-email
- Brevo idempotency (UUID, 15-minute TTL): https://developers.brevo.com/docs/heterogenous-versions-batch-emails
- Brevo API rate limits (1,000 RPS send; 429; rate headers): https://developers.brevo.com/docs/api-limits
- Brevo create webhook (`auth`, event list): https://developers.brevo.com/reference/create-webhook

---

## 17. Exact recommended implementation phases

| Phase | Scope | Gate |
| --- | --- | --- |
| **2B** | Auth mount, permission fix, transactional enqueue, quota release, multi-batch identity, ACCEPTED recovery, staging allowlist | Postal regression suite + failure-injection tests |
| **2C** | Provider interface + Postal adapter, provider snapshot resolution, parity contract tests | Zero behavior change for Postal |
| **2D** | Additive migration: provider snapshot, batch index, scoped event uniqueness, suppression uniqueness, event ordering | Migration + backfill verified |
| **2E** | Brevo adapter (send, idempotency, errors, mock), one-message-many-recipients handling | Adapter suite green, no live production |
| **2F** | Brevo webhook (Bearer auth, fingerprint dedupe, ordering, suppression), staging allowlisted E2E | One staging send accepted and event received |
| **2G** | Controlled production cutover with manual rollback and reconciliation runbook | Operator sign-off |

**STOP.** No implementation is authorized in Phase 2A. This assessment created only this report.
