/**
 * GymDeck WhatsApp - database-backed safety tests.
 *
 * These tests use the configured PostgreSQL database and create two isolated
 * temporary gym tenants. They verify behaviours that cannot be proven by pure
 * unit tests:
 *   - webhook/job idempotency is enforced by a unique database constraint;
 *   - tenant-scoped reads cannot return another gym's message;
 *   - a PROCESSING job abandoned by a restart is recovered to QUEUED.
 *
 * They never contact Meta and never send a message. Temporary rows are deleted
 * at the end (deleting the gym cascades its WhatsApp rows).
 *
 * Run with: RUN_WHATSAPP_DB_TESTS=1 npx tsx test/whatsapp.db.test.ts
 */

import { eq, inArray, sql } from 'drizzle-orm';
import { db, closeDatabasePool } from '../shared/database';
import {
  gyms,
  gymWhatsAppAccounts,
  whatsappMessageJobs,
} from '../shared/database/schema';
import { whatsappMessageService } from '../services/whatsapp/messageService';
import { whatsappQueueProcessor } from '../services/whatsapp/queueProcessor';
import { randomUUID } from 'crypto';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ ${message}`);
}

async function tableExists(name: string): Promise<boolean> {
  const result: any = await db.execute(
    sql`select to_regclass(${`public.${name}`}) is not null as present`
  );
  return Boolean(result.rows?.[0]?.present);
}

async function main(): Promise<void> {
  if (process.env.RUN_WHATSAPP_DB_TESTS !== '1') {
    console.log('⏭️  WhatsApp DB tests SKIPPED (set RUN_WHATSAPP_DB_TESTS=1 to run).');
    process.exit(0);
  }

  if (!(await tableExists('whatsapp_message_jobs'))) {
    console.log('⏭️  WhatsApp DB tests SKIPPED: migration 0005 is not applied.');
    process.exit(0);
  }

  console.log('🧪 Running WhatsApp database safety tests...');

  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const gymAId = randomUUID();
  const gymBId = randomUUID();

  try {
    await db.insert(gyms).values([
      { id: gymAId, name: 'WhatsApp Test Gym A', code: `WATEST-A-${suffix}` },
      { id: gymBId, name: 'WhatsApp Test Gym B', code: `WATEST-B-${suffix}` },
    ]);

    const accountA = (
      await db
        .insert(gymWhatsAppAccounts)
        .values({
        gymId: gymAId,
        phoneNumberId: `test-phone-a-${suffix}`,
        businessPhoneNumber: '919999999990',
        displayName: 'Test sender A',
          connectionStatus: 'DEVELOPMENT',
        })
        .returning()
    )[0]!;

    const accountB = (
      await db
        .insert(gymWhatsAppAccounts)
        .values({
        gymId: gymBId,
        phoneNumberId: `test-phone-b-${suffix}`,
        businessPhoneNumber: '919999999991',
        displayName: 'Test sender B',
          connectionStatus: 'DEVELOPMENT',
        })
        .returning()
    )[0]!;

    assert(Boolean(accountA.id && accountB.id), 'Two isolated sender accounts were created');

    const batchA = randomUUID();
    const batchB = randomUUID();
    const idempotencyA = `db-test:${suffix}:a`;

    const jobA = (
      await db
        .insert(whatsappMessageJobs)
        .values({
        gymId: gymAId,
        batchId: batchA,
        senderAccountId: accountA.id,
        recipientNumber: '919999999992',
        recipientName: 'Test Recipient',
        messageType: 'TEMPLATE',
        environment: 'DEVELOPMENT',
        messagePayload: JSON.stringify({ type: 'TEMPLATE', templateName: 'hello_world' }),
        renderedPreview: 'Hello World',
          idempotencyKey: idempotencyA,
          deliveryStatus: 'QUEUED',
        })
        .returning()
    )[0]!;

    const jobB = (
      await db
        .insert(whatsappMessageJobs)
        .values({
        gymId: gymBId,
        batchId: batchB,
        senderAccountId: accountB.id,
        recipientNumber: '919999999993',
        recipientName: 'Other Tenant Recipient',
        messageType: 'TEXT',
        environment: 'DEVELOPMENT',
        messagePayload: JSON.stringify({ type: 'TEXT', body: 'tenant B only' }),
        renderedPreview: 'tenant B only',
          idempotencyKey: `db-test:${suffix}:b`,
          deliveryStatus: 'QUEUED',
        })
        .returning()
    )[0]!;

    // 1. Duplicate prevention is a database constraint, not a UI check.
    let duplicateRejected = false;
    try {
      await db.insert(whatsappMessageJobs).values({
        gymId: gymAId,
        batchId: batchA,
        senderAccountId: accountA.id,
        recipientNumber: '919999999992',
        messageType: 'TEMPLATE',
        environment: 'DEVELOPMENT',
        messagePayload: JSON.stringify({ type: 'TEMPLATE', templateName: 'hello_world' }),
        idempotencyKey: idempotencyA,
        deliveryStatus: 'QUEUED',
      });
    } catch (err: any) {
      duplicateRejected = err?.code === '23505';
    }
    assert(duplicateRejected, 'A duplicate idempotency key is rejected by the database');

    // 2. Tenant-scoped read cannot access the other gym's job.
    let crossTenantBlocked = false;
    try {
      await whatsappMessageService.getJob(gymAId, jobB.id);
    } catch {
      crossTenantBlocked = true;
    }
    assert(crossTenantBlocked, "Gym A cannot read Gym B's message");

    const ownJob = await whatsappMessageService.getJob(gymBId, jobB.id);
    assert(ownJob.id === jobB.id, 'Gym B can read its own message');

    // 3. Restart recovery: an expired PROCESSING lease returns to QUEUED.
    await db
      .update(whatsappMessageJobs)
      .set({
        deliveryStatus: 'PROCESSING',
        processingLeaseExpiresAt: new Date(Date.now() - 60_000),
      })
      .where(eq(whatsappMessageJobs.id, jobA.id));

    const recovered = await whatsappQueueProcessor.recoverStale();
    assert(recovered >= 1, 'recoverStale reports at least one abandoned job');

    const recoveredRows = await db
      .select({ status: whatsappMessageJobs.deliveryStatus })
      .from(whatsappMessageJobs)
      .where(eq(whatsappMessageJobs.id, jobA.id));
    assert(
      recoveredRows[0]?.status === 'QUEUED',
      'Abandoned PROCESSING job is recovered to QUEUED'
    );

    // 4. Gym-scoped listing never leaks the other tenant.
    const listA = await whatsappMessageService.history(gymAId, { limit: 50 });
    assert(
      listA.messages.every((message: any) => message.id !== jobB.id),
      "Gym A's history excludes Gym B's message"
    );

    console.log('✅ WhatsApp database safety tests passed');
  } finally {
    // Cascades remove the temporary accounts, jobs, audit rows and consents.
    await db.delete(gyms).where(inArray(gyms.id, [gymAId, gymBId])).catch(() => undefined);
    await closeDatabasePool().catch(() => undefined);
  }

  process.exit(0);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeDatabasePool().catch(() => undefined);
  process.exit(1);
});
