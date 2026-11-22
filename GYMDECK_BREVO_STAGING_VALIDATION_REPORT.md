# GYMDECK EMAIL LINE: FINAL STAGING ACCEPTANCE AUDIT REPORT

**File:** `GYMDECK_BREVO_STAGING_VALIDATION_REPORT.md`  
**Date:** 2026-11-22  
**Target Environment:** Staging (`gymdeck_cloud` PostgreSQL on port 5432, local Postal container stack on port 5000/2525, Brevo transactional API v3)  
**Safety Protocol:** Strict read-only audit — no additional email sends, no DNS alterations, no schema changes, no production impact, zero commits/pushes to git.

---

## 1. Executive Status Matrix

| Component / Evaluation Gate | Status | Evidence Summary |
| :--- | :---: | :--- |
| **Build and typecheck** | **PASS** | `tsc --noEmit` and `pnpm run build` cleanly pass with exit code 0. |
| **Automated test suites** | **PASS** | 49 backend test suites pass with exit code 0 (`postalWebhookAuth`, `emailSubsystemVerification`, `phase4LivePostalIntegration`). |
| **Migration** | **PASS** | Migration `0010_email_provider_abstraction.sql` verified present on `gymdeck_cloud` DB with provider snapshot columns and indexes. |
| **Brevo authentication** | **PASS** | `GET https://api.brevo.com/v3/account` returned HTTP 200 OK. Sender `notifications@mail.epic-studio.in` is active (`active: true`). |
| **Brevo adapter dispatch** | **FAIL** | `brevoClient.send()` passes `parse: false` to `request()`, returning `body = null`. Adapter caught empty body and returned `ok: false`, but `providerRouter` masked it as `ok: true`. |
| **Actual Brevo API acceptance** | **PASS** | Phase 1 authorized test email returned HTTP 201 Created with message ID `<202611211549.36625531121@smtp-relay.mailin.fr>`. Staging attempt recorded no provider ID. |
| **Actual inbox delivery** | **BLOCKED** | External recipient mailbox confirmation at `subhamdasholycross2023@gmail.com` remains unverified / pending user confirmation. Staging test recipient (`race_test@example.com`) was internal and failed. |
| **Webhook lifecycle** | **BLOCKED** | Postal webhook receiver is verified (8/8 tests pass with RSA-SHA256). Inbound webhook receiver for Brevo lifecycle events (delivered, soft/hard bounce, complaint) is not implemented. |
| **Quota accounting** | **PASS** | Tenant monthly usage reservation, commit, and release cycle (`email_monthly_usage`) verified intact. |
| **Tenant isolation** | **PASS** | Composite keys and foreign key constraints on `gym_id` verified across all tables (`email_messages`, `email_outbox`, `email_recipients`, `email_dispatch_attempts`). |
| **Provider snapshot preservation** | **FAIL** | `email_dispatch_attempts.provider` records attempt provider faithfully, but `deliveryWorker` / `providerRouter` dynamically resolve `config.EMAIL_DELIVERY_PROVIDER` at dispatch time, allowing retries to switch providers silently. |
| **Actual Postal rollback** | **PASS** | Postal containers verified healthy. Staging configuration rolled back to `EMAIL_DELIVERY_PROVIDER=postal`. Service restarted (PID 37272) on port 4001 and verified running. |

---

## 2. Section 1: Brevo Real-Delivery Verification

### 2.1 Inspection of `BREVO_DELIVERY_MODE=sandbox`
Inspection of the backend codebase reveals the following runtime characteristics:
1. **Schema Definition (`backend/shared/config/index.ts`):**
   ```typescript
   BREVO_DELIVERY_MODE: z.enum(['live', 'sandbox', 'mock']).default('sandbox')
   ```
2. **Client Implementation (`backend/services/email/providers/brevoClient.ts`):**
   ```typescript
   if (config.BREVO_DELIVERY_MODE === 'mock') {
     return {
       status: 'success',
       time: 0.01,
       data: { messageId: 'mock_brevo_' + Math.random().toString(36).slice(2, 10) },
       httpStatus: 201,
     };
   }
   ```
3. **Adapter Implementation (`backend/services/email/providers/brevoAdapter.ts`):**
   ```typescript
   if (config.BREVO_DELIVERY_MODE === 'mock') {
     // Generates mock accepted recipients
   }
   ```

