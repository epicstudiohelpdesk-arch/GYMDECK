# GymDeck — GCP Pre-Deployment Remediation Register

**Source:** `GYMDECK_GOOGLE_CLOUD_DEPLOYMENT_PLAN.md` §19 (43 numbered blockers)
**Scope:** code/configuration remediation only. No GCP resources, DNS, production DB, production config, real email/WhatsApp, credentials, commits or pushes.
**Severity key:** P0 = must be closed before any deployment; P1 = required before production cutover; P2 = hygiene/documentation.

## Foundational decisions (from repository evidence)

| Decision | Value | Basis |
|---|---|---|
| Canonical API hostname | `api.gymdeck.com` | `nginx.conf:53,68`, `.env.example:14`, `rollback.sh:13,17`, mobile configs — no `api.epic-studio.in` anywhere |
| Email sending domain | `mail.epic-studio.in` | config defaults `POSTAL_FROM_DOMAIN`/`POSTAL_DEFAULT_FROM_EMAIL`, DNS readiness doc |
| OpenWA minimum version | v0.30.3 | `services/openwa/package.json:3`, `openapi.json`, chart `appVersion`; `linkPreview` requires ≥0.30.3 |
| OpenWA downgrade | Prohibited | SDK docs + contract spec; downgrade returns 400 on `linkPreview` |
| Production DNS changes | None | Explicit task restriction |
| GCP provisioning | None | Explicit task restriction |

**Decision that cannot be made from repo evidence:** whether `api.gymdeck.com` DNS is authoritative for this VM, and whether Brevo/Postal account credentials have been rotated. Both remain external dependencies.

## 19.1 Deployment blockers

| ID | Severity | Affected files/services | Required implementation | Dependencies / order | Acceptance criteria | Verification | Status |
|---|---|---|---|---|---|---|---|
| 1 | P0 | `docs/architecture/phase16-staging-readiness.md`, `phase18-cloud-provisioning-audit.md` | Live cloud deployment evidence can only come from an authorized deployment; no code change. | After 2-7, 12-13, external credentials | Documented cloud deployment exercised with `/health` + `/ready` passing | Manual: deployment runbook + evidence | **blocked** (external credentials/provisioning) |
| 2 | P1 | nginx, Tauri, mobile/rollback configs | Set `api.gymdeck.com` as canonical; document decision; no DNS change. | Before 3 | All templates/docs reference canonical host; no `api.epic-studio.in` | `grep -R "api.epic-studio.in"` returns none in config | **implemented** (decision recorded; canonical host used in new config) |
| 3 | P0 | `infrastructure/nginx/nginx.conf`, compose | Add nginx + certbot services, renewal timer, staging TLS block. | After 26 | `docker compose config` valid; 80/443 only published ports; cert paths templated | `validate-compose-config.sh`; `validate-ingress-config.sh`; `validate-certificate-files.sh`; manual cert dry-run | **implemented but not fully verified** (Compose/static ingress pass; disposable missing/malformed/unreadable/bad-permission cert+key cases rejected; ACME issuance/renewal and nginx reload still need a DAEMON/VM + ACME test CA) |
| 4 | P0 | `backend/shared/database/migrate.ts`, `backend/package.json`, `backend/scripts/test-migrations.sh` | Authoritative runner with `--baseline`/`--status`; `db:migrate` repointed; legacy `payments` prerequisite added additively. | Before any DB work | Clean install, repeat, baseline, rollback all pass | `bash backend/scripts/test-migrations.sh` — ALL SCENARIOS PASSED on temporary local PG16 cluster | **verified** (6 scenarios on temporary local PG16 cluster, including scoped uniqueness) |
| 5 | P0 | `services/openwa`, compose | Pin source commit, source digest, image digest; no upgrade. | Before 33/34 | Digest recorded and used by deploy; `linkPreview` guard test passes | Source hash script + mocked contract test | **implemented but not fully verified** (source commit/tree digest pinned; image build blocked: Docker daemon unreachable — `docker version` hung and timed out; exact digest remains `PENDING_AUTHORIZED_BUILD`) |
| 6 | P0 | `docker-compose.prod.yml` | Recalculate limits ≤8 GB with OS/Docker overhead. | With 26 | Sum of limits + overhead ≤8 GB | Resource budget validator | **verified** (validate-resource-budget.sh PASS: 6800/8192 MB) |
| 7 | P1 | Postal sender, GCP network | Use Brevo primary; Postal only external/relay; document port-25 constraint. | After 14 | No self-hosted outbound SMTP in compose | Compose review | **blocked** (external relay decision) |
| 8 | P1 | `EMAIL_LINE_PHASE_4_DNS_READINESS.md` | Apply mail DNS records externally; no DNS change here. | External | SPF/DKIM/DMARC/return-path verified for `mail.epic-studio.in` | Manual DNS lookup | **blocked** (external DNS authority) |
| 9 | P0 | Brevo account | Rotate exposed key, revoke old SMTP relay key, confirm inbox receipt. | External user action | Key rotated; one controlled send acknowledged | Manual + Brevo dashboard | **blocked** (external credential/user action) |
| 10 | P0 | OpenWA / WhatsApp | Real QR scan and live delivery per gym. | External phone + user | Owner confirms receipt; session status `ready` | Manual | **blocked** (external phone/user action) |
| 11 | P1 | `infrastructure/scripts/backup-db.sh`, new OpenWA backup | Add scheduler, off-site copy, paired DB+session backup. | After 4 | Timer unit + dry-run restore of both artifacts | `bash infrastructure/scripts/test-backup-scripts.sh` (DB 3/3 rows + OpenWA sqlite/session/auth checksums) | **verified for disposable drill** (paired encrypted backup restored into isolated instances; off-site copy and live VM restore still external) |
| 12 | P0 | `src-tauri/**`, `tauri.conf.json` | Runtime cloud URL injection, fail-closed production, packaged-build test. | Before 13 | Production build without config refuses to start; dev build still uses localhost | `cargo test --lib config::tests` — 3/3 PASS (executed) | **verified** (cargo test --lib config::tests: 3/3) |
| 13 | P1 | `.github/workflows/backend-ci.yml`, `infrastructure/scripts/deploy-staging.sh`, `test-deploy-staging.sh`, `validate-compose-config.sh` | Fail-closed migration step; add compose/config validation gate. | After 4, 3 | Migration failure aborts deploy; backend not started after failure | `bash infrastructure/scripts/test-deploy-staging.sh` (4 cases), `validate-compose-config.sh` (both stacks parse and fail closed), CI steps wired | **verified** (local script tests; CI workflow not executed here) |

