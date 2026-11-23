# GymDeck — Final Pre-GCP Readiness Audit

**Date:** 2026-11-22
**Scope:** read-only audit of the working tree and `GYMDECK_GCP_REMEDIATION_REGISTER.md`. No infrastructure, DNS, production DB, credentials, message sends, commits or pushes were touched. The only file written is this report. Evidence comes from file inspection, `git status`/`git grep`, Compose/YAML parsing and previously executed disposable checks in this session; no live infrastructure acceptance is claimed.

## P0 register census (item 1 evidence)

The register contains 17 P0 rows:

- **Verified (10):** 4, 6, 12, 14, 15, 17, 18, 26, 27, 29.
- **Explicitly blocked by external dependency (3):** 1 (`blocked` — external credentials/provisioning), 9 (`blocked` — external credential/user action), 10 (`blocked` — external phone/user action).
- **Neither verified nor explicitly blocked (4):** 3, 5, 33, 34 — all are `implemented but not fully verified` (register lines 26, 28, 66, 67).

## Findings

### 1. Every P0 blocker verified or externally blocked — **FAIL**

Four P0 blockers fail the requested condition:
- #3: `**implemented but not fully verified** (compose and static nginx/TLS checks pass; cert issuance untested)`.
- #5: `**implemented but not fully verified** (source commit/tree digest pinned; image digest pending build)`.
- #33: `**implemented but not fully verified** (cap in compose; load test not executed)`.
- #34: `**implemented but not fully verified** (internal URL in compose; loopback detection/planning tested; live re-registration not executed)`.

### 2. Scoped webhook uniqueness applied migration test — **PASS**

`backend/shared/database/migrations/0011_scoped_webhook_event_uniqueness.sql:5-6,29-30` adds `provider` and a unique index on `(provider, COALESCE(provider_instance_id,'default'), provider_event_id)`. `backend/scripts/test-migrations.sh:55-78` inserts `evt-1` three ways (`BREVO/default`, `POSTAL/default`, `BREVO/instance-2`), then asserts a fourth insert into `BREVO/default` raises `unique_violation` and counts 3 rows. Executed output: `== 6. scoped webhook event uniqueness ==`, `scoped_rows 3`, `ALL MIGRATION SCENARIOS PASSED`. 0011 is also applied by `bootstrap.ts` (lines 795-808), so inline-schema suites receive the column.

### 3. Production DB TLS verifies and fails closed — **PARTIAL**

`backend/shared/database/index.ts:15-27` returns `{ rejectUnauthorized: true, ca: ... }` for a readable CA, throws on production `disable`, and throws on production missing/unreadable CA. `backend/test/databaseTls.test.ts:8-17` asserts dev `false`, all three production throws, and `rejectUnauthorized === true` with CA content. Gap: the resolver does not validate CA file contents, and any non-`disable` string (including an invalid mode such as `bogus`) with a present CA is accepted as verified; no malformed-CA negative test exists. Therefore "missing or invalid" is only partly proven.

### 4. Compose files reject missing required secrets — **PASS**

`bash infrastructure/scripts/validate-compose-config.sh` re-run in this audit produced exactly:
`PASS docker-compose.prod.yml parses with explicit configuration`, `PASS docker-compose.prod.yml fails closed on missing required variables (exit 1)`, `PASS docker-compose.staging.yml parses with explicit configuration`, `PASS docker-compose.staging.yml fails closed on missing required variables (exit 1)`. The script uses quoted `:?FATAL` requirements in both files; `docker-compose.staging.yml:35,45-51,94` and `docker-compose.prod.yml:17,58-71,139` contain the enforced values.

### 5. deploy-staging.sh failure propagation — **PASS**

`infrastructure/scripts/deploy-staging.sh:3,14,31,42-46` uses `set -euo pipefail`, validates Compose before build, runs `db:migrate` before starting the backend, and explicitly exits 1 on readiness failure. `bash infrastructure/scripts/test-deploy-staging.sh` re-run in this audit produced: `PASS: docker aborts deployment (exit 1)`, `PASS: migration aborts deployment (exit 1)`, `PASS: backend is not started after migration failure`, `PASS: health failure aborts deployment (exit 1)`. Compose-validation failure is covered by the generic docker-failure case: the first docker call in the script is `compose config --quiet` (line 14).

### 6. Dedicated Brevo/quota tests — **PASS**

`backend/test/emailReliabilitySecondPass.test.ts`: lines 14-22 assert `defaultFromAddress()` follows `EMAIL_DELIVERY_PROVIDER`/`BREVO_SENDER_EMAIL`; lines 25-47 capture `fetch` init and assert the Brevo `idempotency-key` header is present and stable across two sends; lines 49-62 assert batch normalization and distinct/equal event fingerprints; lines 64-71 assert the billing period is identical at the month boundary and differs after it. Executed output: `PASS sender identity follows provider`, `PASS idempotency header present and stable`, `PASS webhook batching and event identity`, `PASS quota billing period consistency across boundary`. Mocked only; no live provider call.

### 7. OpenWA failed-session recovery and webhook re-registration — **PARTIAL**

