/**
 * GymDeck Cloud Backend - Phase 14 Owner Authentication & Security Matrix Test Suite
 */

import assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { db, closeDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import {
  gyms,
  userPasswordResetTokens,
} from '../shared/database/schema';
import { ownerAuthService } from '../services/auth/ownerAuthService';
import { signJwt, verifyJwt } from '../shared/security';
import { config } from '../shared/config';
import { eq } from 'drizzle-orm';

async function runPhase14AuthTestSuite() {
  console.log('🛡️ Starting Phase 14 Owner Authentication & Security Test Suite...\n');

  await bootstrapDatabaseSchema();

  const TEST_TAG = crypto.randomUUID().substring(0, 6);
  const SIGNUP_EMAIL = `new-owner-${TEST_TAG}@gymtest.com`;
  const PASSWORD = 'StrongPassword123!';
  const NEW_PASSWORD = 'BrandNewPassword456!';

  // ==============================================================================
  // 1. Valid Owner Signup & Automatic Tenant Creation
  // ==============================================================================
  console.log('  1. Testing Valid Owner Signup & Tenant Creation...');
  const signupResult = await ownerAuthService.signup({
    email: SIGNUP_EMAIL,
    password: PASSWORD,
    fullName: 'Test Owner One',
    phone: '+15550001111',
    gymName: `Test Gym ${TEST_TAG}`,
  });

  assert.ok(signupResult.user.id);
  assert.ok(signupResult.user.gymId);
  assert.equal(signupResult.user.email, SIGNUP_EMAIL.toLowerCase());
  assert.equal(signupResult.user.role, 'OWNER');
  assert.ok(signupResult.tokens.accessToken);
  assert.ok(signupResult.tokens.refreshToken);
  assert.equal(signupResult.tokens.expiresIn, 900);

  // Verify gym tenant exists in DB
  const [createdGym] = await db.select().from(gyms).where(eq(gyms.id, signupResult.user.gymId)).limit(1);
  assert.ok(createdGym);
  assert.equal(createdGym.ownerUserId, signupResult.user.id);
  console.log('     ✅ Valid owner signup created gym tenant, owner user, and session tokens.');

  // ==============================================================================
  // 2. Duplicate Email Signup Rejection
  // ==============================================================================
  console.log('  2. Testing Duplicate Email Signup Rejection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.signup({
        email: SIGNUP_EMAIL,
        password: PASSWORD,
        fullName: 'Impostor',
        gymName: 'Duplicate Gym',
      });
    },
    (err: any) => err.statusCode === 409
  );
  console.log('     ✅ Duplicate email registration rejected with 409 Conflict.');

  // ==============================================================================
  // 3. Valid Login
  // ==============================================================================
  console.log('  3. Testing Valid Owner Login...');
  const loginResult = await ownerAuthService.login({
    email: SIGNUP_EMAIL,
    password: PASSWORD,
    deviceFingerprint: 'device-test-1',
  });
  assert.equal(loginResult.user.id, signupResult.user.id);
  assert.equal(loginResult.user.gymId, signupResult.user.gymId);
  assert.ok(loginResult.tokens.accessToken);
  assert.ok(loginResult.tokens.refreshToken);
  console.log('     ✅ Valid login verified credentials and issued fresh token pair.');

  // ==============================================================================
  // 4. Invalid Password Rejection (No Account Enumeration)
  // ==============================================================================
  console.log('  4. Testing Invalid Password Rejection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.login({
        email: SIGNUP_EMAIL,
        password: 'IncorrectPassword999!',
      });
    },
    (err: any) => err.statusCode === 401 && err.message === 'Invalid email or password.'
  );
  console.log('     ✅ Invalid password rejected with generic 401.');

  // ==============================================================================
  // 5. Non-Existent Account Rejection (No Account Enumeration)
  // ==============================================================================
  console.log('  5. Testing Non-Existent Account Rejection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.login({
        email: `does-not-exist-${TEST_TAG}@gymtest.com`,
        password: PASSWORD,
      });
    },
    (err: any) => err.statusCode === 401 && err.message === 'Invalid email or password.'
  );
  console.log('     ✅ Non-existent email yields identical generic 401 error.');

  // ==============================================================================
  // 6. Forgot Password - Zero Account Enumeration
  // ==============================================================================
  console.log('  6. Testing Forgot Password Generic Response (Account Enumeration Defense)...');
  const forgotUnknown = await ownerAuthService.forgotPassword({
    email: `unknown-user-${TEST_TAG}@random.com`,
  });
  assert.equal(
    forgotUnknown.message,
    'If an account exists for this email, password reset instructions have been sent.'
  );
  assert.equal(forgotUnknown.debugToken, undefined, 'Debug token must not exist for non-existent user');

  const forgotExisting = await ownerAuthService.forgotPassword({
    email: SIGNUP_EMAIL,
  });
  assert.equal(
    forgotExisting.message,
    'If an account exists for this email, password reset instructions have been sent.'
  );
  assert.ok(forgotExisting.debugToken, 'Debug token returned in non-production for verification');
  console.log('     ✅ Forgot password returns identical response for existing and non-existing accounts.');

  // ==============================================================================
  // 7. Invalid Reset Token Rejection
  // ==============================================================================
  console.log('  7. Testing Invalid Reset Token Rejection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.resetPassword({
        email: SIGNUP_EMAIL,
        token: 'completely_bogus_token_12345',
        newPassword: NEW_PASSWORD,
      });
    },
    (err: any) => err.statusCode === 422 && err.message.includes('Invalid or expired')
  );
  console.log('     ✅ Invalid reset token rejected with 422 validation error.');

  // ==============================================================================
  // 8. Expired Reset Token Rejection
  // ==============================================================================
  console.log('  8. Testing Expired Reset Token Rejection...');
  const expiredRawToken = crypto.randomBytes(24).toString('hex');
  const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');

  await db.insert(userPasswordResetTokens).values({
    userId: signupResult.user.id,
    tokenHash: expiredHash,
    expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
  });

  await assert.rejects(
    async () => {
      await ownerAuthService.resetPassword({
        email: SIGNUP_EMAIL,
        token: expiredRawToken,
        newPassword: NEW_PASSWORD,
      });
    },
    (err: any) => err.statusCode === 422 && err.message.includes('Invalid or expired')
  );
  console.log('     ✅ Expired reset token rejected cryptographically.');

  // ==============================================================================
  // 9. Successful Password Reset & Session Invalidation
  // ==============================================================================
  console.log('  9. Testing Successful Password Reset & Session Invalidation...');
  const validResetToken = forgotExisting.debugToken!;
  const resetRes = await ownerAuthService.resetPassword({
    email: SIGNUP_EMAIL,
    token: validResetToken,
    newPassword: NEW_PASSWORD,
  });
  assert.ok(resetRes.message.includes('successfully'));

  // Verify old password no longer works
  await assert.rejects(
    async () => {
      await ownerAuthService.login({
        email: SIGNUP_EMAIL,
        password: PASSWORD, // Old password
      });
    },
    (err: any) => err.statusCode === 401
  );

  // Verify old refresh token is revoked
  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: loginResult.tokens.refreshToken,
      });
    },
    (err: any) => err.statusCode === 401
  );

  // Verify new password works
  const newLoginResult = await ownerAuthService.login({
    email: SIGNUP_EMAIL,
    password: NEW_PASSWORD,
  });
  assert.ok(newLoginResult.tokens.accessToken);
  console.log('     ✅ Password reset updated hash, invalidated old sessions, and restored login access.');

  // ==============================================================================
  // 10. Reused Reset Token Rejection (Single-Use Enforcement)
  // ==============================================================================
  console.log('  10. Testing Reused Reset Token Rejection (Single-Use)...');
  await assert.rejects(
    async () => {
      await ownerAuthService.resetPassword({
        email: SIGNUP_EMAIL,
        token: validResetToken, // Already consumed!
        newPassword: 'YetAnotherPassword789!',
      });
    },
    (err: any) => err.statusCode === 422 && err.message.includes('Invalid or expired')
  );
  console.log('     ✅ Reusing a consumed reset token rejected.');

  // ==============================================================================
  // 11. Refresh Token Rotation
  // ==============================================================================
  console.log('  11. Testing Refresh Token Rotation...');
  const rotated = await ownerAuthService.refreshToken({
    refreshToken: newLoginResult.tokens.refreshToken,
  });
  assert.ok(rotated.accessToken);
  assert.ok(rotated.refreshToken);
  assert.notEqual(rotated.refreshToken, newLoginResult.tokens.refreshToken);
  console.log('     ✅ Refresh token rotation issued new single-use token pair.');

  // ==============================================================================
  // 12. Refresh Token Replay / Reuse Attack Detection
  // ==============================================================================
  console.log('  12. Testing Refresh Token Replay Attack Detection...');
  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: newLoginResult.tokens.refreshToken, // Already consumed!
      });
    },
    (err: any) => err.statusCode === 401 && err.message.includes('revoked')
  );

  // Verify family invalidation: the rotated token should now also be dead
  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: rotated.refreshToken,
      });
    },
    (err: any) => err.statusCode === 401
  );
  console.log('     ✅ Replay attack triggered instant revocation of entire token family.');

  // ==============================================================================
  // 13. Explicit Session Logout
  // ==============================================================================
  console.log('  13. Testing Explicit Session Logout & Revocation...');
  const sessionToLogout = await ownerAuthService.login({
    email: SIGNUP_EMAIL,
    password: NEW_PASSWORD,
  });
  await ownerAuthService.logout({ refreshToken: sessionToLogout.tokens.refreshToken });

  await assert.rejects(
    async () => {
      await ownerAuthService.refreshToken({
        refreshToken: sessionToLogout.tokens.refreshToken,
      });
    },
    (err: any) => err.statusCode === 401
  );
  console.log('     ✅ Explicit logout invalidated active session.');

  // ==============================================================================
  // 14. Expired Access Token Cryptographic Rejection
  // ==============================================================================
  console.log('  14. Testing Expired Access Token Verification...');
  const expiredToken = signJwt(
    {
      sub: signupResult.user.id,
      userId: signupResult.user.id,
      gymId: signupResult.user.gymId,
      email: SIGNUP_EMAIL,
      role: 'OWNER',
      jti: crypto.randomUUID(),
    },
    config.JWT_SECRET,
    -10 // Expired 10 seconds ago
  );

  assert.throws(
    () => verifyJwt(expiredToken, config.JWT_SECRET),
    (err: any) => err.statusCode === 401 && err.message.includes('expired')
  );
  console.log('     ✅ Expired JWT rejected cryptographically by signature & timestamp verifier.');

  // ==============================================================================
  // 15. Forged Token Cryptographic Rejection
  // ==============================================================================
  console.log('  15. Testing Forged Token Rejection...');
  const forgedToken = signJwt(
    {
      sub: signupResult.user.id,
      userId: signupResult.user.id,
      gymId: signupResult.user.gymId,
      email: SIGNUP_EMAIL,
      role: 'OWNER',
      jti: crypto.randomUUID(),
    },
    'attacker_fake_jwt_secret_999999999999',
    900
  );

  assert.throws(
    () => verifyJwt(forgedToken, config.JWT_SECRET),
    (err: any) => err.statusCode === 401 && err.message.includes('Invalid token signature')
  );
  console.log('     ✅ HMAC signature verification rejected forged JWT.');

  // ==============================================================================
  // 16. Tenant Scoping from Server-Side Identity
  // ==============================================================================
  console.log('  16. Testing Tenant Context Authority...');
  const context = await ownerAuthService.getMe(signupResult.user.id, signupResult.user.gymId);
  assert.equal(context.id, signupResult.user.id);
  assert.equal(context.gymId, signupResult.user.gymId);
  assert.equal(context.role, 'OWNER');

  // Attempt cross-tenant getMe with wrong gymId
  await assert.rejects(
    async () => {
      await ownerAuthService.getMe(signupResult.user.id, crypto.randomUUID());
    },
    (err: any) => err.statusCode === 404
  );
  console.log('     ✅ Tenant identity enforced exclusively from server-side user record.');

  console.log('\n🎉 ALL 16 PHASE 14 SECURITY & AUTHENTICATION MATRIX TESTS PASSED!\n');
  await closeDatabasePool();
  process.exit(0);
}

runPhase14AuthTestSuite().catch((err) => {
  console.error('❌ Phase 14 Auth Test Suite Failed:', err);
  process.exit(1);
});