## 19.2 Code/configuration defects

| ID | Severity | Affected files/services | Required implementation | Dependencies / order | Acceptance criteria | Verification | Status |
|---|---|---|---|---|---|---|---|
| 14 | P0 | `services/email/postalClient.ts:143,223` | Remove hardcoded `Host: localhost:5000`; derive from API URL. | Before 27 | No localhost header; non-local endpoint works in mock test | Mocked Postal client test | **verified** (header removed; typecheck + readiness tests pass) |
| 15 | P0 | `services/email/emailService.ts`, `providerRouter.ts`, `brevoAdapter.ts` | Single sender identity from env; API response + templates agree. | With 18 | Mocked Brevo send uses `BREVO_SENDER_EMAIL` consistently | Mocked sender test | **verified** (`emailReliabilitySecondPass.test.ts`: sender follows provider) |
| 16 | P1 | `providers/brevoAdapter.ts` | Pass idempotency key header on send. | With 15 | Header present and stable per attempt | Mocked adapter test | **verified** (`emailReliabilitySecondPass.test.ts`: header present and stable) |
| 17 | P0 | `services/email/brevoWebhookService.ts` | Dedupe by real event identity; handle batched arrays; recipient resolution by provider message id + email. | Before 15 | Distinct events not dropped; batch processed | Mocked webhook tests | **verified** (`emailReliabilitySecondPass.test.ts`: batch + event fingerprint; live webhook not exercised) |
| 18 | P0 | `shared/config/index.ts`, email guards | Enforce staging/production live-send guards; `sandbox` must not send live. | Before 15 | Guards reject unauthorized live mode; mock tests only | Config + guard tests | **verified** (config guard + config/readiness suites pass) |
| 19 | P1 | `quotaService.ts`, `deliveryWorker.ts` | Use one billing period for reserve and commit. | With 4 | Cross-month job consumes reserved row | Mocked quota test | **verified** (`emailReliabilitySecondPass.test.ts`: boundary billing period consistent) |
| 20 | P1 | `migrations/0011_scoped_webhook_event_uniqueness.sql`, `bootstrap.ts` | Scope `provider_event_id` uniqueness to provider+instance. | After 4 | New unique index; old data preserved | Disposable DB test | **verified** (`test-migrations.sh` scenario 6: 3 scoped rows on temporary local PG16; 0011 also registered in `bootstrap.ts` so inline-schema test suites get the `provider` column; Brevo readiness 20/20) |
| 21 | P1 | `gateway/src/routes/email.ts:54-87` | Apply `webhookIngress` limiter to alias routes. | Independent | Alias routes rate-limited | Route test | **verified** (limiter applied to alias routes; typecheck passes) |
| 22 | P2 | `shared/database/index.ts`, `backend/.env.example` | Make TLS verification configurable; document internal-network tradeoff. | Independent | Explicit mode env; default safe | Config test | **verified** (`resolveDatabaseSsl`: mode enum validated, CA must be a regular, readable, non-group/world-writable PEM with parseable X.509; production fails closed for missing/invalid CA; `databaseTls.test.ts` 9 assertions) |
| 23 | P1 | `shared/logging/logger.ts`, `infrastructure/nginx/nginx.conf`, `test/logRedaction.test.ts` | Redact message strings and query strings in access logs. | Independent | No secrets in logs | Log redaction test | **verified** (free-form messages, nested context and error messages redacted; nginx no longer logs query strings; `logRedaction.test.ts` 3 checks) |
| 24 | P2 | `shared/config/index.ts` | Add `POSTAL_INSTANCE_ID` to Zod schema. | Independent | Config parses with var | Config test | **verified** (schema field added; config test passes) |
| 25 | P1 | `docker-compose.staging.yml`, `backend/.env.example` | Remove insecure defaults; document all required vars. | With 3 | No dev secrets in staging template | `docker compose config` + grep | **verified** (all required vars use quoted `:?FATAL` expressions; DATABASE_URL quoted; staging deployment vars documented; `validate-compose-config.sh` passes for both stacks) |
| 26 | P0 | `docker-compose.prod.yml` | Remove `deploy.replicas`; one backend instance. | With 3,6 | No Swarm-only keys | `docker compose config` | **verified** (Swarm replicas removed; validator asserts absence) |
| 27 | P0 | both compose files | Add Email Line env; make `RESEND_API_KEY` optional unless live notifications. | With 15/18 | Compose validates without legacy key | `docker compose config` | **verified** (`validate-compose-config.sh`: both stacks parse with empty RESEND key and fail closed without required secrets) |
| 28 | P1 | `services/notifications/**`, gateway server | Decide scheduler for notifications/domain events; no behavior change without approval. | External product decision | Decision recorded | Manual | **unresolved** (product decision required) |

