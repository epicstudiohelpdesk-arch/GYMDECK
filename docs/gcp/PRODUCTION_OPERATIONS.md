# GymDeck GCP Production Operations (baseline)

Remediation baseline only — does not authorize provisioning, DNS changes, or deployment.

## 1. Secrets injection and rotation

- Source of truth: GCP Secret Manager. Populate root-only `/etc/gymdeck/prod.env` (`chmod 600`, owner `root`) from Secret Manager at deploy time. Never commit `.env`; repo ignores `.env` and `.env.*`.
- Required variables are enumerated in the remediation register and `infrastructure/docker/docker-compose.prod.yml`; required Compose variables fail fast via `${VAR:?FATAL}`.
- Rotation: JWT 90d, DB password 90d, storage keys 180d, Brevo API key immediately if exposed, OpenWA API key/webhook secret 90d, backup key 365d.
- Procedure: create new secret version → update env file → `docker compose up -d` → verify `/ready` → revoke old version. Never print secret values.

## 2. Logging and redaction

- Backend logger redacts context keys matching password/secret/token/api-key/etc. (`backend/shared/logging/logger.ts`). Free-form message strings are **not** redacted — never interpolate a secret into a message.
- nginx access log now records method + URI (not full query string) via `$request_method $uri $server_protocol`.
- `/ready` is logged; `/health` is excluded. Do not add tokens to URLs.
- Alert on: `/ready` 503, webhook quarantine growth, `RECONCILIATION_REQUIRED` email jobs, `PROCESSING` WhatsApp jobs older than 120 s, OpenWA sessions in `failed`, disk >80%, memory pressure/OOM kills, certificate expiry <30 d.

## 3. Backups and recovery

- `backup-db.sh` supports `DB_CONTAINER=gymdeck-postgres-prod` for Dockerized PostgreSQL; encrypted with AES-256-CBC.
- `backup-openwa.sh` encrypts the entire OpenWA `/app/data` volume (SQLite + `session-*` auth dirs + `baileys/` + media).
- systemd `gymdeck-backup.service`/`.timer` run both at 02:00 UTC daily, with 30-day local retention. Copy encrypted artifacts off-VM with object versioning.
- Restore: stop backend and OpenWA → restore DB via `restore-db.sh` → restore OpenWA volume → verify session IDs match `gym_whatsapp_accounts.openwa_session_id` → start OpenWA then backend. A DB-only restore leaves sessions orphaned.
- Recovery objectives in `docs/operations/disaster-recovery.md` are targets, **not measured**. Perform and time a drill before quoting RPO/RTO.

## 4. Firewall and least privilege

- GCP VPC ingress: 22 only from IAP range `35.235.240.0/20`; 80/443 public; deny 5432, 2785, 5000, 8080, 6379.
- Docker: only nginx publishes host ports. `gymdeck_internal` (`internal: true`) holds PostgreSQL only; backend/OpenWA also attach to `gymdeck_ingress` for outbound API calls.
- VM service account: no roles beyond logs/metrics write and Secret Manager accessor for the specific secret names. No project-wide editor. Use OS Login + IAP, no static SSH keys.
- OpenWA runs non-root (uid 997) with `no-new-privileges`; Chromium `--no-sandbox` means the container is the confinement boundary — keep it unprivileged and never publish its port.

## 5. OpenWA session capacity and recovery

- Eight concurrent sessions is a **planning estimate only** (upstream docs: ~8–10 sessions per 2 GB). Validate on Ubuntu 24.04 with the pinned Chrome before accepting more gyms.
- `MAX_CONCURRENT_SESSIONS=8` is set in Compose. Sessions ending `failed` are not auto-started; detect via `session.status` webhooks and re-link deliberately.
- Chrome-major rollback requires restoring `sessions/` from a backup taken before first start on the newer image; pre-0.23.5 rollback also requires `baileys/`.
- Internal webhook URL must remain `http://backend:8080/v1/webhooks/openwa`. Any migrated row with a `127.0.0.1`/`localhost` webhook URL must be re-registered.

## 6. Documentation status

Provider documentation conflicts (Resend vs Postal/Brevo, `?secret=` auth, soft-bounce suppression, "production ready" claims) are superseded by the code and by `GYMDECK_GCP_REMEDIATION_REGISTER.md`. Where a doc disagrees with code, the code wins.