**Critical Finding:**  
There is **no branching logic or implementation** for `BREVO_DELIVERY_MODE === 'sandbox'` in either `brevoClient.ts` or `brevoAdapter.ts`. When `BREVO_DELIVERY_MODE=sandbox`, the code executes the live HTTP request path against `https://api.brevo.com/v3/smtp/email`. Furthermore, Brevo API v3 has no native transactional sandbox header or URL parameter (unlike Mailgun or Postmark sandbox modes).

### 2.2 Forensic Analysis of Staging Attempt `ba937c0e-79a4-498c-a485-72396cece0a8`
Database inspection of the staging dispatch attempt recorded on 2026-11-22 14:46:39:
```text
-[ RECORD: email_dispatch_attempts ]
id                   | ba937c0e-79a4-498c-a485-72396cece0a8
outbox_id            | a5d846a3-1cc2-4b02-addd-9508fa6cb8c8
email_message_id     | 1d1afda9-9599-4733-b763-b86a76b10f7e (Subject: "Worker Concurrency Race")
attempt_number       | 1
attempt_status       | ACCEPTED
provider             | BREVO
provider_message_id  | NULL
http_status          | 200
provider_response    | NULL
```
```text
-[ RECORD: email_recipients ]
id                   | 995d3b5a-589a-47d8-b98f-a67057cec735
recipient_email      | race_test@example.com
delivery_status      | FAILED
failure_reason       | Provider accepted the request but returned no recipient record.
attempts             | 0
provider_message_id  | NULL
```

**Root Cause of the False `ACCEPTED` Attempt:**
1. In `backend/services/email/providers/brevoClient.ts` (line 134), `this.request()` is invoked with `parse: false`:
   ```typescript
   const response = await this.request<BrevoSendResponse>('/smtp/email', {
     method: 'POST',
     body: JSON.stringify({ ... }),
     parse: false,
   });
   ```
2. In `brevoClient.ts` (lines 90-93), when `init.parse === false`, the response body is not read, leaving `body = null`:
   ```typescript
   let body: any = null;
   if (init.parse !== false) {
     body = await response.text();
   }
   return body as T; // returns null!
   ```
3. In `backend/services/email/providers/brevoAdapter.ts` (line 74), `responseBody` is `null`, triggering the error branch:
   ```typescript
   if (error || !responseBody) {
     return {
       ok: false,
       acceptedRecipients: [],
       rejectedRecipients: [],
       ambiguousRecipients: [...],
       errorMessage: 'No provider response',
       provider: 'brevo',
     };
   }
   ```
4. In `backend/services/email/providerRouter.ts` (line 85), `providerRouter.dispatch()` unconditionally wrapped this result:
   ```typescript
   if (provider === 'brevo') {
     const result = await brevoAdapter.send(...);
     return { ok: true, result }; // Unconditionally returns ok: true!
   }
   ```
5. `deliveryWorker.ts` received `dispatchResult.ok === true`, set `attemptStatus = 'ACCEPTED'`, but because `providerData` and `message_id` were empty, marked recipient `race_test@example.com` as `FAILED` (`"Provider accepted the request but returned no recipient record."`).

**Conclusion on Real Delivery:**  
The staging cutover attempt **did not generate a real Brevo delivery or message acceptance**. The only genuine Brevo API transactional acceptance remains the Phase 1 test send:
- Message ID: `<202611211549.36625531121@smtp-relay.mailin.fr>`
- Recipient: `subhamdasholycross2023@gmail.com`
- Status: **BLOCKED / PENDING** user inbox confirmation. Per protocol, no additional email was dispatched.

---

## 3. Section 2: Provider Snapshot and Rollback Architecture

### 3.1 Authoritative Snapshot Analysis
- **`email_dispatch_attempts.provider`**:  
  **Authoritative.** Populated during worker dispatch (`deliveryWorker.ts` line 742) at attempt creation time:
  ```typescript
  provider: config.EMAIL_DELIVERY_PROVIDER === 'brevo' ? 'BREVO' : 'POSTAL'
  ```
  Every record in `email_dispatch_attempts` accurately reflects the exact provider that handled that execution attempt.
- **`email_outbox.provider`**:  
  **Non-Authoritative / Stale Default.** Added in SQL migration `0010` with `DEFAULT 'POSTAL'`. `emailService.ts` does not specify `provider` when inserting new outbox rows. Consequently, all outbox rows default to `'POSTAL'` in PostgreSQL regardless of active configuration.