## 19.3 OpenWA / WhatsApp

| ID | Severity | Affected files/services | Required implementation | Dependencies / order | Acceptance criteria | Verification | Status |
|---|---|---|---|---|---|---|---|
| 29 | P0 | `services/whatsapp/openwaClient.ts` | Version guard + mocked `linkPreview` contract test. | With 5 | Test fails on simulated <0.30.3 | Mocked contract test | **verified** (openwaVersionGuard.test.ts: 5/5) |
| 30 | P1 | OpenWA backup docs/script | Chrome-major rollback procedure with `sessions/` restore. | With 11 | Procedure documented and drillable | Manual review | **implemented but not fully verified** (runbook written; no rollback drill) |
| 31 | P2 | OpenWA backup docs | Include `baileys/` in restore for pre-0.23.5 rollback. | With 30 | Documented | Manual review | **implemented** (baileys restore documented) |
| 32 | P1 | `services/whatsapp/sessionRecovery.ts`, `test/whatsappSessionRecovery.test.ts` | Recovery for `failed` sessions; not auto-started. | With 33 | Runbook + detection test | Mocked status test | **verified** (mocked detection of `failed`/`action_required` and confirmation+ownership-guarded start; live session start not exercised) |
| 33 | P0 | compose, OpenWA env | Set `MAX_CONCURRENT_SESSIONS=8`; load test. | With 6 | Cap enforced; memory measured | Upstream OpenWA Jest (`MAX_CONCURRENT_SESSIONS`, 10 passed) + disposable mock cap drill (8 created, 9th rejected, slot release/recovery) | **implemented but not fully verified** (cap contract and upstream logic verified; real Chromium/WhatsApp session memory and 8-session capacity not exercised — Docker daemon unavailable) |
| 34 | P0 | `services/whatsapp/webhookReRegistration.ts`, `test/whatsappWebhookReRegistration.test.ts`, compose | Internal webhook URL; re-register loopback rows. | With 5 | No loopback webhook URL remains | `test/webhookReRegistrationDb.test.ts` (local PG records + mock OpenWA API) | **verified for code path** (loopback replaced, valid row preserved, retry idempotent, partial failure recovered; live OpenWA re-registration still external) |
| 35 | P1 | compose | Align `WWEBJS_*`, `WEBHOOK_TIMEOUT`, `WEBHOOK_RETRY_DELAY`. | With 33 | Env parity with example | Compose config diff | **verified** (timeouts aligned in compose) |
| 36 | P2 | ops docs | Document unimplemented upstream security features. | Independent | Documented | Manual review | **implemented** (limits documented) |

