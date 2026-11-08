# Mode A — Assisted Member Communications

Mode A lets the owner send WhatsApp or email messages to a selected group of members
from their own official number / mailbox, without a messaging provider and without
GymDeck storing message bodies.

## Data model

| Table | Purpose |
|---|---|
| `gym_communication_settings` | One row per gym: official phone, WhatsApp number, email, per-channel permissions, quiet hours. |
| `communication_broadcasts` | Broadcast audit row: channel, type, subject, SHA-256 body digest, counts, 90-day expiry. |
| `communication_broadcast_recipients` | Per-member status (`QUEUED`/`SENT`/`FAILED`/`SKIPPED`), masked contact, skip reason. |
| `gym_members` consent columns | `whatsapp_opt_in`, `email_opt_in`, `marketing_opt_in`, `consent_updated_at`. |

Message bodies are never persisted — only `body_sha256` and `body_length`.

## API (`/v1/owner/communications`)

- `GET /settings` — `settings.read`
- `PUT /settings` — `settings.write`
- `GET /audience?status=&search=&limit=` — `members.read`
- `POST /broadcasts/preview` — `communications.send`
- `GET /broadcasts/:id` — `communications.read`
- `PATCH /broadcasts/:id/progress` — `communications.send`
- `POST /broadcasts/:id/cancel` — `communications.send`

## Flow

1. Owner saves channels and permissions on Gym Profile → Contact & Communication.
2. The composer calls `POST /broadcasts/preview` with channel, type, body and audience.
3. The service applies consent, contact validity, duplicate detection, quiet hours and
   channel-permission policy, creates the audit batch, and returns one deep link per
   eligible member (`wa.me/...?text=` or `mailto:...?subject=&body=`).
4. The owner taps Open per member. WhatsApp or the mail client performs the send.
5. The UI reports the outcome through `PATCH .../progress`; the service keeps counts only.

## Security controls

- Tenant isolation: every query is scoped by `gymId` from the verified JWT; body-supplied IDs are never trusted.
- Authorization: owner auth plus granular `communications.read` / `communications.send` permissions.
- Validation: strict Zod schemas; 2,000-character body limit; 60-recipient cap per batch; control characters rejected.
- PII minimisation: audience and status APIs return masked contacts only; raw contact is used solely to build an ephemeral deep link.
- Audit: settings changes and broadcast lifecycle events are written to `audit_logs` without message bodies or raw contacts.
- Rate limiting: 20 broadcast preparations per 10 minutes per gym/user.
- Retention: broadcast rows expire after 90 days and are purged by the retention worker.
- Desktop token isolation: the Tauri proxy command keeps the cloud access token inside Rust; JS never receives it.

## Operations

- Apply `backend/shared/database/migrations/0001_communication_mode_a.sql` (or run `bootstrapDatabaseSchema()`), then restart the gateway.
- Desktop builds must be cloud-enrolled; the composer shows **Cloud offline** otherwise.
- Browser development fallback: set `gymdeck_cloud_url` and `gymdeck_cloud_token` in `localStorage`.
- Quiet hours use `COMMUNICATION_TIMEZONE` (default `Asia/Kolkata`).