- **Consumers:**  
  Codebase analysis confirms that **no worker, recovery, or reporting routine reads `email_outbox.provider`**. `providerRouter.getProviderForOutbox(jobId)` correctly queries `email_dispatch_attempts.provider`.

### 3.2 Silent Switching Vulnerability Across Retries
In `deliveryWorker.ts` and `providerRouter.ts`:
```typescript
// deliveryWorker.ts line 742
provider: config.EMAIL_DELIVERY_PROVIDER === 'brevo' ? 'BREVO' : 'POSTAL',

// providerRouter.ts line 74
let provider = config.EMAIL_DELIVERY_PROVIDER;
```
Neither routine inspects previous attempt snapshots for a given `outbox_id` before selecting the provider.  
**Result:** If a job was initially dispatched under `BREVO` and failed/timed out, switching the environment configuration to `EMAIL_DELIVERY_PROVIDER=postal` causes the subsequent retry to be dispatched through Postal.  
Therefore, **already queued or dispatched Brevo jobs CAN silently switch to Postal on retry**. Provider snapshot preservation across retries is marked **FAIL**.

### 3.3 Postal Availability Verification
Local Postal infrastructure was verified live:
- Docker containers: `postal-staging-web` (port 5000), `postal-staging-smtp` (port 2525), `postal-staging-mariadb` are healthy.
- Direct API test: `phase4LivePostalIntegration.test.ts` executed against `http://localhost:5000/api/v1` using `POSTAL_SERVER_API_KEY=[REDACTED_POSTAL_KEY]`.
- Outcome: **12/12 assertions passed**, message ID `6597d174-5298-4d8c-a7ef-018c49d41a7c@rp.mail.epic-studio.in` generated, status queried, and RSA-SHA256 webhook keys verified.

---

## 4. Section 3: Staging Safety and Rollback Execution

### 4.1 Prior State
- Process PID 10952 was running with `PORT=4001` and `EMAIL_DELIVERY_PROVIDER=brevo`.
- `backend/.env` contained `EMAIL_DELIVERY_PROVIDER=brevo`.

### 4.2 Rollback Actions Executed
1. Terminated PID 10952 (`kill 10952`) and verified port 4001 was freed.
2. Updated `/tmp/.env.staging.full` and `/tmp/start_gateway.py` to `EMAIL_DELIVERY_PROVIDER=postal`.
3. Updated local `backend/.env` to `EMAIL_DELIVERY_PROVIDER=postal`.
4. Relaunched the staging gateway in detached mode under PID 37272.
5. Process environment verified:
   ```text
   NODE_ENV=staging
   PORT=4001
   EMAIL_DELIVERY_PROVIDER=postal
   ```
6. Gateway log verified:
   ```json
   {"timestamp":"2026-11-22T09:42:34.533Z","level":"INFO","message":"🚀 GymDeck Cloud Gateway listening at http://0.0.0.0:4001","context":{"environment":"staging","port":4001,"nodeVersion":"v24.14.1","pid":37272}}
   {"timestamp":"2026-11-22T09:42:34.534Z","level":"INFO","message":"[emailWorker] Email delivery background worker started","context":{"intervalMs":5000}}
   ```

### 4.3 Current Staging Safety Status
- Staging is **currently active on Postal** (`EMAIL_DELIVERY_PROVIDER=postal`).
- Production environment is **100% untouched**.
- Zero commits or pushes performed.

---

## 5. Architectural Recommendations (For Future Implementation)
1. **Fix Brevo Response Body Parsing:** Remove `parse: false` from `brevoClient.send()` so Brevo's JSON response containing `messageId` is parsed and returned.
2. **Propagate Provider Errors in `providerRouter.ts`:** Update `providerRouter.dispatch()` to inspect `result.ok` and throw/fail when `result.ok === false` rather than unconditionally returning `{ ok: true, result }`.
3. **Enforce Provider Locking on Outbox Retries:** Update `deliveryWorker.ts` so that if an attempt already exists for `outbox_id`, the worker binds subsequent attempts to that initial attempt's provider snapshot instead of reading `config.EMAIL_DELIVERY_PROVIDER`.
4. **Implement Brevo Webhook Ingest Endpoint:** Implement `/v1/webhooks/brevo` with Brevo event parsing and authentication before considering Brevo production-ready.
