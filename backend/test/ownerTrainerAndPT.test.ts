/**
 * GymDeck Phase 11: Trainer, Staff & Personal Training Management Test Suite
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  ptPackages,
  ptSessions,
  payments,
  auditLogs,
  syncChangeLog,
} from '../shared/database/schema';
import { ownerTrainerService } from '../services/owner/ownerTrainerService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runOwnerTrainerAndPTTestSuite() {
  console.log('🏋️‍♂️ Starting Owner Trainer & Personal Training Management Test Suite...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const OWNER_USER_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecureOwnerPass123!');

  // 1. Seed Gyms & Owner User
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Alpha Elite Performance Gym',
      code: `GD-ALPHA-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Crossfit Studio',
      code: `GD-BRAVO-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values({
    id: OWNER_USER_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@alphaelite.gym`,
    fullName: 'Alpha Head Coach & Owner',
    passwordHash,
    role: 'OWNER',
    permissions: ['trainers.read', 'trainers.write', 'pt.read', 'pt.write', 'members.read', 'members.write', 'payments.read'],
    accountStatus: 'ACTIVE',
  });

  // 2. Seed Members in Gym Alpha
  const member = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Thor Odinson',
      phone: '+15559990011',
      memberCode: 'GD-THOR',
    },
    OWNER_USER_ID
  );

  const bravoMember = await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Loki Laufeyson',
      phone: '+15559990022',
      memberCode: 'GD-LOKI',
    },
    OWNER_USER_ID
  );

  // ==============================================================================
  // TEST 1: Trainer Profile Creation & Commission Settings
  // ==============================================================================
  console.log('  1. Testing Trainer Profile Creation & Commission Setup...');
  const trainer = await ownerTrainerService.createTrainer(
    GYM_ALPHA_ID,
    {
      fullName: 'Bruce Banner',
      phone: '+15557773344',
      email: 'bruce@alphaelite.gym',
      specialization: 'Hypertrophy & Biomechanics',
      experienceYears: 8,
      certifications: ['CSCS', 'NASM-PES'],
      bio: 'Olympic strength coach and biomechanics specialist.',
      commissionType: 'FIXED_PER_SESSION',
      commissionRate: 35.00,
    },
    OWNER_USER_ID
  );

  assert.ok(trainer.id);
  assert.equal(trainer.fullName, 'Bruce Banner');
  assert.equal(Number(trainer.commissionRate), 35.00);
  assert.equal(trainer.isActive, true);
  console.log('     ✅ Trainer profile created with commission settings and audit log.');

  // ==============================================================================
  // TEST 2: Trainer Profile Update & Retrieval
  // ==============================================================================
  console.log('  2. Testing Trainer Profile Update & Details Fetching...');
  const updatedTrainer = await ownerTrainerService.updateTrainer(
    GYM_ALPHA_ID,
    trainer.id,
    {
      rating: 4.95,
      specialization: 'Strength & Conditioning Specialist',
    },
    OWNER_USER_ID
  );

  assert.equal(Number(updatedTrainer.rating), 4.95);
  assert.equal(updatedTrainer.specialization, 'Strength & Conditioning Specialist');

  const fullTrainer = await ownerTrainerService.getTrainerById(GYM_ALPHA_ID, trainer.id);
  assert.equal(fullTrainer.fullName, 'Bruce Banner');
  assert.ok(Array.isArray(fullTrainer.certifications));
  console.log('     ✅ Trainer details updated and aggregated profile verified.');

  // ==============================================================================
  // TEST 3: Member ↔ Trainer Assignment
  // ==============================================================================
  console.log('  3. Testing Member ↔ Trainer Assignment Flow...');
  const assignmentRes = await ownerTrainerService.assignTrainer(
    GYM_ALPHA_ID,
    member.id,
    {
      trainerId: trainer.id,
      notes: 'Focus on heavy compound lifts and knee rehab',
    },
    OWNER_USER_ID
  );

  assert.ok(assignmentRes.assignment.id);
  assert.equal(assignmentRes.assignment.status, 'ACTIVE');
  assert.equal(assignmentRes.trainer.fullName, 'Bruce Banner');
  console.log('     ✅ Member successfully assigned to personal trainer.');

  // ==============================================================================
  // TEST 4: Trainer Re-Assignment & Historical Preservation
  // ==============================================================================
  console.log('  4. Testing Trainer Re-Assignment & History Preservation...');
  // Create second trainer
  const trainer2 = await ownerTrainerService.createTrainer(
    GYM_ALPHA_ID,
    {
      fullName: 'Steve Rogers',
      phone: '+15558884433',
      specialization: 'Endurance & Mobility',
      commissionType: 'PERCENTAGE',
      commissionRate: 50.00,
    },
    OWNER_USER_ID
  );

  // Re-assign member to trainer 2
  await ownerTrainerService.assignTrainer(
    GYM_ALPHA_ID,
    member.id,
    {
      trainerId: trainer2.id,
      notes: 'Transferred to endurance program',
    },
    OWNER_USER_ID
  );

  const trainerHistory = await ownerTrainerService.getMemberTrainerHistory(GYM_ALPHA_ID, member.id);
  assert.equal(trainerHistory.length, 2);
  assert.equal(trainerHistory[0]!.trainerName, 'Steve Rogers');
  assert.equal(trainerHistory[0]!.status, 'ACTIVE');
  assert.equal(trainerHistory[1]!.trainerName, 'Bruce Banner');
  assert.equal(trainerHistory[1]!.status, 'ENDED');
  console.log('     ✅ Previous trainer assignment gracefully ended while preserving full history.');

  // ==============================================================================
  // TEST 5: PT Package Purchase & Financial Ledger Linkage
  // ==============================================================================
  console.log('  5. Testing PT Package Purchase & Financial Ledger Integration...');
  const packagePurchase = await ownerTrainerService.purchasePTPackage(
    GYM_ALPHA_ID,
    member.id,
    {
      trainerId: trainer.id,
      packageName: '10-Session Performance Pack',
      totalSessions: 10,
      price: 600.00,
      paymentMethod: 'CARD',
      transactionReference: 'TXN-CARD-PT-1001',
      idempotencyKey: 'IDEMP-PT-PACK-1001',
    },
    OWNER_USER_ID
  );

  assert.ok(packagePurchase.package.id);
  assert.equal(packagePurchase.package.totalSessions, 10);
  assert.equal(packagePurchase.package.remainingSessions, 10);
  assert.equal(packagePurchase.package.usedSessions, 0);
  assert.equal(Number(packagePurchase.package.price), 600.00);

  // Verify Financial Ledger Record
  assert.ok(packagePurchase.payment.receiptNumber.startsWith('REC-PT-'));
  assert.equal(Number(packagePurchase.payment.amount), 600.00);

  const paymentInDb = (
    await db
      .select()
      .from(payments)
      .where(and(eq(payments.gymId, GYM_ALPHA_ID), eq(payments.receiptNumber, packagePurchase.payment.receiptNumber)))
      .limit(1)
  )[0];
  assert.ok(paymentInDb);
  console.log('     ✅ PT package purchased and linked atomically to the financial ledger.');

  // ==============================================================================
  // TEST 6: PT Session Completion & Session Consumption
  // ==============================================================================
  console.log('  6. Testing PT Session Completion & Session Consumption...');
  const completeRes = await ownerTrainerService.completePTSession(
    GYM_ALPHA_ID,
    packagePurchase.package.id,
    {
      durationMinutes: 60,
      focusArea: 'Deadlift Technique & Core Stability',
      trainerNotes: 'Heavy triple completed at 220kg with solid form.',
    },
    OWNER_USER_ID
  );

  assert.ok(completeRes.session.id);
  assert.equal(completeRes.session.status, 'COMPLETED');
  assert.equal(completeRes.packageRemainingSessions, 9);
  assert.equal(completeRes.packageStatus, 'ACTIVE');

  // Verify Trainer Earning Record
  assert.ok(completeRes.earning.id);
  assert.equal(Number(completeRes.earning.amount), 35.00);
  assert.equal(completeRes.earning.status, 'ACCRUED');
  console.log('     ✅ PT session completed: 1 session consumed and trainer commission accrued.');

  // ==============================================================================
  // TEST 7: PT Session Cancellation (No Session Consumption)
  // ==============================================================================
  console.log('  7. Testing PT Session Cancellation Semantics...');
  // Manually insert a scheduled session
  const [scheduledSession] = await db
    .insert(ptSessions)
    .values({
      gymId: GYM_ALPHA_ID,
      packageId: packagePurchase.package.id,
      memberId: member.id,
      trainerId: trainer.id,
      sessionDate: new Date(),
      focusArea: 'Cardio & Conditioning',
      status: 'SCHEDULED',
    })
    .returning();

  const cancelRes = await ownerTrainerService.cancelPTSession(
    GYM_ALPHA_ID,
    scheduledSession!.id,
    'Member had urgent work conflict',
    OWNER_USER_ID
  );

  assert.equal(cancelRes.status, 'CANCELLED');
  assert.equal(cancelRes.cancellationReason, 'Member had urgent work conflict');

  // Verify package session balance remains untouched (still 9)
  const pkgCheck = (
    await db
      .select()
      .from(ptPackages)
      .where(eq(ptPackages.id, packagePurchase.package.id))
      .limit(1)
  )[0];
  assert.equal(pkgCheck?.remainingSessions, 9);
  console.log('     ✅ Session cancelled without unauthorized session consumption.');

  // ==============================================================================
  // TEST 8: Trainer Earnings Ledger Query
  // ==============================================================================
  console.log('  8. Testing Trainer Earnings Ledger Aggregation...');
  const earnings = await ownerTrainerService.getTrainerEarnings(GYM_ALPHA_ID, trainer.id);
  assert.ok(earnings.totalAccrued >= 35.00);
  assert.equal(earnings.items.length, 1);
  assert.equal(earnings.items[0]!.memberName, 'Thor Odinson');
  console.log(`     ✅ Trainer earnings aggregated: $${earnings.totalAccrued.toFixed(2)} accrued.`);

  // ==============================================================================
  // TEST 9 & 10: Anti-IDOR & Multi-Tenant Boundaries
  // ==============================================================================
  console.log('  9 & 10. Testing Anti-IDOR & Cross-Tenant Boundaries...');
  // Gym Alpha cannot assign Gym Bravo member
  await assert.rejects(
    async () => {
      await ownerTrainerService.assignTrainer(
        GYM_ALPHA_ID,
        bravoMember.id,
        { trainerId: trainer.id },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot complete Gym Alpha PT package session
  await assert.rejects(
    async () => {
      await ownerTrainerService.completePTSession(
        GYM_BRAVO_ID,
        packagePurchase.package.id,
        {},
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Anti-IDOR strictly blocks all cross-tenant trainer and PT operations.');

  // ==============================================================================
  // TEST 11: Package Depletion & Over-Consumption Protection
  // ==============================================================================
  console.log('  11. Testing Package Depletion & Non-Negative Boundary...');
  // Create a 1-session package
  const singlePack = await ownerTrainerService.purchasePTPackage(
    GYM_ALPHA_ID,
    member.id,
    {
      trainerId: trainer.id,
      packageName: 'Single Drop-in PT Session',
      totalSessions: 1,
      price: 70.00,
    },
    OWNER_USER_ID
  );

  // Complete the 1 session -> status should become DEPLETED
  const finalComp = await ownerTrainerService.completePTSession(
    GYM_ALPHA_ID,
    singlePack.package.id,
    { focusArea: 'Assessment' },
    OWNER_USER_ID
  );
  assert.equal(finalComp.packageRemainingSessions, 0);
  assert.equal(finalComp.packageStatus, 'DEPLETED');

  // Attempting another completion on depleted package must be rejected!
  await assert.rejects(
    async () => {
      await ownerTrainerService.completePTSession(
        GYM_ALPHA_ID,
        singlePack.package.id,
        { focusArea: 'Extra session' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ Depleted package strictly prevents negative sessions (409 Conflict).');

  // ==============================================================================
  // TEST 12: Concurrency & Race Condition Defense (10 Simultaneous Completions)
  // ==============================================================================
  console.log('  12. Testing Concurrency (10 Parallel Session Completions on 1-Session Pack)...');
  const racePack = await ownerTrainerService.purchasePTPackage(
    GYM_ALPHA_ID,
    member.id,
    {
      trainerId: trainer.id,
      packageName: 'Race Pack',
      totalSessions: 1,
      price: 70.00,
    },
    OWNER_USER_ID
  );

  // Fire 10 simultaneous completions for the 1 remaining session
  const raceResults = await Promise.allSettled(
    Array.from({ length: 10 }).map(() =>
      ownerTrainerService.completePTSession(
        GYM_ALPHA_ID,
        racePack.package.id,
        { focusArea: 'Race completion' },
        OWNER_USER_ID
      )
    )
  );

  const fulfilled = raceResults.filter((r) => r.status === 'fulfilled');
  const rejected = raceResults.filter((r) => r.status === 'rejected');

  assert.equal(fulfilled.length, 1, 'Exactly one concurrent completion must succeed');
  assert.equal(rejected.length, 9, 'All subsequent concurrent completions must be rejected');

  const finalCheck = (
    await db
      .select()
      .from(ptPackages)
      .where(eq(ptPackages.id, racePack.package.id))
      .limit(1)
  )[0];
  assert.equal(finalCheck?.remainingSessions, 0);
  assert.equal(finalCheck?.usedSessions, 1);
  assert.equal(finalCheck?.status, 'DEPLETED');
  console.log('     ✅ Concurrency proven: Exactly 1 session consumed, 0 balance preserved.');

  // ==============================================================================
  // TEST 13: Desktop Sync Stream Durability
  // ==============================================================================
  console.log('  13. Testing Desktop Sync Change Log Participation...');
  const syncChanges = await db
    .select()
    .from(syncChangeLog)
    .where(and(eq(syncChangeLog.gymId, GYM_ALPHA_ID)));
  assert.ok(syncChanges.some((c) => c.entityType === 'trainer'));
  assert.ok(syncChanges.some((c) => c.entityType === 'trainer_assignment'));
  assert.ok(syncChanges.some((c) => c.entityType === 'pt_package'));
  assert.ok(syncChanges.some((c) => c.entityType === 'pt_session'));
  console.log('     ✅ Trainer and PT mutations stream into sync_change_log for Desktop sync.');

  // ==============================================================================
  // TEST 14: Audit Trail Records
  // ==============================================================================
  console.log('  14. Testing Audit Trail Records...');
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.gymId, GYM_ALPHA_ID));
  assert.ok(logs.some((l) => l.action === 'TRAINER_CREATED'));
  assert.ok(logs.some((l) => l.action === 'TRAINER_ASSIGNED'));
  assert.ok(logs.some((l) => l.action === 'PT_PACKAGE_PURCHASED'));
  assert.ok(logs.some((l) => l.action === 'PT_SESSION_COMPLETED'));
  assert.ok(logs.some((l) => l.action === 'PT_SESSION_CANCELLED'));
  console.log('     ✅ Full Trainer & PT audit trail preserved with actor context.');

  console.log('\n🎉 ALL OWNER TRAINER & PERSONAL TRAINING TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runOwnerTrainerAndPTTestSuite().catch((err) => {
  console.error('❌ Trainer & PT Test Suite failed:', err);
  process.exit(1);
});
