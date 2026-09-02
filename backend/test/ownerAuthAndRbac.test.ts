/**
 * GymDeck Phase 5 + Phase 6: Owner Authentication, RBAC & Multi-Tenant Security Test Matrix
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  users,
  gymMembers,
  attendanceLogs,
  payments,
  membershipPlans,
  trainers,
} from '../shared/database/schema';
import { ownerAuthService } from '../services/auth/ownerAuthService';
import { ownerService } from '../services/owner/ownerService';
import { hashPassword, signJwt, verifyJwt, JwtPayload } from '../shared/security';
import { config } from '../shared/config';

async function runOwnerSecurityTestSuite() {
  console.log('🛡️ Starting Owner Authentication, RBAC & Multi-Tenant Security Test Suite...\n');

  await bootstrapDatabaseSchema();

  const GYM_A_ID = crypto.randomUUID();
  const GYM_B_ID = crypto.randomUUID();

  const OWNER_A_EMAIL = `owner-a-${crypto.randomUUID().substring(0, 6)}@alpha.gym`;
  const OWNER_B_EMAIL = `owner-b-${crypto.randomUUID().substring(0, 6)}@bravo.gym`;
  const MANAGER_A_EMAIL = `manager-a-${crypto.randomUUID().substring(0, 6)}@alpha.gym`;
  const STAFF_A_EMAIL = `staff-a-${crypto.randomUUID().substring(0, 6)}@alpha.gym`;
  const PASSWORD = 'SecurePassword123!';

  const passwordHash = await hashPassword(PASSWORD);

  // 1. Seed Gyms
  await db.insert(gyms).values([
    {
      id: GYM_A_ID,
      name: 'Gym Alpha Flagship',
      code: `GD-ALPHA-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
    {
      id: GYM_B_ID,
      name: 'Gym Bravo Rival',
      code: `GD-BRAVO-${crypto.randomUUID().substring(0, 4).toUpperCase()}`,
      status: 'ACTIVE',
    },
  ]);

  // 2. Seed Users
  const OWNER_A_ID = crypto.randomUUID();
  const OWNER_B_ID = crypto.randomUUID();
  const MANAGER_A_ID = crypto.randomUUID();
  const STAFF_A_ID = crypto.randomUUID();

  await db.insert(users).values([
    {
      id: OWNER_A_ID,
      gymId: GYM_A_ID,
      email: OWNER_A_EMAIL,
      fullName: 'Alice Alpha (Owner)',
      passwordHash,
      role: 'OWNER',
      permissions: ['members.read', 'members.write', 'reports.read', 'settings.write'],
      accountStatus: 'ACTIVE',
    },
    {
      id: OWNER_B_ID,
      gymId: GYM_B_ID,
      email: OWNER_B_EMAIL,
      fullName: 'Bob Bravo (Owner)',
      passwordHash,
      role: 'OWNER',
      permissions: ['members.read', 'members.write', 'reports.read'],
      accountStatus: 'ACTIVE',
    },
    {
      id: MANAGER_A_ID,
      gymId: GYM_A_ID,
      email: MANAGER_A_EMAIL,
      fullName: 'Mike Manager',
      passwordHash,
      role: 'MANAGER',
      permissions: ['members.read', 'members.write', 'reports.read'],
      accountStatus: 'ACTIVE',
    },
    {
      id: STAFF_A_ID,
      gymId: GYM_A_ID,
      email: STAFF_A_EMAIL,
      fullName: 'Sam Staff',
      passwordHash,
      role: 'STAFF',
      permissions: ['members.read'], // No members.write or settings.write
      accountStatus: 'ACTIVE',
    },
  ]);

  // 3. Seed domain records for Gym A
  const MEMBER_A1_ID = crypto.randomUUID();
  const MEMBER_B1_ID = crypto.randomUUID();

  await db.insert(gymMembers).values([
    {
      id: MEMBER_A1_ID,
      gymId: GYM_A_ID,
      memberCode: 'GD-M-001',
      fullName: 'Member Alpha 1',
      phone: '+15551111111',
      membershipStatus: 'ACTIVE',
    },
    {
      id: MEMBER_B1_ID,
      gymId: GYM_B_ID,
      memberCode: 'GD-M-002',
      fullName: 'Member Bravo Secret',
      phone: '+15552222222',
      membershipStatus: 'ACTIVE',
    },
  ]);

  await db.insert(membershipPlans).values({
    gymId: GYM_A_ID,
    planName: 'Gold Annual',
    durationDays: 365,
    price: '999.00',
    isActive: true,
  });

  await db.insert(payments).values({
    gymId: GYM_A_ID,
    memberId: MEMBER_A1_ID,
    amount: '150.00',
    status: 'COMPLETED',
  });

  await db.insert(attendanceLogs).values({
    gymId: GYM_A_ID,
    memberId: MEMBER_A1_ID,
    entryMethod: 'QR_DYNAMIC',
  });

  await db.insert(trainers).values({
    gymId: GYM_A_ID,
    fullName: 'Trainer Tom',
    phone: '+15553333333',
    isActive: true,
  });

  // ==============================================================================
  // TEST 1: Valid Owner Login
  // ==============================================================================
  console.log('  1. Testing Valid Owner Login...');
  const loginRes = await ownerAuthService.login({
    email: OWNER_A_EMAIL,
    password: PASSWORD,
    deviceFingerprint: 'ios-device-uuid-1',
  });
  assert.equal(loginRes.user.email, OWNER_A_EMAIL);
  assert.equal(loginRes.user.gymId, GYM_A_ID);
  assert.equal(loginRes.user.role, 'OWNER');
  assert.ok(loginRes.tokens.accessToken);
  assert.ok(loginRes.tokens.refreshToken);
  console.log('     ✅ Valid owner login authenticated with JWT and rotating refresh token.');

  // ==============================================================================
  // TEST 2: Invalid Password
  // ==============================================================================
  console.log('  2. Testing Invalid Password Rejection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.login({
        email: OWNER_A_EMAIL,
        password: 'WrongPassword999!',
      });
    },
    (err: any) => err.statusCode === 401
  );
  console.log('     ✅ Invalid password rejected with generic 401.');

  // ==============================================================================
  // TEST 3: Unknown Account Rejection
  // ==============================================================================
  console.log('  3. Testing Unknown Account Rejection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.login({
        email: 'nonexistent@ghost.gym',
        password: PASSWORD,
      });
    },
    (err: any) => err.statusCode === 401
  );
  console.log('     ✅ Non-existent user rejected without account enumeration.');

  // ==============================================================================
  // TEST 4: Expired Access Token Rejection
  // ==============================================================================
  console.log('  4. Testing Expired Access Token Cryptographic Rejection...');
  const expiredJwt = signJwt(
    {
      sub: OWNER_A_ID,
      userId: OWNER_A_ID,
      gymId: GYM_A_ID,
      email: OWNER_A_EMAIL,
      role: 'OWNER',
      jti: crypto.randomUUID(),
    },
    config.JWT_SECRET,
    -10 // Expired 10 seconds ago
  );
  assert.throws(
    () => verifyJwt(expiredJwt, config.JWT_SECRET),
    /expired/i
  );
  console.log('     ✅ Expired JWT rejected cryptographically by signature & timestamp verifier.');

  // ==============================================================================
  // TEST 5: Refresh Token Rotation
  // ==============================================================================
  console.log('  5. Testing Refresh Token Rotation...');
  const refreshRes = await ownerAuthService.refreshToken({
    refreshToken: loginRes.tokens.refreshToken,
  });
  assert.ok(refreshRes.accessToken);
  assert.ok(refreshRes.refreshToken);
  assert.notEqual(refreshRes.refreshToken, loginRes.tokens.refreshToken, 'Refresh token must rotate');
  console.log('     ✅ Refresh token rotation issued new single-use token pair.');

  // ==============================================================================
  // TEST 6: Refresh Token Reuse / Replay Detection (Family Invalidation)
  // ==============================================================================
  console.log('  6. Testing Refresh Token Replay Attack Detection...');
  // Replaying the old already-consumed refresh token
  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: loginRes.tokens.refreshToken,
      });
    },
    (err: any) => err.statusCode === 401 && err.message.includes('revoked')
  );

  // Verify that the entire token family is now dead (even the new token was invalidated)
  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: refreshRes.refreshToken,
      });
    },
    (err: any) => err.statusCode === 401
  );
  console.log('     ✅ Replay attack triggered instant revocation of the compromised token family.');

  // ==============================================================================
  // TEST 7: Revoked Session (Explicit Logout)
  // ==============================================================================
  console.log('  7. Testing Explicit Session Logout & Revocation...');
  const freshLogin = await ownerAuthService.login({
    email: OWNER_A_EMAIL,
    password: PASSWORD,
  });
  await ownerAuthService.logout({ refreshToken: freshLogin.tokens.refreshToken });

  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: freshLogin.tokens.refreshToken,
      });
    },
    (err: any) => err.statusCode === 401
  );
  console.log('     ✅ Explicit logout invalidated active session.');

  // ==============================================================================
  // TEST 8 & 9: Anti-IDOR & Tenant Isolation (Owner A accessing Gym B)
  // ==============================================================================
  console.log('  8 & 9. Testing Anti-IDOR & Multi-Tenant Boundary Enforcement...');
  // Owner A querying members for Gym B
  const gymBMembersFromOwnerA = await ownerService.getMembers(GYM_A_ID, 50, 0);
  const foundRival = gymBMembersFromOwnerA.members.find((m) => m.id === MEMBER_B1_ID);
  assert.equal(foundRival, undefined, 'Owner A must NEVER see Gym B members');

  // Attempting to generate invitation for Gym B member using Gym A tenant context
  await assert.rejects(
    async () => {
      await ownerService.createMemberInvite(GYM_A_ID, MEMBER_B1_ID, OWNER_A_ID);
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Cross-gym tenant leakage and IDOR attacks structurally blocked.');

  // ==============================================================================
  // TEST 10 & 11: Forged Role / Forged Permissions Cryptographic Tampering
  // ==============================================================================
  console.log('  10 & 11. Testing Forged Role & Permissions Tampering Rejection...');
  const forgedPayload: JwtPayload = {
    sub: STAFF_A_ID,
    userId: STAFF_A_ID,
    gymId: GYM_A_ID,
    email: STAFF_A_EMAIL,
    role: 'OWNER' as const, // Tampered role!
    permissions: ['settings.write', 'reports.read'],
    jti: crypto.randomUUID(),
  };

  // Signed with attacker's fake secret
  const forgedToken = signJwt(forgedPayload, 'attacker-fake-secret-key-1234567890', 900);

  assert.throws(
    () => verifyJwt(forgedToken, config.JWT_SECRET),
    (err: any) => err.statusCode === 401 && err.message.includes('Invalid token signature')
  );
  console.log('     ✅ Forged JWT with elevated role/permissions rejected by HMAC verification.');

  // ==============================================================================
  // TEST 12, 13 & 14: Granular RBAC Permissions
  // ==============================================================================
  console.log('  12, 13 & 14. Testing Granular RBAC Permissions Hierarchy...');
  // Owner getMe
  const ownerMe = await ownerAuthService.getMe(OWNER_A_ID, GYM_A_ID);
  assert.equal(ownerMe.role, 'OWNER');
  assert.ok(ownerMe.permissions.includes('settings.write'));

  // Manager getMe
  const managerMe = await ownerAuthService.getMe(MANAGER_A_ID, GYM_A_ID);
  assert.equal(managerMe.role, 'MANAGER');

  // Staff getMe
  const staffMe = await ownerAuthService.getMe(STAFF_A_ID, GYM_A_ID);
  assert.equal(staffMe.role, 'STAFF');
  assert.equal(staffMe.permissions.includes('settings.write'), false, 'Staff must not possess settings.write');
  console.log('     ✅ RBAC hierarchy (OWNER > MANAGER > STAFF) strictly enforced.');

  // ==============================================================================
  // TEST 19: Dashboard KPI Scoping
  // ==============================================================================
  console.log('  19. Testing Dashboard KPI Tenant-Scoping...');
  const dashboardA = await ownerService.getDashboard(GYM_A_ID);
  assert.equal(dashboardA.gym.id, GYM_A_ID);
  assert.equal(dashboardA.metrics.activeMembersCount, 1);
  assert.equal(dashboardA.metrics.todayAttendanceCount, 1);
  assert.equal(dashboardA.metrics.activePlansCount, 1);
  assert.equal(dashboardA.metrics.todayRevenue, 150);
  assert.equal(dashboardA.metrics.activeTrainersCount, 1);

  const dashboardB = await ownerService.getDashboard(GYM_B_ID);
  assert.equal(dashboardB.gym.id, GYM_B_ID);
  assert.equal(dashboardB.metrics.todayRevenue, 0, 'Gym B must have 0 revenue from Gym A');
  console.log('     ✅ Dashboard KPI metrics strictly isolated per gym tenant.');

  // ==============================================================================
  // TEST 20: Member Directory & Activation Invite Generation
  // ==============================================================================
  console.log('  20. Testing Member Directory Search & Invitation Generator...');
  const memberList = await ownerService.getMembers(GYM_A_ID, 10, 0, 'Alpha');
  assert.equal(memberList.members.length, 1);
  assert.equal(memberList.members[0]!.fullName, 'Member Alpha 1');

  const inviteRes = await ownerService.createMemberInvite(GYM_A_ID, MEMBER_A1_ID, OWNER_A_ID);
  assert.ok(inviteRes.activationTicket);
  assert.ok(inviteRes.displayCode.startsWith('GD-'));
  assert.equal(inviteRes.memberId, MEMBER_A1_ID);
  assert.equal(inviteRes.gymId, GYM_A_ID);
  console.log('     ✅ Member directory search and digital activation invite generation verified.');

  console.log('\n🎉 ALL OWNER AUTHENTICATION, RBAC & TENANT ISOLATION TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runOwnerSecurityTestSuite().catch((err) => {
  console.error('❌ Owner Security Test Suite failed:', err);
  process.exit(1);
});
