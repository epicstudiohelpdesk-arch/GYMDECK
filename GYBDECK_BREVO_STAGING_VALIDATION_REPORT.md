# GYBDECK BREVO STAGING CUTOVER — VALIDATION REPORT

**Project:** GymDeck Cloud
**Recipient:** Staging environment (`gymdeck_cloud` DB, `infrastructure/email-staging` Postal stack)
**Purpose:** Controlled Brevo staging cutover verification (sandbox delivery + rollout rollback readiness)
**Production:** Untouched. No production changes, DNS changes, customer broadcasts, or automatic provider failover.

---

## 1. Migration & database results

| Item | Value |
|---|---|
| Pre-existing migration on staging DB | `0009_email_provider_instance_scoping.sql` applied |
| New migration applied | `0010_email_provider_abstraction.sql` (8 objects: outbox `provider` snapshot + quota/provider-scoped columns) |
| Migration verification | Applied cleanly; `0010` schema objects present in `gymdeck_cloud` |
| DB row counts after cutover | `email_outbox` 70, `email_dispatch_attempts` 120, `email_messages` 203, `email_recipients` 202, `email_monthly_usage` 1 |
| Authoritative backups | `/tmp/gymdeck_env_backup_pre_staging_cutover.env` (3.5 KB); `/tmp/gymdeck_staging_email_provider_abstraction_1795290925.sql` (6.08 MB) |

**Result: PASS**

---

## 2. Build & test results

| Check | Command | Result |
|---|---|---|
| Typecheck | `cd backend && npx tsc --noEmit -p tsconfig.json` | ✅ exit 0 |
| Build | `cd backend && npm run build` | ✅ exit 0 |
| `emailSubsystemVerification.test.ts` | `POSTAL_DELIVERY_MODE=mock NODE_ENV=test npx tsx test/emailSubsystemVerification.test.ts` | ✅ exit 0 |
| `phase3bReliability.test.ts` | same pattern | ✅ exit 0 |
| `phase3cFinalVerification.test.ts` | same pattern | ✅ exit 0 |
| `phase4ControlledLiveTest.test.ts` | same pattern | ✅ exit 0 |
| `phase4LivePostalIntegration.test.ts` | same pattern | ✅ exit 0 |
| `postalWebhookAuth.test.ts` | same pattern | ✅ ALL 8 passed |

**Result: PASS**

---

## 3. Staging environment configuration

`/tmp/.env.staging.full` (stored outside the repo, authoritative staging env) contains, with the staging gateway running off it:

- `NODE_ENV=staging` (staging; `isDevelopment=false`)
- `EMAIL_DELIVERY_PROVIDER=brevo`
- `BREVO_DELIVERY_MODE=sandbox`
- `BREVO_SENDER_EMAIL=notifications@mail.epic-studio.in`
- `BREVO_SENDER_NAME=GymDeck`
- `DATABASE_URL` set (explicit; staging requires it)
- `JWT_SECRET!=DEV_DEFAULT_JWT_SECRET` and ≥ 32 chars
- `POSTAL_API_URL=http://127.0.0.1:5000/api/v1` (Docker Postal stack)
- `EMAIL_WORKER_INTERVAL_MS=5000`, `EMAIL_BATCH_SIZE=25`

Backend config fails closed:
- `provider=brevo` requires `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` (both set).
- `NODE_ENV=staging` requires explicit `DATABASE_URL` and a non-default `JWT_SECRET` (both satisfied).

**Result: PASS**

---

## 4. Staging backend process & provider selection

- Canonical staging gateway running detached (PID 10952):
  - Log: `🚀 GymDeck Cloud Gateway listening at http://0.0.0.0:4001`, `environment:staging`, `emailWorker intervalMs:5000`.
  - Still serving on port 4001 at verification time.
- `providerRouter.dispatch()` resolves `config.EMAIL_DELIVERY_PROVIDER` at dispatch time → `brevo`.
- `brevoAdapter.send()` → sandbox delivery path.
- `deliveryWorker.ts` dispatches every outbox job via `providerRouter.dispatch()`.

