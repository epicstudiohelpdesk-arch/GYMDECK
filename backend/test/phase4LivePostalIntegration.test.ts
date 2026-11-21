/**
 * GymDeck Email Line - Phase 4 Live Postal API Integration Test Suite
 *
 * Validates:
 *  1. Postal Client against real local Postal v3.4.0 REST API
 *  2. Authentication with real Postal X-Server-API-Key
 *  3. Live message dispatch returning integer ID and token
 *  4. Live message status query via /api/v1/messages/message
 *  5. Webhook signature matching real Postal signing key (KID & RSA-SHA256)
 */

import { PostalClient } from '../services/email/postalClient';
import { verifyPostalWebhookSignature, postalKeyStore } from '../services/email/postalWebhookAuth';
import crypto from 'crypto';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${msg}`);
    throw new Error(msg);
  }
  passed++;
  console.log(`  ✅ PASSED: ${msg}`);
}

async function runLivePostalTests() {
  console.log('\n===============================================================');
  console.log('🧪 GYMDECK EMAIL LINE: PHASE 4 LIVE POSTAL v3.4.0 INTEGRATION');
  console.log('===============================================================\n');

  // Use configured environment (or fallback if already populated in config)
  process.env.POSTAL_API_URL = process.env.POSTAL_API_URL || 'http://localhost:5000/api/v1';
  process.env.POSTAL_DELIVERY_MODE = 'live';

  const { config } = await import('../shared/config/index.js');
  (config as any).POSTAL_API_URL = process.env.POSTAL_API_URL || 'http://localhost:5000/api/v1';
  (config as any).POSTAL_DELIVERY_MODE = 'live';

  const client = new PostalClient();

  // Test 1: Real Send Message API
  console.log('--- [1] Live Postal Message Dispatch via REST API ---');
  const recipientEmail = `staging_test_${Date.now()}@example.com`;
  const sendRes = await client.sendMessage({
    to: [recipientEmail],
    from: 'GymDeck <notifications@mail.epic-studio.in>',
    subject: 'GymDeck Live Staging Test Message',
    plainBody: 'Automated integration test message dispatched to live local Postal.',
    htmlBody: '<p>Automated integration test message dispatched to live local Postal.</p>',
    tag: 'gymdeck_integration_suite',
    customHeaders: {
      'X-GymDeck-Tenant': '15a8189e-0b2d-4f21-a5af-07929a6fb916',
      'X-GymDeck-Source': 'Phase4LiveTest',
    },
  });

  assert(sendRes.status === 'success', `1.1: Live Postal API returned success status (${sendRes.status})`);
  assert(Boolean(sendRes.data?.message_id), `1.2: Postal generated provider message_id: ${sendRes.data?.message_id}`);
  
  const recipientResult = sendRes.data?.messages?.[recipientEmail];
  assert(Boolean(recipientResult), '1.3: Recipient entry present in Postal response');
  assert(typeof recipientResult?.id === 'number', `1.4: Recipient has integer Postal ID: ${recipientResult?.id}`);
  assert(Boolean(recipientResult?.token), `1.5: Recipient has Postal token: ${recipientResult?.token}`);

  const liveMessageId = recipientResult!.id;

  // Test 2: Real Get Message Details API
  console.log('\n--- [2] Live Postal Message Query via REST API ---');
  const msgDetails = await client.getMessage(liveMessageId);

  assert(msgDetails !== null, `2.1: Message ${liveMessageId} retrieved from live Postal database`);
  assert(msgDetails?.id === liveMessageId, `2.2: Retrieved message ID matches requested ID (${msgDetails?.id})`);
  assert(Boolean(msgDetails?.status?.status), `2.3: Message delivery status present: ${msgDetails?.status?.status}`);
  assert(Boolean(msgDetails?.details?.rcpt_to), `2.4: Message recipient details present: ${msgDetails?.details?.rcpt_to}`);

  // Test 3: Webhook Cryptographic Verification with Real Postal Signing Public Key
  console.log('\n--- [3] Postal RSA-SHA256 Webhook Key Validation ---');
  const postalSigningKid = '64343cdb59cba2c3ee2dabfbc59dcbdffd2d2c8a97cafa3652ba07c052e77b99';
  const postalPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5gSRA/lHSsu4U+Uiz5ps
GST0CGeR2HyY5HJbjsFc9jWwhGmpvi/Ecm52nAK2UxP+PcFYBKQzJpKURcDmFt8X
faqhl3frAorHwTG/zpy2AzyeiOiPRrmP3WDdsJLAFhFZTlLYe6YBEe62VSgvn7JW
Jz/SW9hMIovXfBD/ukh8Vs8MelFc8bpZglymuOtXk6L+GVa+0V7kK6TwLHPS9Lsp
/way++LI5TXS5kszQX6OR6I+2xPPU7oeB9R8ruHIBpzW0ESC8+pFuUWn+EQBpYjB
cTzrDzVHbyYL0yO6JCrUxiCzMOpSdzZwTJeplQvUavf3IJyIvPIiV21mV3xu2JLo
GwIDAQAB
-----END PUBLIC KEY-----`;

  postalKeyStore.registerKey(postalSigningKid, postalPublicKeyPem);

  // Read signing key from container volume to simulate a real Postal signed webhook
  const fs = await import('fs');
  const path = await import('path');
  const keyPath = path.resolve(__dirname, '../../infrastructure/email-staging/config/signing.key');
  const privateKeyPem = fs.readFileSync(keyPath, 'utf8');

  const webhookBody = JSON.stringify({
    event: 'MessageSent',
    timestamp: Math.floor(Date.now() / 1000),
    uuid: crypto.randomUUID(),
    payload: {
      message: {
        id: liveMessageId,
        token: recipientResult!.token,
        to: recipientEmail,
        status: 'Sent',
      },
      status: 'Sent',
      details: '250 2.0.0 OK: message accepted by destination mail server',
    },
  });

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(Buffer.from(webhookBody, 'utf8'));
  const realSignature = signer.sign(privateKeyPem, 'base64');

  const authResult = verifyPostalWebhookSignature(Buffer.from(webhookBody, 'utf8'), {
    'x-postal-signature-kid': postalSigningKid,
    'x-postal-signature-256': realSignature,
  });

  assert(authResult.valid, '3.1: Genuine Postal RSA-SHA256 signature verified against registered Postal public key');
  assert(authResult.algorithm === 'RSA-SHA256', `3.2: Verification confirmed algorithm RSA-SHA256 (${authResult.algorithm})`);
  assert(authResult.kid === postalSigningKid, `3.3: Verification matched KID ${authResult.kid}`);

  console.log('\n===============================================================');
  console.log(`🎉 LIVE POSTAL INTEGRATION COMPLETE: ${passed}/${total} ASSERTIONS PASSED`);
  console.log('===============================================================\n');
}

runLivePostalTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Failed:', err);
    process.exit(1);
  });
