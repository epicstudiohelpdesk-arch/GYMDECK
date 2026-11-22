/**
 * Read-only audit of legacy email dispatch attempts.
 *
 * Usage (from backend/):
 *   npx tsx scripts/audit-legacy-email-attempts.ts
 *   npx tsx scripts/audit-legacy-email-attempts.ts --json
 *
 * The script starts a READ ONLY transaction and never updates data.
 */

import 'dotenv/config';
import { Pool } from 'pg';

type AuditCategory = {
  key: string;
  description: string;
  recommendedAction: string;
  rows: any[];
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const queries: Array<Omit<AuditCategory, 'rows'> & { sql: string }> = [
  {
    key: 'accepted_unapplied',
    description: 'ACCEPTED attempts whose batch still contains QUEUED recipients',
    recommendedAction:
      'Probe Postal for the attempt; if accepted, apply the batch and consume quota manually; never resend.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.attempt_number, a.provider_message_id, a.request_completed_at,
             b.batch_count, b.queued_count, b.statuses
      from email_dispatch_attempts a
      left join lateral (
        select count(*)::int as batch_count,
               count(*) filter (where r.delivery_status = 'QUEUED')::int as queued_count,
               array_agg(distinct r.delivery_status) as statuses
        from email_recipients r
        where r.id in (select jsonb_array_elements_text(a.recipient_batch_ids)::uuid)
      ) b on true
      where a.attempt_status = 'ACCEPTED'
        and coalesce(b.queued_count, 0) > 0
      order by a.request_completed_at nulls last, a.created_at
      limit 100
    `,
  },
  {
    key: 'accepted_outstanding_reservation',
    description: 'ACCEPTED attempts in a billing period that still has reserved quota',
    recommendedAction:
      'Determine which message/batch owns the reservation before consuming or releasing; do not release blindly.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.provider_message_id, u.billing_period, u.reserved_count, u.consumed_count,
             count(r.id) filter (where r.delivery_status in ('SENT','DELIVERED'))::int as sent_or_delivered
      from email_dispatch_attempts a
      join email_messages m on m.id = a.email_message_id
      join email_monthly_usage u
        on u.gym_id = a.gym_id
       and u.billing_period = to_char(m.created_at at time zone 'Asia/Kolkata','YYYY-MM')
      left join email_recipients r
        on r.id in (select jsonb_array_elements_text(a.recipient_batch_ids)::uuid)
      where a.attempt_status = 'ACCEPTED'
        and u.reserved_count > 0
      group by a.id, u.billing_period, u.reserved_count, u.consumed_count
      order by a.created_at
      limit 100
    `,
  },
  {
    key: 'accepted_no_usage_row',
    description: 'ACCEPTED attempts with no quota row for their message billing period',
    recommendedAction:
      'Verify whether consumption was ever recorded; if Postal accepted, reconcile the quota row. Do not resend.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.provider_message_id, a.request_completed_at,
             to_char(m.created_at at time zone 'Asia/Kolkata','YYYY-MM') as expected_billing_period
      from email_dispatch_attempts a
      join email_messages m on m.id = a.email_message_id
      left join email_monthly_usage u
        on u.gym_id = a.gym_id
       and u.billing_period = to_char(m.created_at at time zone 'Asia/Kolkata','YYYY-MM')
      where a.attempt_status = 'ACCEPTED'
        and u.id is null
      order by a.created_at
      limit 100
    `,
  },
  {
    key: 'accepted_sent_zero_consumed',
    description: 'ACCEPTED attempts with SENT/DELIVERED recipients but zero recorded consumption for the period',
    recommendedAction:
      'Verify the accepted batch against Postal. If unaccounted, consume only that batch; do not resend.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.provider_message_id, u.billing_period, u.reserved_count, u.consumed_count,
             count(r.id) filter (where r.delivery_status in ('SENT','DELIVERED'))::int as sent_or_delivered
      from email_dispatch_attempts a
      join email_messages m on m.id = a.email_message_id
      join email_monthly_usage u
        on u.gym_id = a.gym_id
       and u.billing_period = to_char(m.created_at at time zone 'Asia/Kolkata','YYYY-MM')
      left join email_recipients r
        on r.id in (select jsonb_array_elements_text(a.recipient_batch_ids)::uuid)
      where a.attempt_status = 'ACCEPTED'
        and u.consumed_count = 0
      group by a.id, u.billing_period, u.reserved_count, u.consumed_count
      having count(r.id) filter (where r.delivery_status in ('SENT','DELIVERED')) > 0
      order by a.created_at
      limit 100
    `,
  },
  {
    key: 'accepted_missing_batch',
    description: 'ACCEPTED attempts with no durable recipient batch',
    recommendedAction:
      'Remain unresolved unless Postal/provider records identify the exact recipients; do not infer from recipient rows.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.provider_message_id, a.recipient_count, a.recipient_batch_ids
      from email_dispatch_attempts a
      where a.attempt_status = 'ACCEPTED'
        and (a.recipient_batch_ids is null
             or jsonb_array_length(a.recipient_batch_ids) = 0)
      order by a.created_at
      limit 100
    `,
  },
  {
    key: 'unresolved_with_provider_id',
    description: 'UNKNOWN_OUTCOME / DISPATCHING attempts that have a provider message ID',
    recommendedAction:
      'Probe Postal using the numeric provider ID. Accepted -> apply/consume; rejected -> release; no result -> remain unresolved.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.attempt_status, a.provider_message_id, a.provider_response,
             a.request_started_at, a.request_completed_at,
             o.job_status, m.status as message_status
      from email_dispatch_attempts a
      join email_outbox o on o.id = a.outbox_id
      join email_messages m on m.id = a.email_message_id
      where a.attempt_status in ('DISPATCHING','UNKNOWN_OUTCOME')
        and a.provider_message_id is not null
      order by a.created_at desc
      limit 100
    `,
  },
  {
    key: 'unresolved_without_provider_id',
    description: 'UNKNOWN_OUTCOME / DISPATCHING attempts without a usable provider message ID',
    recommendedAction:
      'Do not assume delivery. Keep unresolved unless independent Postal logs prove acceptance; never auto-resend.',
    sql: `
      select a.id as attempt_id, a.outbox_id, a.email_message_id, a.gym_id,
             a.attempt_status, a.provider_message_id, a.error_code, a.error_message,
             a.request_started_at, a.request_completed_at,
             o.job_status, m.status as message_status
      from email_dispatch_attempts a
      join email_outbox o on o.id = a.outbox_id
      join email_messages m on m.id = a.email_message_id
      where a.attempt_status in ('DISPATCHING','UNKNOWN_OUTCOME')
        and a.provider_message_id is null
      order by a.created_at desc
      limit 100
    `,
  },
  {
    key: 'duplicate_recipient_attempts',
    description: 'Recipients included in more than one non-rejected attempt',
    recommendedAction:
      'Investigate whether more than one attempt reached Postal; repeated attempts do not prove duplicate delivery.',
    sql: `
      select r.id as recipient_id, r.email_message_id, r.gym_id, r.recipient_email,
             r.delivery_status, count(distinct a.id)::int as attempt_count,
             array_agg(distinct a.attempt_status) as attempt_statuses
      from email_recipients r
      join email_dispatch_attempts a
        on r.id in (select jsonb_array_elements_text(a.recipient_batch_ids)::uuid)
      where a.attempt_status not in ('REJECTED','FAILED_PERMANENT')
      group by r.id
      having count(distinct a.id) > 1
      order by attempt_count desc
      limit 100
    `,
  },
  {
    key: 'outstanding_reservations',
    description: 'Monthly quota rows with reserved_count > 0',
    recommendedAction:
      'Link each reservation to PENDING/PROCESSING/RECONCILIATION jobs and attempts before releasing or consuming.',
    sql: `
      select u.gym_id, u.billing_period, u.allocated_quota, u.reserved_count,
             u.consumed_count, u.updated_at,
             (select count(*)::int from email_outbox o
               where o.gym_id = u.gym_id
                 and o.job_status in ('PENDING','PROCESSING','RECONCILIATION_REQUIRED')) as open_jobs
      from email_monthly_usage u
      where u.reserved_count > 0
      order by u.updated_at desc
      limit 100
    `,
  },
  {
    key: 'expired_processing',
    description: 'PROCESSING jobs whose lease has expired',
    recommendedAction:
      'Run the normal recovery sweep; it applies ACCEPTED batches without resending and flags unresolved attempts.',
    sql: `
      select o.id as outbox_id, o.gym_id, o.email_message_id, o.current_attempt_id,
             o.attempts, o.lease_expires_at, o.last_heartbeat_at, o.locked_by
      from email_outbox o
      where o.job_status = 'PROCESSING'
        and o.lease_expires_at < now()
      order by o.lease_expires_at
      limit 100
    `,
  },
];

async function main(): Promise<void> {
  const asJson = process.argv.includes('--json');
  const client = await pool.connect();
  const categories: AuditCategory[] = [];

  try {
    await client.query('BEGIN TRANSACTION READ ONLY');

    for (const query of queries) {
      const result = await client.query(query.sql);
      categories.push({
        key: query.key,
        description: query.description,
        recommendedAction: query.recommendedAction,
        rows: result.rows,
      });
    }

    await client.query('ROLLBACK');
  } finally {
    client.release();
  }

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), categories }, null, 2));
    return;
  }

  console.log('GymDeck legacy email attempt audit (read-only)');
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('No records were modified.\n');

  for (const category of categories) {
    console.log(`## ${category.key}: ${category.rows.length} row(s)`);
    console.log(category.description);
    console.log(`Recommended: ${category.recommendedAction}`);
    if (category.rows.length > 0) console.table(category.rows);
    console.log('');
  }

  const total = categories.reduce((sum, category) => sum + category.rows.length, 0);
  console.log(`Total potentially affected/attention rows: ${total}`);
  console.log('Ambiguous outcomes are not evidence of delivery. Never auto-resend.');
}

main()
  .catch((err) => {
    console.error('Audit failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
