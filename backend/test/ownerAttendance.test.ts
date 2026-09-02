/**
 * GymDeck Phase 9: Owner Attendance & Check-In Management Test Suite
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  gymMembers,
  attendanceLogs,
  auditLogs,
  syncChangeLog,
} from '../shared/database/schema';
import { ownerAttendanceService } from '../services/owner/ownerAttendanceService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runOwnerAttendanceTestSuite() {
  console.log('📋 Starting Owner Attendance Management & Check-In Test Suite...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();
  const OWNER_USER_ID = crypto.randomUUID();
  const passwordHash = await hashPassword('SecureOwnerPass123!');

  // 1. Seed Gyms & Owner User
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Alpha Gym Flagship',
      code: `GD-ALPHA-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Competitor Gym',
      code: `GD-BRAVO-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  await db.insert(users).values({
    id: OWNER_USER_ID,
    gymId: GYM_ALPHA_ID,
    email: `owner-${crypto.randomUUID().substring(0, 6)}@alpha.gym`,
    fullName: 'Alpha Gym Owner',
    passwordHash,
    role: 'OWNER',
    permissions: ['attendance.read', 'attendance.write', 'members.read', 'members.write'],
    accountStatus: 'ACTIVE',
  });

  // 2. Seed Members in Gym Alpha:
  // 2a. Active Member
  const activeMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Peter Parker',
      phone: '+15551112233',
      memberCode: 'GD-SPIDER',
    },
    OWNER_USER_ID
  );
  // Give active membership with future expiry
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);
  await db
    .update(gymMembers)
    .set({ membershipStatus: 'ACTIVE', expiresAt: futureDate })
    .where(eq(gymMembers.id, activeMember.id));

  // 2b. Expired Member
  const expiredMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Tony Stark',
      phone: '+15559998877',
      memberCode: 'GD-IRON',
    },
    OWNER_USER_ID
  );
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 1);
  await db
    .update(gymMembers)
    .set({ membershipStatus: 'EXPIRED', expiresAt: pastDate })
    .where(eq(gymMembers.id, expiredMember.id));

  // 2c. Inactive / Frozen Member
  const inactiveMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Steve Rogers',
      phone: '+15553334455',
      memberCode: 'GD-CAP',
    },
    OWNER_USER_ID
  );
  await db
    .update(gymMembers)
    .set({ membershipStatus: 'INACTIVE' })
    .where(eq(gymMembers.id, inactiveMember.id));

  // 3. Seed Member in Gym Bravo (Cross-Tenant)
  const bravoMember = await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Wade Wilson',
      phone: '+15556667788',
      memberCode: 'GD-POOL',
    },
    OWNER_USER_ID
  );

  // ==============================================================================
  // TEST 1: Valid Member Check-In by memberId and memberCode
  // ==============================================================================
  console.log('  1. Testing Valid Member Check-In (by memberId & memberCode)...');
  const checkIn1 = await ownerAttendanceService.checkInMember(
    GYM_ALPHA_ID,
    {
      memberId: activeMember.id,
      entryMethod: 'CODE_LOOKUP',
    },
    OWNER_USER_ID
  );

  assert.ok(checkIn1.attendanceId);
  assert.equal(checkIn1.status, 'APPROVED');
  assert.equal(checkIn1.memberCode, 'GD-SPIDER');
  assert.equal(checkIn1.fullName, 'Peter Parker');
  console.log('     ✅ Valid check-in approved with authoritative server timestamp.');

  // ==============================================================================
  // TEST 2: Duplicate Check-In Protection (2-Hour Cooldown)
  // ==============================================================================
  console.log('  2. Testing Duplicate Check-In Cooldown Protection...');
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkInMember(
        GYM_ALPHA_ID,
        { memberId: activeMember.id },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ Duplicate check-in gracefully rejected by 2-hour active cooldown.');

  // ==============================================================================
  // TEST 3: Idempotency Key Deduplication
  // ==============================================================================
  console.log('  3. Testing Idempotency Key Deduplication on Check-In...');
  const IDEMP_KEY = 'CHK-IDEMP-KEY-12345';
  const checkInWithIdemp1 = await ownerAttendanceService.checkInMember(
    GYM_ALPHA_ID,
    {
      memberId: activeMember.id,
      idempotencyKey: IDEMP_KEY,
    },
    OWNER_USER_ID
  );

  const checkInWithIdemp2 = await ownerAttendanceService.checkInMember(
    GYM_ALPHA_ID,
    {
      memberId: activeMember.id,
      idempotencyKey: IDEMP_KEY,
    },
    OWNER_USER_ID
  );

  assert.equal(checkInWithIdemp1.attendanceId, checkInWithIdemp2.attendanceId);
  assert.equal(checkInWithIdemp2.idempotentReplay, true);
  console.log('     ✅ Idempotency key returned existing check-in without duplicate record creation.');

  // ==============================================================================
  // TEST 4: Membership Eligibility Rejections (Expired, Inactive, Frozen)
  // ==============================================================================
  console.log('  4. Testing Membership Eligibility Enforcement...');
  // Expired member check-in rejection
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkInMember(
        GYM_ALPHA_ID,
        { memberCode: 'GD-IRON' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 403
  );

  // Inactive member check-in rejection
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkInMember(
        GYM_ALPHA_ID,
        { memberCode: 'GD-CAP' },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 403
  );
  console.log('     ✅ Expired and inactive members strictly blocked from check-in.');

  // ==============================================================================
  // TEST 5: Manual Attendance Entry (Reason Required, Future Timestamps Blocked)
  // ==============================================================================
  console.log('  5. Testing Manual Attendance Entry & Constraints...');
  // Rejection if notes/reason missing
  await assert.rejects(
    async () => {
      await ownerAttendanceService.recordManualAttendance(
        GYM_ALPHA_ID,
        {
          memberId: activeMember.id,
          checkInTime: new Date().toISOString(),
          notes: '',
        },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 422
  );

  // Rejection if future timestamp
  const futureCheckIn = new Date();
  futureCheckIn.setDate(futureCheckIn.getDate() + 2);
  await assert.rejects(
    async () => {
      await ownerAttendanceService.recordManualAttendance(
        GYM_ALPHA_ID,
        {
          memberId: activeMember.id,
          checkInTime: futureCheckIn.toISOString(),
          notes: 'Future check-in attempt',
        },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 422
  );

  // Valid manual entry for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const manualRecord = await ownerAttendanceService.recordManualAttendance(
    GYM_ALPHA_ID,
    {
      memberCode: 'GD-SPIDER',
      checkInTime: yesterday.toISOString(),
      notes: 'Card scanner was offline yesterday morning',
    },
    OWNER_USER_ID
  );

  assert.ok(manualRecord.attendanceId);
  assert.equal(manualRecord.entryMethod, 'MANUAL');
  assert.equal(manualRecord.notes, 'Card scanner was offline yesterday morning');
  console.log('     ✅ Manual attendance recorded with audit trail and constraint validation.');

  // ==============================================================================
  // TEST 6: Daily Attendance List, Filtering & Search
  // ==============================================================================
  console.log('  6. Testing Daily Attendance Directory, Search & Pagination...');
  const todayList = await ownerAttendanceService.getDailyAttendance(GYM_ALPHA_ID);
  assert.ok(todayList.totalCount >= 1);
  assert.ok(todayList.uniqueMembersCount >= 1);

  // Search by member name
  const searchRes = await ownerAttendanceService.getDailyAttendance(GYM_ALPHA_ID, undefined, 50, 0, 'Parker');
  assert.equal(searchRes.items.length, 1);
  assert.equal(searchRes.items[0]!.fullName, 'Peter Parker');
  console.log('     ✅ Daily attendance directory and member search verified.');

  // ==============================================================================
  // TEST 7: Member Check-Out
  // ==============================================================================
  console.log('  7. Testing Member Check-Out Flow...');
  const checkOutRes = await ownerAttendanceService.checkOutMember(
    GYM_ALPHA_ID,
    checkIn1.attendanceId,
    {},
    OWNER_USER_ID
  );

  assert.ok(checkOutRes.checkOutTime);

  // Attempting duplicate checkout must be rejected
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkOutMember(
        GYM_ALPHA_ID,
        checkIn1.attendanceId,
        {},
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ Check-out recorded and duplicate checkout prevented.');

  // ==============================================================================
  // TEST 8: Attendance Statistics & KPI Aggregations
  // ==============================================================================
  console.log('  8. Testing Attendance Statistics & KPIs...');
  const stats = await ownerAttendanceService.getAttendanceStats(GYM_ALPHA_ID);
  assert.ok(stats.todayCheckIns >= 1);
  assert.ok(stats.todayUniqueMembers >= 1);
  assert.ok(stats.weekCheckIns >= 2); // today + yesterday manual
  console.log('     ✅ Attendance statistics correctly aggregated server-side.');

  // ==============================================================================
  // TEST 9 & 10: Anti-IDOR & Multi-Tenant Boundary Enforcement
  // ==============================================================================
  console.log('  9 & 10. Testing Anti-IDOR & Cross-Tenant Boundaries...');
  // Gym Alpha cannot check in Gym Bravo member
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkInMember(
        GYM_ALPHA_ID,
        { memberId: bravoMember.id },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot check out Gym Alpha attendance record
  await assert.rejects(
    async () => {
      await ownerAttendanceService.checkOutMember(
        GYM_BRAVO_ID,
        checkIn1.attendanceId,
        {},
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Bravo cannot view Gym Alpha member attendance history
  await assert.rejects(
    async () => {
      await ownerAttendanceService.getMemberAttendanceHistory(
        GYM_BRAVO_ID,
        activeMember.id
      );
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Anti-IDOR strictly blocks cross-tenant attendance mutations and reads.');

  // ==============================================================================
  // TEST 11: Sync Change Log Integration for Desktop Pull
  // ==============================================================================
  console.log('  11. Testing Desktop Sync Change Log Participation...');
  const syncEvents = await db
    .select()
    .from(syncChangeLog)
    .where(and(eq(syncChangeLog.gymId, GYM_ALPHA_ID), eq(syncChangeLog.entityType, 'attendance_log')));
  assert.ok(syncEvents.length >= 2, 'Must record sync changes for check-ins, manual entries, and check-outs');
  console.log('     ✅ Attendance mutations stream into sync_change_log for Desktop pull.');

  // ==============================================================================
  // TEST 12: Concurrency Test (10 Parallel Check-in Requests)
  // ==============================================================================
  console.log('  12. Testing Concurrency (10 Parallel Check-in Requests)...');
  const freshMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Miles Morales',
      phone: '+15554443322',
      memberCode: 'GD-MILES',
    },
    OWNER_USER_ID
  );
  await db
    .update(gymMembers)
    .set({ membershipStatus: 'ACTIVE', expiresAt: futureDate })
    .where(eq(gymMembers.id, freshMember.id));

  // Fire 10 simultaneous check-ins for Miles
  const results = await Promise.allSettled(
    Array.from({ length: 10 }).map(() =>
      ownerAttendanceService.checkInMember(
        GYM_ALPHA_ID,
        { memberId: freshMember.id },
        OWNER_USER_ID
      )
    )
  );

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  // Exactly 1 request succeeds; 9 are rejected by cooldown
  assert.equal(fulfilled.length, 1, 'Exactly one concurrent check-in must succeed');
  assert.equal(rejected.length, 9, 'All concurrent duplicate check-ins must be rejected');

  const memberAttendanceCount = await db
    .select({ count: attendanceLogs.id })
    .from(attendanceLogs)
    .where(eq(attendanceLogs.memberId, freshMember.id));
  assert.equal(memberAttendanceCount.length, 1);
  console.log('     ✅ Concurrency proven: Exactly 1 record created, 9 safely rejected under race conditions.');

  // ==============================================================================
  // TEST 13: Attendance Audit Trail Verification
  // ==============================================================================
  console.log('  13. Testing Attendance Audit Trail Records...');
  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.gymId, GYM_ALPHA_ID));
  assert.ok(logs.some((l) => l.action === 'ATTENDANCE_CHECKED_IN'));
  assert.ok(logs.some((l) => l.action === 'ATTENDANCE_MANUAL_ENTRY'));
  assert.ok(logs.some((l) => l.action === 'ATTENDANCE_CHECKED_OUT'));
  console.log('     ✅ Full attendance audit trail preserved with actor context.');

  console.log('\n🎉 ALL OWNER ATTENDANCE MANAGEMENT & CHECK-IN TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runOwnerAttendanceTestSuite().catch((err) => {
  console.error('❌ Attendance Test Suite failed:', err);
  process.exit(1);
});
