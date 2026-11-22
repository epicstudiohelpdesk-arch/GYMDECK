# Email Reconciliation Procedure

**Scope:** Postal email jobs in `UNKNOWN_OUTCOME` or `RECONCILIATION_REQUIRED`, and legacy accepted attempts with incomplete recipient/quota application.  
**Status:** Internal operator procedure. There is no public reconciliation endpoint or UI.  
**Provider:** Postal only.

## 1. Non-negotiable safety rules

1. **Never resend from the same outbox job or attempt.** A manual retry can duplicate delivery because Postal accepts a request before final delivery is known.
2. **Never reset `UNKNOWN_OUTCOME` or `RECONCILIATION_REQUIRED` to `PENDING`.** That re-enables automatic dispatch.
3. **Do not infer delivery from the absence of a bounce.** Only provider evidence can establish acceptance.
4. **Do not assume every ambiguous attempt was delivered.** If acceptance cannot be proven, the outcome remains unresolved.
5. **Do not release or consume quota until the recipient batch is reconciled.** The reservation represents an unresolved send.
6. **Do not modify historical delivery events.** Preserve attempt, outbox, recipient, event and raw provider payload records.
7. Manual writes require a second reviewer and a recorded incident/ticket reference.

## 2. Read-only audit first

Run from `backend/`:

```bash
npx tsx scripts/audit-legacy-email-attempts.ts
# or machine-readable:
npx tsx scripts/audit-legacy-email-attempts.ts --json
```

The script runs in a `READ ONLY` transaction. It reports:

- `accepted_unapplied` — `ACCEPTED` attempts with still-`QUEUED` batch recipients
- `accepted_outstanding_reservation` — accepted attempts whose billing period still has reserved quota
- `accepted_no_usage_row` — accepted attempts with no quota row for their message period
- `accepted_missing_batch` — accepted attempts without a durable recipient batch
- `unresolved_with_provider_id` — unresolved attempts that can be probed
- `unresolved_without_provider_id` — unresolved attempts with no probe key
- `duplicate_recipient_attempts` — recipients present in more than one non-rejected attempt
- `outstanding_reservations` — quota rows with `reserved_count > 0`
- `expired_processing` — expired `PROCESSING` jobs

## 3. Inspect one job

Use the outbox ID from the audit:

```sql
SELECT o.*, m.subject, m.status AS message_status, m.created_at AS message_created_at
FROM email_outbox o
JOIN email_messages m ON m.id = o.email_message_id
WHERE o.id = '<OUTBOX_ID>';

SELECT a.*
FROM email_dispatch_attempts a
WHERE a.outbox_id = '<OUTBOX_ID>'
ORDER BY a.attempt_number;

SELECT r.id, r.recipient_email, r.delivery_status, r.provider_message_id,
       r.provider_token, r.attempts, r.last_attempt_at, r.failure_reason
FROM email_recipients r
WHERE r.id IN (
  SELECT jsonb_array_elements_text(a.recipient_batch_ids)::uuid
  FROM email_dispatch_attempts a
  WHERE a.outbox_id = '<OUTBOX_ID>'
);

SELECT * FROM email_delivery_events
WHERE email_message_id = '<MESSAGE_ID>'
ORDER BY event_timestamp;
```

Check and record:

- `attempt_status`, `attempt_number`, `provider_message_id`, `provider_response`
- `recipient_batch_ids` and the current status of each recipient
- `error_code`, `error_message`, `reconciliation_notes`
- `request_started_at`, `request_completed_at`, `last_heartbeat_at`
- outbox `job_status`, `current_attempt_id`, `lease_expires_at`
- quota row for `to_char(message.created_at AT TIME ZONE 'Asia/Kolkata','YYYY-MM')`

## 4. Determine whether Postal accepted the message

Acceptance requires provider evidence. Use, in order:

1. **Durable `ACCEPTED` attempt** with a coherent batch and provider response.
2. **Postal message lookup** for a numeric Postal message ID:
   - `provider_message_id` on the attempt or recipient, or
   - the numeric ID inside `provider_response`.
   - Postal API: `POST /api/v1/messages/message` with `{ "id": <numeric_id> }`.
3. **Postal delivery webhook events** already stored in `email_delivery_events` / raw payloads.

A provider status showing the message was accepted or delivered is positive evidence. A 404/not-found, an empty response, an email-only match, or no ID is **not** evidence of rejection.

### Decision rules

| Evidence | Recipient action | Quota action | Outbox action |
|---|---|---|---|
| Postal confirms acceptance, batch recipients still `QUEUED` | Mark only that durable batch `SENT` with provider ID | Consume only that batch; remove its reservation | Complete/re-queue according to remaining recipients |
| Postal confirms acceptance, recipients already `SENT`/`DELIVERED` | No recipient change | Consume only once if not already accounted | Complete; do not resend |
| Postal confirms rejection before acceptance | Mark queued batch `FAILED` | Release that batch reservation | `FAILED` |
| No usable provider ID or no conclusive response | Leave `QUEUED` | Keep reserved | Keep `RECONCILIATION_REQUIRED`/`UNKNOWN_OUTCOME` |
| Evidence is contradictory | Leave unchanged | Keep reserved | Escalate; remain unresolved |
| Provider accepted but exact batch cannot be identified | Do not guess | Keep reserved | Remain unresolved |

## 5. State-specific handling

