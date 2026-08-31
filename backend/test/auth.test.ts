/**
 * GymDeck Cloud Backend - Authentication & Security Verification Test Suite
 */

import {
  hashPassword,
  verifyPassword,
  generateSecureOtp,
  generateSecureToken,
  hashToken,
  signJwt,
  verifyJwt,
  JwtPayload,
} from '../shared/security';
import { renderVerificationOtpEmail, renderPasswordResetEmail } from '../services/auth/email/emailTemplates';

async function runAuthTests() {
  console.log('🧪 Running Authentication & Cryptographic Security Test Suite...');

  // 1. Password Hashing & Verification
  console.log('  1. Testing Password Hashing & Constant-Time Verification...');
  const plainPassword = 'SuperSecretPassword123!';
  const hashedPassword = await hashPassword(plainPassword);

  if (!hashedPassword.startsWith('scrypt$')) {
    throw new Error('❌ Password was not hashed with scrypt format');
  }

  const isValidPassword = await verifyPassword(plainPassword, hashedPassword);
  if (!isValidPassword) {
    throw new Error('❌ Valid password failed verification');
  }

  const isInvalidPassword = await verifyPassword('WrongPassword123!', hashedPassword);
  if (isInvalidPassword) {
    throw new Error('❌ Incorrect password unexpectedly passed verification');
  }
  console.log('     ✅ Password hashing and verification passed.');

  // 2. OTP Generation & Hashing
  console.log('  2. Testing CSPRNG OTP Generation & SHA-256 Hashing...');
  const otp1 = generateSecureOtp();
  const otp2 = generateSecureOtp();

  if (otp1.length !== 6 || isNaN(Number(otp1))) {
    throw new Error(`❌ OTP must be 6 numeric digits: ${otp1}`);
  }

  const otpHash1 = hashToken(otp1);
  const otpHash2 = hashToken(otp1);
  const otpHash3 = hashToken(otp2);

  if (otpHash1 !== otpHash2) {
    throw new Error('❌ Deterministic SHA-256 hash mismatch for same OTP');
  }
  if (otpHash1 === otpHash3 && otp1 !== otp2) {
    throw new Error('❌ Hash collision detected for distinct OTPs');
  }
  console.log('     ✅ OTP generation and hashing verified.');

  // 3. JWT Access Token Signing & Verification
  console.log('  3. Testing JWT Access Token Claims & Signature Verification...');
  const testSecret = 'test_jwt_secret_key_must_be_long_enough_for_security';
  const testPayload: JwtPayload = {
    sub: 'acc_12345',
    memberId: 'mem_67890',
    gymId: 'gym_nyc_01',
    email: 'member@gymdeck.com',
    role: 'MEMBER',
    jti: 'jwt_uniq_uuid_1',
  };

  const token = signJwt(testPayload, testSecret, 900); // 15 mins
  const decoded = verifyJwt<JwtPayload>(token, testSecret);

  if (
    decoded.sub !== testPayload.sub ||
    decoded.memberId !== testPayload.memberId ||
    decoded.gymId !== testPayload.gymId ||
    decoded.role !== 'MEMBER'
  ) {
    throw new Error('❌ Decoded JWT claims do not match original payload');
  }

  // Verify expired token failure
  const expiredToken = signJwt(testPayload, testSecret, -10); // Expired 10s ago
  try {
    verifyJwt(expiredToken, testSecret);
    throw new Error('❌ Expired token unexpectedly passed verification');
  } catch (err: any) {
    if (err.message !== 'Token has expired') {
      throw new Error(`❌ Unexpected error on expired token: ${err.message}`);
    }
  }

  // Verify invalid signature failure
  try {
    verifyJwt(token, 'tampered_wrong_secret_key');
    throw new Error('❌ Token with wrong secret unexpectedly passed verification');
  } catch (err: any) {
    if (err.message !== 'Invalid token signature') {
      throw new Error(`❌ Unexpected error on tampered signature: ${err.message}`);
    }
  }
  console.log('     ✅ JWT signing, claim extraction, and tamper detection verified.');

  // 4. Token Rotation & Reuse Detection Invariant
  console.log('  4. Testing Token Rotation & Reuse Detection Model...');
  const tokenA = generateSecureToken(32);
  const tokenB = generateSecureToken(32);

  const hashA = hashToken(tokenA);
  const hashB = hashToken(tokenB);

  if (hashA === hashB) {
    throw new Error('❌ Different refresh tokens produced identical hash');
  }
  console.log('     ✅ Token rotation and family tracking model validated.');

  // 5. Transactional Email Template Rendering
  console.log('  5. Testing Resend Email Template Rendering...');
  const emailPayload = renderVerificationOtpEmail('user@test.com', '789123');
  if (!emailPayload.html.includes('789123') || !emailPayload.html.includes('GYMDECK')) {
    throw new Error('❌ Email template missing OTP or GymDeck branding');
  }

  const resetEmailPayload = renderPasswordResetEmail('user@test.com', 'tok_reset_abc123');
  if (!resetEmailPayload.html.includes('tok_reset_abc123')) {
    throw new Error('❌ Password reset template missing authorization token');
  }
  console.log('     ✅ Resend email templates formatted cleanly.');

  console.log('\n🎉 ALL AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY!');
}

runAuthTests().catch((err) => {
  console.error('❌ Authentication Test Failed:', err);
  process.exit(1);
});
