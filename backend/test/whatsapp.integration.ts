/**
 * GymDeck WhatsApp - REAL OpenWA gateway integration check.
 *
 * Gated: it only sends when explicitly authorised. Run against the bundled
 * OpenWA service with a session already linked to a test phone.
 *
 *   RUN_WHATSAPP_INTEGRATION=1 \
 *   OPENWA_TEST_SESSION_ID=<ready session id> \
 *   WHATSAPP_TEST_RECIPIENT=9198XXXXXXXX \
 *   WHATSAPP_TEST_ALLOW_SEND=true \
 *   npx tsx test/whatsapp.integration.ts
 *
 * It checks:
 *   1. the gateway is reachable and healthy;
 *   2. a READY session exists (the linked test phone);
 *   3. an explicit opt-in text send is accepted with an OpenWA message id.
 *
 * Delivery/read confirmation requires the public GymDeck webhook. Inspect the
 * Communication Hub history after the send; this script does not fake ACKs.
 */

import { config } from '../shared/config';
import { openwaClient } from '../services/whatsapp/openwaClient';
import { normalizeWhatsAppNumber } from '../services/whatsapp/phone';

function fail(message: string, exitCode = 1): never {
  console.error(`❌ ${message}`);
  process.exit(exitCode);
}

async function main(): Promise<void> {
  if (process.env.RUN_WHATSAPP_INTEGRATION !== '1') {
    console.log(
      '⏭️  OpenWA integration SKIPPED (set RUN_WHATSAPP_INTEGRATION=1 to run against the gateway).'
    );
    process.exit(0);
  }

  if (!config.OPENWA_API_URL || !config.OPENWA_API_KEY) {
    fail('OPENWA_API_URL and OPENWA_API_KEY must be configured.', 2);
  }

  console.log(`🧪 REAL OpenWA gateway check (${config.OPENWA_API_URL})`);

  const health = await openwaClient.health();
  if (!health.ok) fail(`OpenWA is not healthy: ${health.detail}`, 2);
  console.log(`   health: ${health.detail}`);

  const sessions = await openwaClient.listSessions();
  const ready = sessions.filter((session) => String(session.status).toLowerCase() === 'ready');
  console.log(`   sessions: ${sessions.length} total, ${ready.length} ready`);

  const requestedSession = String(process.env.OPENWA_TEST_SESSION_ID || '').trim();
  const session = requestedSession
    ? ready.find((row) => row.id === requestedSession)
    : ready[0];

  if (!session) {
    fail(
      requestedSession
        ? `Session ${requestedSession} is not READY. Link the test phone first.`
        : 'No READY session. Link a test phone in GymDeck, then rerun.',
      2
    );
  }

  const recipient = normalizeWhatsAppNumber(process.env.WHATSAPP_TEST_RECIPIENT || '');
  if (!recipient) {
    console.log('✅ Gateway healthy and a READY session exists. No recipient supplied; nothing sent.');
    process.exit(0);
  }
  if (process.env.WHATSAPP_TEST_ALLOW_SEND !== 'true') {
    fail('Refusing to send: set WHATSAPP_TEST_ALLOW_SEND=true for the authorised recipient.', 2);
  }

  const body = String(
    process.env.WHATSAPP_TEST_BODY ||
      `GymDeck OpenWA integration check at ${new Date().toISOString()}`
  );
  console.log(`   recipient: +${recipient}`);
  console.log(`   session: ${session.id}`);

  const result = await openwaClient.sendText(
    session.id,
    recipient,
    body,
    `integration-${Date.now()}`
  );

  if (!result.ok || !result.accepted || !result.providerMessageId) {
    fail(
      `Send was not accepted: ${result.errorClass || 'unknown'} ${result.errorCode || ''} ${result.errorMessage || ''}`
    );
  }

  console.log(`✅ ACCEPTED by OpenWA: ${result.providerMessageId}`);
  console.log('   Accepted is not delivery. Confirm the receipt in GymDeck message history.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