### 5.1 `UNKNOWN_OUTCOME` / `RECONCILIATION_REQUIRED`

1. Run the audit and inspect the latest attempt.
2. If a numeric Postal ID exists, probe Postal.
3. If accepted:
   - Apply only `recipient_batch_ids` from that attempt.
   - Consume quota for those recipients exactly once.
   - Complete the outbox/message if no recipients remain.
4. If rejected before acceptance:
   - Mark the batch `FAILED`.
   - Release the reservation.
   - Mark the outbox `FAILED` with an explanatory note.
5. If unresolved:
   - Leave the job in reconciliation.
   - Keep the quota reserved.
   - Record the probe evidence and next review date.

### 5.2 Legacy `ACCEPTED` but recipients still `QUEUED`

This should not occur for attempts created after Phase 2B, because acceptance and batch application are atomic.

1. Probe the provider if a numeric ID exists.
2. Apply only the recipients listed in that attempt's `recipient_batch_ids`.
3. Do not apply other queued recipients from the message.
4. Consume only the applied count.
5. Preserve the original attempt row and append a reconciliation note.

### 5.3 `ACCEPTED` with no quota usage row / outstanding reservation

There is no per-attempt quota-applied marker for legacy rows. The audit cannot prove whether consumption was recorded.

1. Compare the message period, SENT/DELIVERED count, `reserved_count` and `consumed_count`.
2. Look for another attempt or message in the same reservation.
3. Only consume if the accepted batch is proven unaccounted.
4. Only release if the batch was proven not accepted.
5. Otherwise leave the reservation and escalate.

### 5.4 Same recipient in multiple attempts

Multiple attempts do not prove multiple deliveries. They may be retries after a pre-acceptance failure.

1. Probe each attempt with a provider ID.
2. Count a recipient as sent once if any attempt proves acceptance.
3. Keep quota consumption at one unit per recipient.
4. If two attempts both prove acceptance, escalate as a possible duplicate delivery; do not silently collapse the history.

## 6. Manual quota action template

These are templates, not automatic repairs. Freeze the relevant worker/job, obtain approval, and run in a transaction with row locks. Replace placeholders with audited counts.

**Consume an accepted batch:**

```sql
BEGIN;

SELECT * FROM email_monthly_usage
WHERE gym_id = '<GYM_ID>' AND billing_period = '<YYYY-MM>'
FOR UPDATE;

-- Only rows in the proven attempt batch, still QUEUED.
UPDATE email_recipients
SET delivery_status = 'SENT',
    provider_message_id = COALESCE(provider_message_id, '<PROVIDER_ID>'),
    last_attempt_at = now(),
    updated_at = now()
WHERE id IN ('<RECIPIENT_ID_1>', '<RECIPIENT_ID_2>')
  AND delivery_status = 'QUEUED';

UPDATE email_monthly_usage
SET reserved_count = GREATEST(0, reserved_count - <AUDITED_BATCH_COUNT>),
    consumed_count = consumed_count + <AUDITED_APPLIED_COUNT>,
    updated_at = now()
WHERE gym_id = '<GYM_ID>' AND billing_period = '<YYYY-MM>';

UPDATE email_dispatch_attempts
SET reconciliation_notes = concat_ws(E'\n', reconciliation_notes,
      'Manual reconciliation: Postal accepted; batch applied; quota consumed. Ref <TICKET>.'),
    updated_at = now()
WHERE id = '<ATTEMPT_ID>';

COMMIT;
```

**Release a batch proven not accepted:**

```sql
BEGIN;

SELECT * FROM email_monthly_usage
WHERE gym_id = '<GYM_ID>' AND billing_period = '<YYYY-MM>'
FOR UPDATE;

UPDATE email_recipients
SET delivery_status = 'FAILED',
    failure_reason = 'Manual reconciliation: provider rejected before acceptance. Ref <TICKET>.',
    updated_at = now()
WHERE id IN ('<RECIPIENT_ID_1>', '<RECIPIENT_ID_2>')
  AND delivery_status = 'QUEUED';

UPDATE email_monthly_usage
SET reserved_count = GREATEST(0, reserved_count - <AUDITED_QUEUED_COUNT>),
    updated_at = now()
WHERE gym_id = '<GYM_ID>' AND billing_period = '<YYYY-MM>';

UPDATE email_outbox
SET job_status = 'FAILED',
    last_error = 'Manual reconciliation: batch not accepted; quota released. Ref <TICKET>.',
    completed_at = now(),
    current_attempt_id = NULL,
    lease_expires_at = NULL,
    updated_at = now()
WHERE id = '<OUTBOX_ID>';

COMMIT;
```

Never set the outbox back to `PENDING` as part of either template.

## 7. If a resend is genuinely required

A resend is a **new business action**, not a retry:

1. Keep the old outbox/attempt/history intact and unresolved/failed.
2. Obtain explicit approval.
3. Create a new message with a new idempotency key through the normal send API.
4. Exclude recipients already proven accepted.
5. Never reuse the old outbox job, attempt ID, or provider message ID.

## 8. Evidence to record

For every reconciliation, record:

- outbox ID, attempt ID, message ID, gym ID
- provider message ID and raw probe response
- recipient IDs and before/after statuses
- quota before/after (`reserved_count`, `consumed_count`)
- decision (accepted / rejected / unresolved)
- operator, reviewer, ticket and timestamp

Do not delete or rewrite delivery events or attempt rows.
