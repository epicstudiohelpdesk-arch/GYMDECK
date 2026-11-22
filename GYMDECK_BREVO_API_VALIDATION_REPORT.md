# GymDeck Email Line — Brevo API Configuration & Validation Report

**Date:** 2026-11-21
**Scope:** Secure backend-only Brevo configuration and Phase 1 credential validation
**Project:** GymDeck (`epicstudiohelpdesk-arch/GymDeck`)
**Environment:** Local development (macOS)

---

## Phase 1 status: AUTHENTICATED — test email pending authorization

| Check | Result |
| --- | --- |
| Credential stored in backend `.env` | Yes (gitignored; value never printed) |
| `GET /v3/account` | **HTTP 200** |
| Sender present in Brevo | Yes — `notifications@mail.epic-studio.in` |
| Sender name | `GymDeck` |
| Sender active/verified | Yes (`active: true`) |
| Account plan | Free |
| Transactional test email | **Sent once** — `HTTP 201 Created`, accepted by Brevo |
| Recipient | `subhamdasholycross2023@gmail.com` (developer-supplied) |
| Message ID | `<202611211549.36625531121@smtp-relay.mailin.fr>` |
| Inbox confirmation | **Pending developer confirmation** |

Phase 1 validation is complete: authentication, sender identity, and one authorized transactional send all succeeded. Inbox delivery has not been asserted.

---

## 1. Repository inspection findings

| Area | Finding |
| --- | --- |
| Backend application | `backend/` — Node.js + Express 4 + TypeScript, run with `tsx`, built with `tsc` |
| Runtime entry point | `backend/gateway/src/server.ts` (`npm run dev` / `npm start`) |
| Environment loading | `dotenv` loaded at the top of `backend/shared/config/index.ts` |
| Secret validation | Zod `EnvironmentSchema` in `backend/shared/config/index.ts`; invalid config throws at startup |
| Secret file | `backend/.env` (local, untracked) |
| Template | `backend/.env.example` (tracked, placeholders only) |
| Email modules | `backend/services/email/` — `emailService`, `deliveryWorker`, `postalClient`, `postalWebhookAuth`, `webhookService`, `quotaService` |
| Active email provider | **Postal** is the only dispatch provider. `deliveryWorker.ts` writes `provider: 'POSTAL'` and calls `postalClient.sendMessage(...)` |
| Provider abstraction | No generic provider interface today; the worker imports the Postal client directly |
| Legacy email config | Resend variables exist for the legacy `NOTIFICATION_PROVIDER_MODE=live` notification path, not the Email Line |
| Brevo | No prior Brevo code, configuration, or credentials existed in the repository |
| Frontend isolation | `frontend/` and `src-tauri/` contain no `BREVO` references; backend config is not bundled into client code |

Per the phase boundary, the Postal dispatch path was **not** modified and no provider switch was implemented.

---

## 2. Backend configuration location

- **Schema:** `backend/shared/config/index.ts` → `EnvironmentSchema`
- **Local values:** `backend/.env`
- **Tracked template:** `backend/.env.example`

The three variables were added to the schema as backend-only settings. `BREVO_API_KEY` is optional so the application boots unchanged when the credential is absent.

---

## 3. Environment variable names configured

| Variable | Value |
| --- | --- |
| `BREVO_API_KEY` | Present in local `backend/.env` only; value never displayed, logged, or reported |
| `BREVO_SENDER_EMAIL` | `notifications@mail.epic-studio.in` |
| `BREVO_SENDER_NAME` | `GymDeck` |

---

## 4. Git ignore verification

- `git check-ignore -v backend/.env` → ignored by `.gitignore:6:.env`
- `git ls-files` → no `.env` file is tracked anywhere in the repository
- `backend/.env` does not appear in `git status`
- Secret scans across the working tree (excluding `node_modules`, `dist`, `.git`) → no credential material in tracked or untracked project files

---

## 5. Brevo API authentication result

**Endpoint:** `GET https://api.brevo.com/v3/account`
**Headers:** `api-key` (read from `backend/.env`), `Accept: application/json`
**Timeout:** 25 s, one attempt (no retries)