## 19.4 Documentation conflicts

| ID | Severity | Affected files/services | Required implementation | Dependencies / order | Acceptance criteria | Verification | Status |
|---|---|---|---|---|---|---|---|
| 37 | P2 | `resend-email.md`, `secret-rotation.md`, `incident-response.md`, `production-deployment-guide.md` | Mark Resend docs legacy; point to Email Line docs. | Independent | Consistent provider narrative | Doc review | **implemented** (superseding note added) |
| 38 | P2 | `GYMDECK_BREVO_FINAL_READINESS_REPORT.md` | Correct `?secret=` and soft-bounce claims. | Independent | No contradicted claims | Doc review | **implemented** (superseding note added) |
| 39 | P2 | `GYMDECK_BREVO_PRE_STAGING_CLOSURE_REPORT.md` | Replace invalid `real` mode with `live`. | Independent | Valid enum | Doc review | **implemented** (superseding note added) |
| 40 | P2 | `EMAIL_LINE_PHASE_3C_FINAL_VERIFICATION.md` | Scope "production ready" to staging verdict. | Independent | No overstated claim | Doc review | **implemented** (superseding note added) |
| 41 | P2 | `README.md:445` | Traefik → nginx. | Independent | Accurate directory description | Doc review | **implemented** (superseding note added) |
| 42 | P2 | `workspace_structure.md` | Mark as historical/alternate tree. | Independent | No conflicting current tree | Doc review | **implemented** (superseding note added) |
| 43 | P1 | docs + infra | Add GCP deployment artifacts and mark generic docs accordingly. | With 3,11,13 | GCP-specific runbook exists | Doc review | **implemented but not fully verified** (GCP compose + ops doc; no provisioning) |

## 19.5 Explicitly unverified

Live cloud failover, RPO/RTO timing, zero-downtime rollout, Brevo inbox receipt, WhatsApp live delivery, real QR scan, session count on target VM, per-session memory on Ubuntu 24.04, nginx deployment mechanism, certificate renewal, desktop cloud-URL injection. These remain **unverified assumptions** and are not closed by this remediation.

## 19.6 Runtime verification attempt (2026-11-23)

Runtime-only follow-up was attempted with no application-code changes. It could not be executed:

- #5 **remains open**. No Docker daemon: `docker info`/`docker version` timed out with no output; `docker desktop start` reported `Docker Desktop is already running` but the socket stayed unresponsive; `docker desktop restart` timed out; after killing/restarting Docker Desktop, `docker info` returned `Cannot connect to the Docker daemon at unix:///Users/subhamdas/.docker/run/docker.sock`.
- #3 **remains partial**. No `certbot`, `pebble`, `nginx` binary and no Docker daemon. ACME issuance/renewal and nginx reload were not executed.
- #33 **remains partial (real capacity unverified)**. No Linux Docker runtime for real Chromium/OpenWA sessions; only the previously executed upstream cap tests and mock drill stand.
- No authorized CI Linux runner path exists for these custom runtime tests without committing/pushing a new workflow, which is prohibited.
- #34 and the paired backup/restore drill remain as previously verified; they were not repeated.
