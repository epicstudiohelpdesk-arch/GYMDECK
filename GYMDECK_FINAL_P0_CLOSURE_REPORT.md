# GymDeck — Final P0 Closure Report

**Date:** 2026-11-23
**Scope:** closure work in the existing repository only. No GCP provisioning, DNS, production DB, production config, real email/WhatsApp, QR pairing, credential disclosure, commits or pushes. No unrelated UI/mobile files changed.

Legend: **I** = implementation, **A** = automated verification, **D** = disposable-runtime verification, **E** = external verification.

## Outcome summary

| Blocker | I | A | D | E | Status |
|---|---|---|---|---|---|
| #5 OpenWA image provenance | source pin only | provenance script passes | build not run | digest build/push not performed | **OPEN** |
| #3 TLS / certificate lifecycle | hardened | 9 TLS assertions + cert-file script pass | disposable cert/key cases pass | ACME issuance/renewal + nginx reload not run | **PARTIAL** |
| #33 OpenWA eight-session cap | compose cap=8 | upstream Jest 10/10 + mock drill pass | mock sessions only | real Chromium/WhatsApp load not run | **PARTIAL** |
| #34 webhook re-registration | implemented | unit + local-DB integration pass | mock OpenWA API pass | live OpenWA re-registration not run | **CLOSED (code path)** |
| Paired recovery | backup/restore scripts | syntax + timer wiring | full disposable DB+OpenWA restore passed | off-site/live VM restore not run | **CLOSED (disposable)** |

## #5 — OpenWA image provenance: OPEN

- **I:** `services/openwa/package.json:3` pins `0.30.3`; `services/openwa/Dockerfile:18,66` pins base images by digest; `infrastructure/scripts/openwa-provenance.sh` records source commit/tree digest.
- **A:** output: `version=0.30.3`, `source_commit=ca9c663f0e09bd04e704f6e6815f08013ffe7ba2`, `source_tree_sha256=44354b038cd93db4c057edd42133fd99a2704287d98ae7bdf2a07ec731fa9436`, `image_digest=PENDING_AUTHORIZED_BUILD`.
- **D:** Not performed. Exact missing dependency: reachable Docker daemon with buildx. No digest was fabricated.
- **E:** Required: authorized build/push of pinned source, then replace `build:` in `docker-compose.prod.yml:112-113` with `image: ...@sha256:<digest>` and verify health plus `linkPreview` contract.

## #3 — TLS and certificate lifecycle: PARTIAL

- **I:** `backend/shared/database/index.ts:15-48` validates `DATABASE_SSL_MODE`, requires a regular, owner-readable, non-group/world-writable PEM CA, parses X.509, returns `rejectUnauthorized: true`. Added `validate-certificate-files.sh`.
- **A:** `databaseTls.test.ts` 9 assertions passed (dev default, missing CA, production disable, invalid mode, malformed PEM, unreadable and world-writable CA, valid CA). Cert script passed valid pair and rejected missing/malformed/unreadable/world-writable key.
- **D:** Disposable cert/key generation only; `nginx -t` skipped (binary unavailable).
- **E:** ACME issuance/renewal and `kill -HUP 1` reload unverified. Missing: certbot, pebble/ACME test CA, nginx, Docker daemon. Compose wiring statically checked.

## #33 — OpenWA eight-session cap: PARTIAL (real capacity OPEN)

- **I:** `docker-compose.prod.yml:133` sets `MAX_CONCURRENT_SESSIONS: 8`.
- **A:** Upstream OpenWA Jest (session.service, session-engine-lifecycle-races, session-ownership-read-failure-status) with `-t MAX_CONCURRENT_SESSIONS`: 3 suites, **10 passed**, 704 skipped.
- **D:** Mock-OpenWA drill: cap read from Compose = 8; 8 sessions created; 9th rejected HTTP 400; simulated 500 then cap-consistent retry; slot released and replacement created HTTP 201. Peak harness RSS 350 MB, 65 ms, darwin/arm64, 6 CPUs, 8,192 MB. This is not Chromium memory.
- **E:** Real eight-session capacity UNVERIFIED. Requires Linux Docker runtime, disposable sessions, measured RSS/startup/stability.

## #34 — Legacy webhook re-registration: CLOSED (code path)

- **I:** `backend/services/whatsapp/webhookReRegistration.ts` plus internal callback URL in Compose.
- **A/D:** `backend/test/webhookReRegistrationDb.test.ts` uses local-PostgreSQL temp table (guard refuses non-local `DATABASE_URL`) and mock OpenWA HTTP API. Result: loopback replaced, valid row preserved, retry idempotent, partial failure recovered.
- **E:** Live OpenWA re-registration remains external.

## Paired recovery drill: CLOSED (disposable)

- **I:** `backup-openwa.sh` disposable `OPENWA_DATA_DIR` override; added `restore-openwa.sh`.
- **A/D:** `test-backup-scripts.sh`: DB 3/3 rows; OpenWA sqlite/session/auth files restored to isolated dir and byte-compared (`openwa.sqlite`, `main.sqlite`, `session.json`, `Cookies`); duration 0 s for synthetic data (not an RTO).
- **E:** Off-site copy and timed VM restore remain external.

## Runtime verification attempt (2026-11-23)

No application code was changed. The requested isolated Linux Docker runtime was unavailable:

- `docker context ls` → active `desktop-linux`, endpoint `unix:///Users/subhamdas/.docker/run/docker.sock`.
- `docker info --format '{{.ServerVersion}}'` and `docker version --format '{{.Server.Version}}'` timed out (20 s each, no output).
- `open -a Docker` plus 30 `docker info` attempts at 4 s intervals failed.
- `docker desktop start` → `Docker Desktop is already running`; `docker info` then timed out after 150 s.
- `docker desktop restart` timed out after 240 s.
- After killing/restarting Docker Desktop, only `com.docker.backend` (PID 98940) ran; 45 s later `docker info` returned `Cannot connect to the Docker daemon at unix:///Users/subhamdas/.docker/run/docker.sock. Is the docker daemon running?`
- Alternatives absent: `colima`, `podman`, `limactl`, `multipass`, `vagrant`, `qemu-system-x86_64`; `certbot`, `pebble`, `nginx` binaries absent.
- GitHub CLI has `workflow` scope, but no existing workflow exposes these custom runtime tests; adding one requires a prohibited commit/push.

Therefore #5, #3 and real-session #33 retain their open/partial status. #34 and paired recovery were preserved, not repeated.

## Regression and safety checks preserved from the prior pass

`npx tsc`, full backend test matrix, 6/6 migration scenarios, 3/3 Rust config tests, Compose validation, resource budget (6,800/8,192 MB), ingress/certificate validation, deploy-script tests, backup drill, capacity drill and provenance script all passed in the prior pass. Pre-existing user modifications remain untouched; no commits or pushes.

NOT READY FOR CONTROLLED STAGING