Implemented: `backend/services/whatsapp/sessionRecovery.ts:21-51` detects `failed`/`action_required`, requires an operator confirmation token plus matching linked gym before calling `startSession`; `backend/services/whatsapp/webhookReRegistration.ts:6-40` detects loopback URLs and re-registers non-canonical rows. Tested: `whatsappSessionRecovery.test.ts:4-19` covers detection and denial paths but never exercises the successful `recoverFailedSession()` token path; `whatsappWebhookReRegistration.test.ts:4-17` covers `isLoopbackWebhookUrl` and `planWebhookReRegistration` only — the async `reRegisterWebhooks()` call itself is not executed. Register #34 remains `implemented but not fully verified`.

### 8. Paired PostgreSQL/OpenWA restore drill — **PARTIAL**

`infrastructure/scripts/test-backup-scripts.sh:15-19` syntax-checks both backup scripts and asserts both are wired into `infrastructure/systemd/gymdeck-backup.service`; lines 21-36 create a disposable PG cluster with 3 rows, encrypt/backup, restore into a second database and assert `COUNT = 3`. Executed output: `PASS script syntax and paired timer wiring`, `PASS encrypted DB backup and restore drill (3/3 rows)`, `NOTE: OpenWA volume restore requires Docker and is not covered by this dry run`. `backup-openwa.sh:12-15` archives the OpenWA volume with `docker inspect`/`alpine tar`/`openssl`, but no OpenWA restore drill was executed. Register #11 status: `implemented but not fully verified`.

### 9. OpenWA image provenance reproducible — **FAIL**

`infrastructure/scripts/openwa-provenance.sh:2-4,13-14` explicitly states no image digest is claimed and emits `image_digest=PENDING_AUTHORIZED_BUILD`; executed output: `version=0.30.3`, `source_commit=ca9c663f0e09bd04e704f6e6815f08013ffe7ba2`, `source_tree_sha256=44354b038cd93db4c057edd42133fd99a2704287d98ae7bdf2a07ec731fa9436`, `image_digest=PENDING_AUTHORIZED_BUILD`. `docker-compose.prod.yml:112-113` builds OpenWA from `../../services/openwa` source context with no image digest pin. A source-tree digest is not an image digest; image provenance is not reproducible. Register #5 is an open P0.

### 10. CI executes required gates — **PASS** (workflow definition; not executed on a runner here)

`.github/workflows/backend-ci.yml`: `55-57` typecheck; `59-63` secret-leak grep; `65-71` deployment-script, backup, resource-budget, ingress and Compose gates; `73-82` migration apply, idempotency and `uq_scoped_provider_event_id` index check; `84-95` full test matrix with `POSTAL_DELIVERY_MODE=mock`; `97-99` backend image build. Push/PR path filters include `backend/**`, `infrastructure/**` and the workflow file (lines 4-15). No claims about an actual GitHub run are made.

### 11. No tracked secrets or live-send defaults — **PASS**

`git grep -I -l -E '(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|re_[A-Za-z0-9]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16})'` returned `NO MATCHES: key material patterns`. Tracked live-send defaults are all off/mock: `docker-compose.prod.yml:74-75,85` and `docker-compose.staging.yml:53-54,62-63` use `false`/`mock`; `backend/.env.example:87,92-93` use `mock`/`false`. Brevo reports contain only redacted placeholders (`api-key: <redacted>`, `?secret=<redacted>`). The local `backend/.env` is untracked and ignored (`.gitignore:6`), and was not used as credential evidence.

### 12. Pre-existing user modifications untouched — **PASS**

The six pre-existing modified files remain modified in `git status`: `frontend/DashboardWidgets.jsx`, `frontend/index.html`, `frontend/script.js`, `apps/owner-mobile/ios/GymDeckOwner.xcodeproj/project.pbxproj`, `apps/owner-mobile/ios/GymDeckOwner/Info.plist`, `apps/owner-mobile/ios/Podfile.lock`. Their mtimes are `Nov 22 20:10:19`, `20:10:19`, `20:10:19`, `22:38:25`, `22:12:48`, `22:12:50`, all earlier than the first remediation edit in this session (`infrastructure/docker/docker-compose.staging.yml` at `23:11:40`). No audit tool call modified them.

## P0 blockers preventing controlled staging

- **#5 — OpenWA image provenance:** no image digest exists (`image_digest=PENDING_AUTHORIZED_BUILD`) and production Compose builds from mutable source context. A controlled staging deployment cannot prove which OpenWA image it runs.
- **#3 — ingress/TLS:** Compose and static nginx checks pass, but certificate issuance, renewal and reload were never executed against a VM/DNS; the staging TLS path is not live-verified.
- **#33 and #34** are also open P0s (no load test, no live webhook re-registration). They require a live runtime to close and therefore cannot be marked verified before staging; they are not treated as pre-staging closures.
- #1 (live deployment evidence), #9 (Brevo key rotation/inbox receipt) and #10 (WhatsApp QR/live delivery) are explicitly external and can use mock/sandbox paths for a controlled staging smoke test.

Passing unit tests, disposable migration drills and static checks are **not** live infrastructure acceptance.

NOT READY FOR CONTROLLED STAGING