**Result: `HTTP 200 OK`**

Safe account metadata observed:

- Company: Epic Studio - Creative Agency
- Plan type: `free`
- No 401/403/429 or network error

An earlier attempt in this phase with a Brevo SMTP relay key returned `401 Key not found`. That credential remains invalid for the v3 API and should be revoked; it was not used further.

---

## 6. Sender verification result

**Endpoint:** `GET https://api.brevo.com/v3/senders`
**Result: `HTTP 200 OK`**

- Total senders on account: 2
- Intended sender present: **yes**
- `notifications@mail.epic-studio.in` → `active: true`, display name `GymDeck`

The configured sender identity matches the intended GymDeck sender and is active in Brevo.

---

## 7. Transactional access status

- The account is on the **free plan**, which includes Brevo transactional email capability.
- The intended sender is active/verified, which is the account-level prerequisite for transactional sending.
- Brevo exposes no separate "transactional enabled" boolean on `/v3/account`; definitive acceptance can only be proven by an authorized send to `/v3/smtp/email`.

No transactional message has been submitted yet.

---

## 8. Controlled test email result

**Sent once, authorized explicitly by the developer.**

- Endpoint: `POST https://api.brevo.com/v3/smtp/email`
- Sender: `GymDeck <notifications@mail.epic-studio.in>`
- Recipient: `subhamdasholycross2023@gmail.com`
- Subject: `GymDeck Email Line Integration Test`
- Attempts: exactly 1 (no retry)
- Response: **`HTTP 201 Created`**

Brevo accepted the message for delivery.

## 9. Brevo message ID

```text
<202611211549.36625531121@smtp-relay.mailin.fr>
```

## 10. Inbox receipt confirmation

**Pending.** Brevo returning HTTP 201 and a message ID proves acceptance by the provider, not inbox delivery. The developer must confirm whether the message arrived. Failure to arrive would require checking spam/quarantine and the Brevo transactional log before drawing conclusions.

---

## 11. Security validation results

| Check | Result |
| --- | --- |
| API key backend-only | Yes — `backend/.env` / schema only |
| Key absent from frontend/Tauri code and bundles | Yes — no `BREVO` references under `frontend/` or `src-tauri/` |
| Key absent from logs and reports | Yes |
| Key absent from command output | Yes — only HTTP status and non-sensitive metadata printed |
| `.env` untracked and ignored | Yes |
| `.env.example` placeholders only | Yes — empty `BREVO_API_KEY`, no real values |
| No hardcoded credentials | Yes |
| Existing functionality affected | No — config addition is optional; backend typecheck passes |
| Credential exposure in chat | Present — the API key was pasted into chat and **should be rotated** after this phase |

**Backend typecheck:** `npm run typecheck` → exit 0.

---

## 12. Files created or modified

| File | Change |
| --- | --- |
| `backend/shared/config/index.ts` | Added optional `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` to the Zod schema |
| `backend/.env.example` | Added documented Brevo placeholders (empty API key) |
| `backend/.env` (local, gitignored) | Brevo variables with the API key stored locally |
| `GYMDECK_BREVO_API_VALIDATION_REPORT.md` | This report |

No Postal code, quota logic, tenant isolation, auth/RBAC, database schema, migrations, webhooks, DNS, or deployment configuration was changed. Nothing was committed or pushed.

---

## 13. Remaining blockers

1. **Developer confirmation of inbox receipt** (acceptance is proven; delivery is not).
2. **Rotation** of the API key now that the test is complete (it was shared in chat).
3. **Revocation** of the earlier SMTP relay key.

---

## 14. Recommendation

**GO** for Phase 1, conditional only on the developer confirming inbox receipt.

Backend authentication succeeds (`HTTP 200`), the intended sender `notifications@mail.epic-studio.in` is present and active as `GymDeck`, and Brevo accepted one authorized transactional email (`HTTP 201`, message ID recorded). No credentials were exposed in output. Broader integration (provider adapter, outbox routing, webhooks) remains out of scope and unstarted, pending the next phase.
