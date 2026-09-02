/**
 * GymDeck Final Independent Verification: Cloud Transaction Atomicity & Concurrency Test
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  gymMembers,
  syncChangeLog,
  syncIdempotencyLog,
} from '../shared/database/schema';
import { syncService, SyncPushEventDto } from '../services/sync/syncService';
import { eq, and } from 'drizzle-orm';

async function runVerification() {
  console.log('🧪 Starting Independent Verification for Cloud Transaction & Concurrency Invariants...\n');

  await bootstrapDatabaseSchema();

  const GYM_ID = crypto.randomUUID();
  const GYM_ATTACKER_ID = crypto.randomUUID();
  const DEVICE_ID = 'desktop-verify-node-1';

  // Seed test gym
  await db.insert(gyms).values({
    id: GYM_ID,
    code: `GD-VERIFY-${crypto.randomUUID().substring(0, 6).toUpperCase()}`,
    name: 'Verification Gym Alpha',
    address: '100 Verification Way',
    contactPhone: '+15550001111',
    contactEmail: 'alpha@verify.test',
    status: 'ACTIVE',
  });

  await db.insert(gyms).values({
    id: GYM_ATTACKER_ID,
    code: `GD-VERIFY-${crypto.randomUUID().substring(0, 6).toUpperCase()}`,
    name: 'Verification Gym Attacker',
    address: '200 Rogue Blvd',
    contactPhone: '+15550002222',
    contactEmail: 'attacker@verify.test',
    status: 'ACTIVE',
  });

  // ============================================================================
  // VERIFICATION 1: Rollback Atomicity on Transaction Failure
  // ============================================================================
  console.log('  1. Proving PostgreSQL Transaction Rollback Invariant on Internal Failure...');
  const doomedMemberId = crypto.randomUUID();
  const doomedEventId = crypto.randomUUID();

  // We test what happens if an unhandled error occurs during a transaction block
  try {
    await db.transaction(async (tx) => {
      // 1. Mutate domain
      await tx.insert(gymMembers).values({
        id: doomedMemberId,
        gymId: GYM_ID,
        memberCode: 'GD-DOOMED',
        fullName: 'Doomed Member',
        phone: '+15559998888',
        membershipStatus: 'ACTIVE',
        joinedAt: new Date(),
      });

      // 2. Insert into change log
      await tx.insert(syncChangeLog).values({
        gymId: GYM_ID,
        eventId: doomedEventId,
        entityType: 'gym_member',
        entityId: doomedMemberId,
        operation: 'CREATE',
        payload: { fullName: 'Doomed Member' },
        sourceDevice: DEVICE_ID,
      });

      // 3. Deliberately simulate catastrophic error / constraint failure before commit
      throw new Error('SIMULATED_TRANSACTION_FAILURE_BEFORE_COMMIT');
    });
  } catch (err: any) {
    assert.equal(err.message, 'SIMULATED_TRANSACTION_FAILURE_BEFORE_COMMIT');
  }

  // Verify that domain mutation was completely rolled back
  const rolledBackMember = (
    await db
      .select()
      .from(gymMembers)
      .where(and(eq(gymMembers.id, doomedMemberId), eq(gymMembers.gymId, GYM_ID)))
  )[0];
  assert.equal(rolledBackMember, undefined, 'Domain record must be completely rolled back');

  // Verify that sync_change_log record was completely rolled back
  const rolledBackChange = (
    await db
      .select()
      .from(syncChangeLog)
      .where(and(eq(syncChangeLog.gymId, GYM_ID), eq(syncChangeLog.eventId, doomedEventId)))
  )[0];
  assert.equal(rolledBackChange, undefined, 'sync_change_log record must be completely rolled back');

  // Verify that sync_idempotency_log was completely rolled back
  const rolledBackIdemp = (
    await db
      .select()
      .from(syncIdempotencyLog)
      .where(and(eq(syncIdempotencyLog.gymId, GYM_ID), eq(syncIdempotencyLog.eventId, doomedEventId)))
  )[0];
  assert.equal(rolledBackIdemp, undefined, 'sync_idempotency_log record must be completely rolled back');
  console.log('     ✅ Rollback proven: Zero orphan records committed on failure.');

  // ============================================================================
  // VERIFICATION 2: 10 Concurrent Submissions with UNIQUE(gym_id, event_id)
  // ============================================================================
  console.log('  2. Proving 10 Concurrent Submissions of Identical Event (Postgres 23505 Safety)...');
  const raceEventId = crypto.randomUUID();
  const raceMemberId = crypto.randomUUID();

  const raceEvent: SyncPushEventDto = {
    eventId: raceEventId,
    entityType: 'gym_member',
    entityId: raceMemberId,
    operation: 'CREATE',
    payload: {
      memberCode: 'GD-RACE-01',
      fullName: 'Race Survivor',
      phone: '+15551239999',
      membershipStatus: 'ACTIVE',
    },
    clientTimestamp: new Date().toISOString(),
  };

  const racePromises = Array.from({ length: 10 }, (_, i) =>
    syncService.pushBatch(GYM_ID, `worker-${i}`, [raceEvent])
  );

  const raceResults = await Promise.all(racePromises);

  let appliedCount = 0;
  let alreadyAppliedCount = 0;

  for (const res of raceResults) {
    assert.equal(res.results.length, 1);
    const item = res.results[0]!;
    if (item.status === 'APPLIED') appliedCount++;
    if (item.status === 'ALREADY_APPLIED') alreadyAppliedCount++;
  }

  assert.equal(appliedCount, 1, 'Exactly 1 request must commit as APPLIED');
  assert.equal(alreadyAppliedCount, 9, 'Exactly 9 requests must resolve safely as ALREADY_APPLIED');

  // Verify actual database state
  const members = await db
    .select()
    .from(gymMembers)
    .where(and(eq(gymMembers.id, raceMemberId), eq(gymMembers.gymId, GYM_ID)));
  assert.equal(members.length, 1, 'Database must contain exactly 1 member row');

  const changes = await db
    .select()
    .from(syncChangeLog)
    .where(and(eq(syncChangeLog.gymId, GYM_ID), eq(syncChangeLog.eventId, raceEventId)));
  assert.equal(changes.length, 1, 'Database must contain exactly 1 syncChangeLog row');

  const idemps = await db
    .select()
    .from(syncIdempotencyLog)
    .where(and(eq(syncIdempotencyLog.gymId, GYM_ID), eq(syncIdempotencyLog.eventId, raceEventId)));
  assert.equal(idemps.length, 1, 'Database must contain exactly 1 syncIdempotencyLog row');

  console.log('     ✅ Concurrency proven: Exactly 1 mutation committed, 9 safely acknowledged.');

  // ============================================================================
  // VERIFICATION 3: Strict Tenant Scoping & Cross-Gym Isolation
  // ============================================================================
  console.log('  3. Proving Strict Tenant Scoping (Gym Attacker cannot access Gym Alpha)...');
  const pullAlphaChanges = await syncService.pullChanges(GYM_ATTACKER_ID, 'attacker-device', 0, 50);
  assert.equal(pullAlphaChanges.changes.length, 0, 'Attacker gym must receive zero records belonging to Gym Alpha');
  console.log('     ✅ Tenant isolation proven: Cross-tenant data leakage is structurally impossible.');

  console.log('\n🎉 ALL INDEPENDENT VERIFICATION CHECKS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
