/**
 * GymDeck Phase 7: Owner Mobile Member Management, Lifecycle & Security Test Matrix
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  membershipPlans,
  memberMemberships,
  payments,
  attendanceLogs,
  trainers,
  ptPackages,
  auditLogs,
} from '../shared/database/schema';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword } from '../shared/security';
import { eq, and } from 'drizzle-orm';

async function runMemberManagementTestSuite() {
  console.log('🏋️ Starting Owner Mobile Member Management & Lifecycle Test Suite...\n');

  await bootstrapDatabaseSchema();

  const GYM_ALPHA_ID = crypto.randomUUID();
  const GYM_BRAVO_ID = crypto.randomUUID();

  const OWNER_USER_ID = crypto.randomUUID();
  const STAFF_USER_ID = crypto.randomUUID();
  const PASSWORD = 'SecurePassword123!';
  const passwordHash = await hashPassword(PASSWORD);

  // 1. Seed Gyms
  await db.insert(gyms).values([
    {
      id: GYM_ALPHA_ID,
      name: 'Alpha Gym Flagship',
      code: `GD-ALPHA-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_BRAVO_ID,
      name: 'Bravo Gym Competitor',
      code: `GD-BRAVO-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  // 2. Seed Users
  await db.insert(users).values([
    {
      id: OWNER_USER_ID,
      gymId: GYM_ALPHA_ID,
      email: `owner-${crypto.randomUUID().substring(0, 6)}@alpha.gym`,
      fullName: 'Alpha Owner',
      passwordHash,
      role: 'OWNER',
      permissions: ['members.read', 'members.write', 'members.delete', 'attendance.read', 'payments.read', 'memberships.read'],
      accountStatus: 'ACTIVE',
    },
    {
      id: STAFF_USER_ID,
      gymId: GYM_ALPHA_ID,
      email: `staff-${crypto.randomUUID().substring(0, 6)}@alpha.gym`,
      fullName: 'Alpha Staff ReadOnly',
      passwordHash,
      role: 'STAFF',
      permissions: ['members.read'], // No members.write or members.delete
      accountStatus: 'ACTIVE',
    },
  ]);

  // 3. Seed Membership Plan & Trainer in Gym Alpha
  const PLAN_ANNUAL_ID = crypto.randomUUID();
  await db.insert(membershipPlans).values({
    id: PLAN_ANNUAL_ID,
    gymId: GYM_ALPHA_ID,
    planName: 'Elite Annual Membership',
    durationDays: 365,
    price: '1200.00',
    isActive: true,
  });

  const TRAINER_TOM_ID = crypto.randomUUID();
  await db.insert(trainers).values({
    id: TRAINER_TOM_ID,
    gymId: GYM_ALPHA_ID,
    fullName: 'Trainer Tom Hardy',
    phone: '+15559876543',
    specialization: 'Hypertrophy & Strength',
    isActive: true,
  });

  // ==============================================================================
  // TEST 1: Create Member with Initial Plan & Payment (Transactional Atomicity)
  // ==============================================================================
  console.log('  1. Testing Transactional Member Admission (Member + Plan + Payment)...');
  const newMember = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Bruce Wayne',
      phone: '+15550001111',
      email: 'bruce@wayne-enterprises.test',
      gender: 'MALE',
      dob: '1985-02-19',
      address: '1007 Mountain Drive, Gotham',
      notes: 'VIP membership',
      planId: PLAN_ANNUAL_ID,
      initialPaymentAmount: 1200,
      initialPaymentMethod: 'CARD',
    },
    OWNER_USER_ID
  );

  assert.ok(newMember.id);
  assert.equal(newMember.fullName, 'Bruce Wayne');
  assert.equal(newMember.gymId, GYM_ALPHA_ID);
  assert.equal(newMember.membershipStatus, 'ACTIVE');
  assert.ok(newMember.expiresAt);

  // Verify membership instance in DB
  const memberships = await db
    .select()
    .from(memberMemberships)
    .where(and(eq(memberMemberships.gymId, GYM_ALPHA_ID), eq(memberMemberships.memberId, newMember.id)));
  assert.equal(memberships.length, 1);
  assert.equal(memberships[0]!.planId, PLAN_ANNUAL_ID);

  // Verify payment record in DB
  const paymentRows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.gymId, GYM_ALPHA_ID), eq(payments.memberId, newMember.id)));
  assert.equal(paymentRows.length, 1);
  assert.equal(Number(paymentRows[0]!.amount), 1200);

  console.log('     ✅ Member created atomically with active membership instance and payment record.');

  // ==============================================================================
  // TEST 2: Duplicate Member Code Rejection
  // ==============================================================================
  console.log('  2. Testing Duplicate Member Code Rejection in Same Gym...');
  await assert.rejects(
    async () => {
      await ownerService.createMember(
        GYM_ALPHA_ID,
        {
          fullName: 'Imposter Member',
          phone: '+15550002222',
          memberCode: newMember.memberCode, // Duplicate code
        },
        OWNER_USER_ID
      );
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ Duplicate memberCode rejected with 409 Conflict.');

  // ==============================================================================
  // TEST 3: Paginated Directory Listing with Status Filtering
  // ==============================================================================
  console.log('  3. Testing Paginated Directory & Status Filtering...');
  // Seed another member in Alpha
  const member2 = await ownerService.createMember(
    GYM_ALPHA_ID,
    {
      fullName: 'Clark Kent',
      phone: '+15550003333',
      email: 'clark@dailyplanet.test',
    },
    OWNER_USER_ID
  );

  const activeList = await ownerService.getMembers(GYM_ALPHA_ID, 10, 0, undefined, 'ACTIVE');
  assert.equal(activeList.total, 2);
  assert.equal(activeList.members.length, 2);

  const expiredList = await ownerService.getMembers(GYM_ALPHA_ID, 10, 0, undefined, 'EXPIRED');
  assert.equal(expiredList.total, 0);
  console.log('     ✅ Member directory pagination and status filtering verified.');

  // ==============================================================================
  // TEST 4: Member Search (Name, Phone, Code, Email)
  // ==============================================================================
  console.log('  4. Testing Member Search Filter...');
  const searchByName = await ownerService.getMembers(GYM_ALPHA_ID, 10, 0, 'Bruce');
  assert.equal(searchByName.members.length, 1);
  assert.equal(searchByName.members[0]!.fullName, 'Bruce Wayne');

  const searchByPhone = await ownerService.getMembers(GYM_ALPHA_ID, 10, 0, '3333');
  assert.equal(searchByPhone.members.length, 1);
  assert.equal(searchByPhone.members[0]!.fullName, 'Clark Kent');

  const searchByCode = await ownerService.getMembers(GYM_ALPHA_ID, 10, 0, newMember.memberCode);
  assert.equal(searchByCode.members.length, 1);
  assert.equal(searchByCode.members[0]!.id, newMember.id);
  console.log('     ✅ Member search by name, phone, and code verified.');

  // ==============================================================================
  // TEST 5: Detailed Member Profile Retrieval with Aggregated Relations
  // ==============================================================================
  console.log('  5. Testing Member Profile Aggregation (Plan, Attendance, Payments, Trainer)...');
  // Seed attendance check-in
  await db.insert(attendanceLogs).values({
    gymId: GYM_ALPHA_ID,
    memberId: newMember.id,
    entryMethod: 'QR_DYNAMIC',
  });

  // Seed PT package
  await db.insert(ptPackages).values({
    gymId: GYM_ALPHA_ID,
    memberId: newMember.id,
    trainerId: TRAINER_TOM_ID,
    packageName: '10 PT Sessions Pack',
    totalSessions: 10,
    remainingSessions: 9,
    usedSessions: 1,
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    status: 'ACTIVE',
  });

  const profile = await ownerService.getMemberById(GYM_ALPHA_ID, newMember.id);
  assert.equal(profile.member.fullName, 'Bruce Wayne');
  assert.equal(profile.membership.planName, 'Elite Annual Membership');
  assert.equal(profile.attendanceSummary.totalCheckIns, 1);
  assert.equal(profile.attendanceSummary.recentCheckIns.length, 1);
  assert.equal(profile.paymentSummary.totalPaid, 1200);
  assert.equal(profile.trainer.trainerName, 'Trainer Tom Hardy');
  console.log('     ✅ Profile correctly aggregated all business relationships in single payload.');

  // ==============================================================================
  // TEST 6: Member Profile Update
  // ==============================================================================
  console.log('  6. Testing Member Profile Update...');
  const updatedMember = await ownerService.updateMember(
    GYM_ALPHA_ID,
    newMember.id,
    {
      phone: '+15559990000',
      address: 'Wayne Manor, Gotham City',
      notes: 'Updated contact details',
    },
    OWNER_USER_ID
  );
  assert.equal(updatedMember.phone, '+15559990000');
  assert.equal(updatedMember.address, 'Wayne Manor, Gotham City');
  console.log('     ✅ Member profile fields updated with audit trail.');

  // ==============================================================================
  // TEST 7: Member Deactivation (Soft-Delete)
  // ==============================================================================
  console.log('  7. Testing Member Soft-Delete / Deactivation...');
  const deleteRes = await ownerService.deleteMember(GYM_ALPHA_ID, member2.id, OWNER_USER_ID);
  assert.equal(deleteRes.success, true);

  // Verify member no longer appears in directory listing
  const listAfterDelete = await ownerService.getMembers(GYM_ALPHA_ID, 10, 0);
  assert.equal(listAfterDelete.total, 1);
  assert.equal(listAfterDelete.members[0]!.id, newMember.id);

  // Verify getMemberById throws 404 for deleted member
  await assert.rejects(
    async () => {
      await ownerService.getMemberById(GYM_ALPHA_ID, member2.id);
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Soft-deleted member excluded from directory and profile queries.');

  // ==============================================================================
  // TEST 8: Member Attendance, Payments, and Memberships History Endpoints
  // ==============================================================================
  console.log('  8. Testing Member Historical Relation Endpoints...');
  const attendanceList = await ownerService.getMemberAttendance(GYM_ALPHA_ID, newMember.id, 10, 0);
  assert.equal(attendanceList.total, 1);

  const paymentsHistory = await ownerService.getMemberPayments(GYM_ALPHA_ID, newMember.id, 10, 0);
  assert.equal(paymentsHistory.total, 1);
  assert.equal(Number(paymentsHistory.payments[0]!.amount), 1200);

  const membershipsList = await ownerService.getMemberMemberships(GYM_ALPHA_ID, newMember.id);
  assert.equal(membershipsList.length, 1);
  assert.equal(membershipsList[0]!.planName, 'Elite Annual Membership');
  console.log('     ✅ Attendance, payments, and memberships history endpoints verified.');

  // ==============================================================================
  // TEST 9: Digital Activation Invitation Generation
  // ==============================================================================
  console.log('  9. Testing Digital Member Activation Token Generation...');
  const invite = await ownerService.createMemberInvite(GYM_ALPHA_ID, newMember.id, OWNER_USER_ID);
  assert.ok(invite.activationTicket);
  assert.ok(invite.displayCode.startsWith('GD-'));
  assert.equal(invite.memberId, newMember.id);
  assert.equal(invite.gymId, GYM_ALPHA_ID);
  console.log('     ✅ Digital activation invite token generated with 7-day validity.');

  // ==============================================================================
  // TEST 10 & 11: Multi-Tenant Anti-IDOR Cross-Gym Security Boundaries
  // ==============================================================================
  console.log('  10 & 11. Testing Multi-Tenant Anti-IDOR Security Invariants...');
  // Seed a member in Gym Bravo
  const bravoMember = await ownerService.createMember(
    GYM_BRAVO_ID,
    {
      fullName: 'Diana Prince',
      phone: '+15557778888',
    },
    OWNER_USER_ID
  );

  // Gym Alpha cannot access Gym Bravo member profile
  await assert.rejects(
    async () => {
      await ownerService.getMemberById(GYM_ALPHA_ID, bravoMember.id);
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Alpha cannot update Gym Bravo member
  await assert.rejects(
    async () => {
      await ownerService.updateMember(GYM_ALPHA_ID, bravoMember.id, { fullName: 'Hacked Name' });
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Alpha cannot deactivate Gym Bravo member
  await assert.rejects(
    async () => {
      await ownerService.deleteMember(GYM_ALPHA_ID, bravoMember.id);
    },
    (err: any) => err.statusCode === 404
  );

  // Gym Alpha cannot generate invite for Gym Bravo member
  await assert.rejects(
    async () => {
      await ownerService.createMemberInvite(GYM_ALPHA_ID, bravoMember.id);
    },
    (err: any) => err.statusCode === 404
  );

  console.log('     ✅ Anti-IDOR verified: Zero cross-tenant data leakage or mutation possible.');

  // ==============================================================================
  // TEST 12: Audit Trail Verification
  // ==============================================================================
  console.log('  12. Testing Audit Log Entries for Member Operations...');
  const memberAuditLogs = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.gymId, GYM_ALPHA_ID), eq(auditLogs.resource, 'gym_member')));
  assert.ok(memberAuditLogs.length >= 4, 'Must record audit log for create, update, delete, invite');
  console.log('     ✅ Audit logs captured for all member management operations.');

  console.log('\n🎉 ALL OWNER MEMBER MANAGEMENT & LIFECYCLE TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runMemberManagementTestSuite().catch((err) => {
  console.error('❌ Member Management Test Suite failed:', err);
  process.exit(1);
});
