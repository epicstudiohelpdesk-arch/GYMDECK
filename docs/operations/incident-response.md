# GymDeck Incident Response & Escalation Protocol

## 1. Severity Classification Matrix

| Level | Definition & Criteria | Target Initial Response | Escalation Path |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Complete API outage, database corruption, active credential compromise, total inability for members to check in or authenticate. | **$< 15\text{ minutes}$** | Lead Systems Architect + Engineering Lead + On-Call DevOps |
| **P1 (High)** | Partial outage affecting a major domain (e.g. Resend email dispatch failure, private document vault download errors, workout completion timeouts). | **$< 45\text{ minutes}$** | Core Backend Engineer + On-Call DevOps |
| **P2 (Medium)**| Degraded performance, rate-limiting edge cases, background analytics queue delays. | **$< 4\text{ hours}$** | Backend Engineering Team |
| **P3 (Low)** | Minor UX anomaly, non-blocking cosmetic error. | Next Business Day | Engineering Backlog |

---

## 2. Emergency Playbooks

### Playbook 1: PostgreSQL Database Unavailability / Outage
1. **Detect**: Alert triggered by `GET /ready` probe returning `503 Service Unavailable` with `database.status: "down"`.
2. **Triage**:
   - Inspect PostgreSQL container/instance status: `docker logs gymdeck-postgres-prod --tail 100`.
   - Verify disk space and memory headroom on host.
3. **Remediation**:
   - Restart container if crashed due to OOM: `docker-compose -f infrastructure/docker/docker-compose.prod.yml restart postgres`.
   - If storage corrupted, initiate point-in-time restore from latest encrypted snapshot (see [disaster-recovery.md](file:///Users/subhamdas/Documents/PROJECTS/GymDeck_Final%20copy/Gym_Software_Desktop/docs/operations/disaster-recovery.md)).
4. **Post-Incident**: Verify zero duplicate records created via idempotency checks.

### Playbook 2: JWT Signing Secret / Credential Compromise
1. **Detect**: Suspected exfiltration of `JWT_SECRET` or unauthorized token forgery.
2. **Immediate Action (Immediate Invalidation)**:
   - Generate a new CSPRNG 256-bit secret: `openssl rand -hex 32`.
   - Update `JWT_SECRET` in production secret manager.
   - Execute rolling restart of backend instances: `docker-compose -f infrastructure/docker/docker-compose.prod.yml up -d --no-deps backend`.
3. **Impact**: All currently issued access tokens will be rejected as invalid signature. Mobile clients will seamlessly execute `401 Unauthorized` $\rightarrow$ single-flight refresh or prompt members to re-authenticate cleanly.
4. **Purge Refresh Tokens**:
   - Execute database revocation: `UPDATE member_refresh_tokens SET is_revoked = true, revoked_at = NOW();`.

### Playbook 3: Resend Transactional Email Gateway Failure
1. **Detect**: Surge in `/v1/auth/signup` or `/v1/auth/forgot-password` latency / 500 errors from Resend API.
2. **Remediation**:
   - Verify Resend status page (status.resend.com) and API quota.
   - If Resend is degraded, enable secondary SMTP relay fallback in `backend/services/auth/email/`.
3. **Member Communication**: Mobile UI displays standard user-safe banner: *"Email delivery temporarily delayed. Please retry in a few moments."*
