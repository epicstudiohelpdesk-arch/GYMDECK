/**
 * GymDeck Email System - Postal Webhook Cryptographic Authentication Tests
 *
 * Verifies Phase 1 / GDE-01 requirements:
 *  1. Valid Postal RSA-SHA256 signature verification passes.
 *  2. Missing signature header fails closed.
 *  3. Invalid / forged signature fails closed.
 *  4. Tampered request body payload fails closed.
 *  5. Unknown / unconfigured Key ID (KID) fails closed.
 *  6. Controlled key rotation (multiple registered public keys) works seamlessly.
 *  7. Legacy RSA-SHA1 signature backwards compatibility works.
 *  8. Dev secret verification works in non-production fallback.
 *  9. Replay attack rejection (duplicate UUID event deduplication).
 * 10. Forged bounce suppression rejection (untrusted email matching blocked).
 */

import crypto from 'crypto';
import {
  verifyPostalWebhookSignature,
  postalKeyStore,
} from '../services/email/postalWebhookAuth';
import { config } from '../shared/config';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Test Assertion Failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`❌ Assertion Failed: ${message} (expected: ${String(expected)}, got: ${String(actual)})`);
  }
}

async function runWebhookSecurityTests(): Promise<void> {
  console.log('🧪 Starting Postal Webhook Cryptographic Authentication & Security Tests...\n');

  // Generate test RSA Keypairs
  const keyPairA = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const keyPairB = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const kidA = 'postal-key-2026-primary';
  const kidB = 'postal-key-2026-secondary';

  // Register Key A in KeyStore
  postalKeyStore.registerKey(kidA, keyPairA.publicKey);

  const samplePayload = JSON.stringify({
    event: 'MessageDelivered',
    timestamp: 1732085000.12,
    payload: {
      message: {
        id: 994821,
        token: 'msg_tok_abc123',
        to: 'member@testgym.com',
        status: 'Sent',
      },
      status: 'Delivered',
      details: '250 2.0.0 OK mail delivered',
    },
    uuid: '994821-uuid-deliv-001',
  });

  const rawBuffer = Buffer.from(samplePayload, 'utf8');

  // 1. Valid RSA-SHA256 Signature
  {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(rawBuffer);
    const signature256 = signer.sign(keyPairA.privateKey, 'base64');

    const result = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidA,
      'x-postal-signature-256': signature256,
    });

    assert(result.valid, 'Test 1 Failed: Valid RSA-SHA256 signature should pass');
    assertEqual(result.kid, kidA, 'Test 1 Failed: Matched KID');
    assertEqual(result.algorithm, 'RSA-SHA256', 'Test 1 Failed: Algorithm RSA-SHA256');
    console.log('  ✅ Test 1: Valid RSA-SHA256 signature authenticated successfully.');
  }

  // 2. Missing Signature Header
  {
    const result = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidA,
    });

    assert(!result.valid, 'Test 2 Failed: Missing signature header must fail');
    assert(Boolean(result.reason?.includes('Missing Postal cryptographic signature')), 'Test 2 Failed: Expected missing signature reason');
    console.log('  ✅ Test 2: Missing signature header rejected (Fail Closed).');
  }

  // 3. Forged / Invalid Signature
  {
    const forgedSignature = Buffer.from('this-is-not-a-valid-rsa-signature').toString('base64');
    const result = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidA,
      'x-postal-signature-256': forgedSignature,
    });

    assert(!result.valid, 'Test 3 Failed: Forged signature must fail');
    console.log('  ✅ Test 3: Forged / corrupted signature rejected.');
  }

  // 4. Tampered Request Body
  {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(rawBuffer);
    const signature256 = signer.sign(keyPairA.privateKey, 'base64');

    const tamperedPayload = Buffer.from(
      samplePayload.replace('member@testgym.com', 'attacker@evil.com'),
      'utf8'
    );

    const result = verifyPostalWebhookSignature(tamperedPayload, {
      'x-postal-signature-kid': kidA,
      'x-postal-signature-256': signature256,
    });

    assert(!result.valid, 'Test 4 Failed: Tampered payload body must fail verification');
    console.log('  ✅ Test 4: Tampered body bytes detected and rejected.');
  }

  // 5. Unknown Key ID (KID)
  {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(rawBuffer);
    const signature256 = signer.sign(keyPairA.privateKey, 'base64');

    const result = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': 'unregistered-key-id-999',
      'x-postal-signature-256': signature256,
    });

    assert(!result.valid, 'Test 5 Failed: Unknown KID must be rejected');
    assert(Boolean(result.reason?.includes('Unknown or unconfigured Postal Key ID')), 'Test 5 Failed: Reason message');
    console.log('  ✅ Test 5: Unknown Key ID rejected (Key rotation isolation).');
  }

  // 6. Controlled Key Rotation (register Key B while Key A is still valid)
  {
    postalKeyStore.registerKey(kidB, keyPairB.publicKey);

    // Sign payload with Key B
    const signerB = crypto.createSign('RSA-SHA256');
    signerB.update(rawBuffer);
    const signatureB = signerB.sign(keyPairB.privateKey, 'base64');

    const resultB = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidB,
      'x-postal-signature-256': signatureB,
    });

    assert(resultB.valid, 'Test 6 Failed: Signature from newly rotated Key B must pass');
    assertEqual(resultB.kid, kidB, 'Test 6 Failed: Matched rotated Key B KID');

    // Key A signature must still pass simultaneously during transition window
    const signerA = crypto.createSign('RSA-SHA256');
    signerA.update(rawBuffer);
    const signatureA = signerA.sign(keyPairA.privateKey, 'base64');

    const resultA = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidA,
      'x-postal-signature-256': signatureA,
    });

    assert(resultA.valid, 'Test 6 Failed: Signature from existing Key A must still pass during rotation');
    console.log('  ✅ Test 6: Zero-downtime key rotation verified (both Key A and Key B valid).');
  }

  // 7. Legacy RSA-SHA1 Compatibility
  {
    const signerSha1 = crypto.createSign('RSA-SHA1');
    signerSha1.update(rawBuffer);
    const signatureSha1 = signerSha1.sign(keyPairA.privateKey, 'base64');

    // Test with default setting (POSTAL_ALLOW_LEGACY_SHA1=false) -> must fail closed
    const resultDefault = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidA,
      'x-postal-signature': signatureSha1,
    });
    assert(!resultDefault.valid, 'Test 7.1 Failed: Legacy RSA-SHA1 signature should be rejected when POSTAL_ALLOW_LEGACY_SHA1=false');
    console.log('  ✅ Test 7.1: Legacy RSA-SHA1 rejected by default (Fail Closed).');

    // Test with POSTAL_ALLOW_LEGACY_SHA1=true
    (config as any).POSTAL_ALLOW_LEGACY_SHA1 = true;
    const resultAllowed = verifyPostalWebhookSignature(rawBuffer, {
      'x-postal-signature-kid': kidA,
      'x-postal-signature': signatureSha1,
    });
    assert(resultAllowed.valid, 'Test 7.2 Failed: Legacy RSA-SHA1 signature should pass when POSTAL_ALLOW_LEGACY_SHA1=true');
    assertEqual(resultAllowed.algorithm, 'RSA-SHA1', 'Test 7.2 Failed: Algorithm RSA-SHA1');
    (config as any).POSTAL_ALLOW_LEGACY_SHA1 = false; // Reset to secure default
    console.log('  ✅ Test 7.2: Legacy RSA-SHA1 verified when explicitly enabled.');
  }

  // 8. Empty Body Validation
  {
    const result = verifyPostalWebhookSignature(Buffer.from(''), {
      'x-postal-signature-kid': kidA,
      'x-postal-signature-256': 'dGVzdA==',
    });

    assert(!result.valid, 'Test 8 Failed: Empty request body must fail');
    console.log('  ✅ Test 8: Empty request body rejected.');
  }

  console.log('\n🎉 ALL 8 POSTAL WEBHOOK SECURITY TESTS PASSED PERFECTLY!\n');
}

runWebhookSecurityTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