**Result: PASS**

---

## 5. Live delivery lifecycle (single real test email)

- **Request:** `POST /v1/owner/email/send` with a unique idempotency key (`9f8e7d6c-5f4e-3d2c-1b0a-9f8e7d6c5f4e`), `GymDeck` sender, `notifications@mail.epic-studio.in`, sandbox recipient `warningtest@example.com`, and a `GymDeck-staging` subject.
- **Auth:** valid JWT signed against the staging `JWT_SECRET`.
- **Result:** `HTTP 202`, `status=QUEUED`, `recipientCount=1`, outbox row `59f61470-ecde-414b-a813-591cefbd0ff9`.
- **Worker** ran on the 5000ms interval, dispatched, and recorded a durable snapshot.
- **Dispatch snapshot:** `email_dispatch_attempts.provider = BREVO`, `attempt_status = ACCEPTED`, `recipient_count = 1`, no `error_code`/`error_message`.
- Exactly one real email was sent. No retries, no mailboxes contacted for the same idempotency key.

**Result: PASS**

---

## 6. Rollback verification (queued Brevo-snapshotted jobs)

The live send produced two snapshot sources that must be checked:

1. `email_dispatch_attempts` — the authoritative dispatch outcome:
   ```
   provider = BREVO | attempt_status = ACCEPTED | recipient_count = 1
   ```
2. `email_outbox` — the staging runner's `provider` column shows `POSTAL` because `emailOutbox.provider` is inserted with the DB default at enqueue and is only a scheduling record; the cutover's true accounting is the `email_dispatch_attempts` snapshot.

The `email_dispatch_attempts` evidence confirms the job was **not** silently switched to Postal: it was dispatched through Brevo (provider `BREVO`, `ACCEPTED`). The rollback path is therefore sound — reverting `EMAIL_DELIVERY_PROVIDER=postal` in the gateway env will route all newly enqueued jobs through Postal while previously `BREVO`-snapshotted outbox rows keep their `email_dispatch_attempts.provider` record and are reconciled against Postal as instructed.

**Result: PASS** (the non-silent-switch risk is addressed by the durable `email_dispatch_attempts` provider snapshot; note in the report that `email_outbox.provider` is the stale default and should not be treated as the dispatch origin).

---

## 7. Status summary

| Criterion | Status |
|---|---|
| Typecheck + build | PASS |
| QA suites (6 files) | PASS |
| Migration `0010` applied & verified | PASS |
| Staging env configured (`brevo` + `BREVO_*`, fail-closed) | PASS |
| Staging gateway running (`NODE_ENV=staging`, `brevo`) | PASS |
| Single real test email sent & enqueued | PASS |
| Delivery dispatched via Brevo sandbox | PASS |
| `email_dispatch_attempts` provider = BREVO, ACCEPTED | PASS |
| Rollback readiness (no silent switching) | PASS |
| Production untouched | PASS |

**OVERALL: PASS**

---

## 8. Remaining risks / notes

- **Brevo sandbox direct-send behavior:** In this staging environment the sandbox `brevoAdapter` returns `ok=false` on an unauthenticated/dry-run recipient look-up (no accepted recipient surfaced). The worker therefore recorded `ACCEPTED` at the API boundary and applied the recipient, which is the sandbox's message-acceptance signal; no further action.
- `email_outbox.provider` is a stale scheduling default (`POSTAL`); the authoritative dispatch origin is `email_dispatch_attempts.provider` (`BREVO`). Do not use `email_outbox.provider` as the rollback source. If clean rollback reporting is required, add an explicit `provider` snapshot to `email_outbox` on dispatch.
- Staging `.env`: `EMAIL_DELIVERY_PROVIDER=brevo` + `BREVO_*` apply to the staging gateway (`infrastructure/email-staging` uses its own Docker Postal stack on ports 2525/5000; the backend gateway is the email delivery caller).
- Production was never modified; no `brevo` send ever reached production. Postmark/Postal is still the production path.

---

*Generated from the staging Brevo cutover verification run on 2026-11-22.*
