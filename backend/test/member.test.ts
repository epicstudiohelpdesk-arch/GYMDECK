/**
 * GymDeck Cloud Backend - Member Domain Services Test Suite
 */

import { checkInPassService } from '../services/member/checkInPassService';

async function runMemberDomainTests() {
  console.log('🧪 Running Member Domain Services & Check-In Pass Verification Test Suite...');

  const testGymId = 'gym_3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const testMemberId = 'mem_28416d8e-715a-4e89-980b-93f538e1b017';
  const testMemberCode = 'GD-1001';

  // 1. Check-In Pass Generation
  console.log('  1. Testing Dynamic Check-In Pass Generation...');
  const pass = checkInPassService.generateCheckInPass(testGymId, testMemberId, testMemberCode);

  if (!pass.passToken || pass.expiresInSeconds !== 60 || !pass.expiresAt) {
    throw new Error('❌ Check-in pass missing token or 60s TTL');
  }
  console.log('     ✅ Check-in pass generated with 60-second expiration window.');

  // 2. Check-In Pass Verification
  console.log('  2. Testing Check-In Pass Cryptographic Verification...');
  const verified = checkInPassService.verifyCheckInPass(pass.passToken, testGymId, testMemberId);

  if (verified.gymId !== testGymId || verified.memberId !== testMemberId) {
    throw new Error('❌ Verified pass claims do not match original tenant/member');
  }
  console.log('     ✅ Check-in pass verified successfully.');

  // 3. Cross-Tenant Rejection
  console.log('  3. Testing Cross-Tenant Pass Rejection...');
  const wrongGymId = 'gym_attacker_another_gym';
  try {
    checkInPassService.verifyCheckInPass(pass.passToken, wrongGymId, testMemberId);
    throw new Error('❌ Pass was unexpectedly accepted for a different gym tenant');
  } catch (err: any) {
    if (!err.message.includes('not authorized for this gym')) {
      throw new Error(`❌ Unexpected error message for cross-tenant pass: ${err.message}`);
    }
  }
  console.log('     ✅ Cross-tenant pass manipulation correctly blocked.');

  // 4. One-Time Consumption / Replay Protection
  console.log('  4. Testing One-Time Consumption Replay Protection...');
  // The first verification consumed the nonce, a second attempt with same token must fail
  try {
    checkInPassService.verifyCheckInPass(pass.passToken, testGymId, testMemberId);
    throw new Error('❌ Replayed pass was unexpectedly accepted a second time');
  } catch (err: any) {
    if (!err.message.includes('already been used')) {
      throw new Error(`❌ Unexpected error on replayed pass: ${err.message}`);
    }
  }
  console.log('     ✅ One-time pass replay protection verified.');

  console.log('\n🎉 ALL MEMBER DOMAIN SERVICE TESTS PASSED SUCCESSFULLY!');
}

runMemberDomainTests().catch((err) => {
  console.error('❌ Member Domain Test Failed:', err);
  process.exit(1);
});
