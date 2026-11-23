# GymDeck GCP Remediation — Execution Report

**Date:** 2026-11-22
**Scope:** code/configuration remediation only. No GCP provisioning, DNS change, production DB connection, production config application, real email/WhatsApp message, credential disclosure, commit or push.
**Deliverables:** `GYMDECK_GCP_REMEDIATION_REGISTER.md`, updated `GYMDECK_GOOGLE_CLOUD_DEPLOYMENT_PLAN.md`, this report.

## Verification actually executed

| Check | Command | Result |
|---|---|---|
| Backend typecheck | `cd backend && npx tsc --noEmit` | PASS |
| Backend build | `cd backend && npx tsc` | PASS |
| Full backend test matrix | `for f in backend/test/*.test.ts; do npx tsx "$f"; done` with `POSTAL_DELIVERY_MODE=mock` | PASS, 25/25 files (local `backend/.env` otherwise selects live Postal; CI pins `POSTAL_DELIVERY_MODE=mock`) |
| Rust config tests | `cargo test --lib config::tests` (src-tauri) | PASS 3/3 |
| Frontend build | `pnpm run build` | PASS (chunk-size warning only) |
| Migration scenarios | `bash backend/scripts/test-migrations.sh` | PASS, 6/6 scenarios on temporary local PG16 cluster |
| Compose validation | `bash infrastructure/scripts/validate-compose-config.sh` | PASS — prod and staging parse with explicit config and both fail closed on missing secrets |
| Ingress/TLS static checks | `bash infrastructure/scripts/validate-ingress-config.sh` | PASS (nginx binary unavailable locally; `nginx -t` skipped) |
| Deployment gate tests | `bash infrastructure/scripts/test-deploy-staging.sh` | PASS: generic failure, migration failure (backend not started), health failure all abort |
| Resource budget | `bash infrastructure/scripts/validate-resource-budget.sh` | PASS, 6,800/8,192 MB |
| Backup scripts | `bash infrastructure/scripts/test-backup-scripts.sh` | PASS, encrypted DB backup/restore 3/3 rows; OpenWA volume restore needs Docker |
| OpenWA provenance | `infrastructure/scripts/openwa-provenance.sh` | PASS, v0.30.3, source tree digest emitted (image digest pending authorized build) |
| CI workflow syntax | YAML parse of `.github/workflows/backend-ci.yml` | PASS |
| Secret scan | grep for key/token patterns, filenames only | No matches in tracked source |

## Implemented and verified

- **Tauri cloud URL (blocker 12):** `config::resolve_cloud_url()` with payload→env→dev-default precedence, fail-closed in staging/production, rejects plaintext/loopback. All five call sites migrated. 3 Rust tests pass.
- **Authoritative migration runner (blocker 4):** `backend/shared/database/migrate.ts` with `--status`, `--baseline`, transactional apply, checksum ledger; `npm run db:migrate` repointed. 6 scenarios pass on a temporary PG16 cluster.
- **Scoped webhook uniqueness (20):** additive migration `0011` namespaces historical collisions and adds `(provider, instance, event id)` uniqueness; registered in `bootstrap.ts` so inline-schema test suites also receive the `provider` column (Brevo readiness 20/20).
- **Database TLS (22):** `resolveDatabaseSsl()` makes mode/CA configurable, defaults safely, and fails closed in production without a trusted CA; 5 assertions pass.
- **Deployment gates (13):** `deploy-staging.sh` aborts on validation/migration/readiness failure; `test-deploy-staging.sh` proves the migration case never starts the backend; CI now runs deployment-script checks, Compose validation, a migration apply/idempotency/index check, and pins mocked Postal mode.
- **Staging configuration (25, 27):** all required values use quoted `:?FATAL` expressions (previously invalid YAML), `DATABASE_URL` is quoted and fail-closed, Email Line/Brevo env is present in both Compose files, and `backend/.env.example` documents staging injection variables.
- **Email reliability (15–19):** `emailReliabilitySecondPass.test.ts` covers single sender identity, stable Brevo idempotency header, webhook batching/event fingerprinting, and quota billing-period consistency across the month boundary.
- **Log redaction (23):** free-form messages, nested context values, and error messages are redacted; nginx access logs no longer include query strings. `logRedaction.test.ts` passes.
- **WhatsApp (32, 34):** `sessionRecovery.ts` detects `failed`/`action_required` sessions and only starts a session after operator confirmation plus tenant ownership verification; `webhookReRegistration.ts` detects loopback webhook URLs and plans idempotent re-registration. Mocked tests pass.
- **Resource fit (6/26):** Swarm-only `deploy.replicas` removed; Compose service-level `mem_limit`/`cpus` used; validator proves 6,800/8,192 MB.
- **Postal localhost header (14), config schema fields (18/24), OpenWA version guard (29), Compose validation (3/35):** implemented and checked by typecheck, config tests and existing suites.
- **Documentation conflicts (37–42):** superseding notes added to each conflicting document.

## Implemented but not fully verified

- **nginx + certbot (3):** services and config present; certificate issuance, renewal and reload were not executed (no VM/DNS). Static ingress/TLS checks pass.
- **Sender identity, Brevo idempotency, webhook batch/dedupe, cross-month quota (15–19):** dedicated mocked tests pass, but no live provider call was made.
- **OpenWA provenance (5):** source commit and tree digest recorded; image digest requires an authorized build and was not produced.
- **Backups (11, 30, 31):** paired DB + OpenWA encrypted backup scripts and systemd timer written; DB dry-run restore passes, no live/off-site restore drill or Chrome-major rollback drill.
- **OpenWA cap and webhook re-registration (33, 34):** cap set in Compose and internal callback URL configured; loopback planning is unit-tested, but no load test or live re-registration was executed.
- **Email Line env in production Compose (27):** production file updated with explicit live-send guard; both Compose files validated, no deployment applied.

## Blocked by external dependencies

- 1 — no live cloud deployment evidence (requires provisioned environment and credentials).
- 7 — Postal self-hosting from GCP (outbound 25 blocked); requires relay decision.
- 8 — mail DNS records unapplied (external registrar authority).
- 9 — Brevo key rotation, old relay key revocation and inbox confirmation (external account action).
- 10 — real WhatsApp QR scan and live delivery (physical phone + gym owner).
- 28 — scheduler decision for notification delivery worker / domain event bus (product decision).

## Remaining deployment risks

- No end-to-end acceptance test has been run against a real cloud VM, real PostgreSQL restore, real Brevo/WhatsApp delivery or packaged desktop build against a cloud URL.
- Eight concurrent WhatsApp sessions is a planning estimate, not validated capacity.
- Certificate issuance/renewal and nginx container networking are unverified.
- Recovery objectives remain unmeasured; no timed failover drill exists.
- `GYMDECK_GCP_REMEDIATION_REGISTER.md` remains the authoritative status register; any blocker not marked `verified` must be treated as open.

## Deployment-readiness statement

**GymDeck is NOT declared deployment-ready.** Passing builds and unit tests do not establish verified migrations in the target environment, production configuration correctness, resource fit under real load, recovery procedures, or end-to-end acceptance. Those gates remain open as documented above.

## Working-tree note

Three frontend files and three `apps/owner-mobile/ios/**` files were already modified in the working tree. None were reverted or edited by this remediation; only the files listed in the register and report were changed. No commit or push was performed.
