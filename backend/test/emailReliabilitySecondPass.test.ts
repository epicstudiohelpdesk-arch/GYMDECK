import assert from 'node:assert/strict';
import { config } from '../shared/config';
import { defaultFromAddress } from '../services/email/emailService';
import { brevoAdapter } from '../services/email/providers/brevoAdapter';
import { normalizeBrevoPayloads, brevoEventFingerprint } from '../services/email/brevoWebhookService';
import { emailQuotaService } from '../services/email/quotaService';

async function run(): Promise<void> {
console.log('🧪 Email reliability regression (mocked only)');

const originalProvider = config.EMAIL_DELIVERY_PROVIDER;
const originalSender = config.BREVO_SENDER_EMAIL;
try {
  config.EMAIL_DELIVERY_PROVIDER = 'brevo';
  config.BREVO_SENDER_EMAIL = 'sender@example.invalid';
  assert.equal(defaultFromAddress(), 'sender@example.invalid');
  config.EMAIL_DELIVERY_PROVIDER = 'postal';
  assert.equal(defaultFromAddress(), config.POSTAL_DEFAULT_FROM_EMAIL);
} finally {
  config.EMAIL_DELIVERY_PROVIDER = originalProvider;
  config.BREVO_SENDER_EMAIL = originalSender;
}
console.log('  PASS sender identity follows provider');

// 16 — Brevo idempotency header present and stable for one logical attempt
const originalMode = config.BREVO_DELIVERY_MODE;
const originalKey = config.BREVO_API_KEY;
const calls: any[] = [];
(globalThis as any).fetch = async (_url: string, init: any) => {
  calls.push(init);
  return { ok: true, status: 201, text: async () => JSON.stringify({ messageId: 'mock-id' }) } as any;
};
try {
  config.BREVO_DELIVERY_MODE = 'live';
  config.BREVO_API_KEY = 'test-key';
  const opts = { recipientBatchCount: 1, recipientBatchIds: ['attempt-1'], subject: 'subject' };
  await brevoAdapter.send(['a@example.invalid'], '<p>x</p>', undefined, opts);
  await brevoAdapter.send(['a@example.invalid'], '<p>x</p>', undefined, opts);
  const keys = calls.map((c) => c.headers['idempotency-key']);
  assert.equal(keys.length, 2);
  assert.ok(keys[0] && keys[0].length > 20);
  assert.equal(keys[0], keys[1]);
} finally {
  config.BREVO_DELIVERY_MODE = originalMode;
  config.BREVO_API_KEY = originalKey;
}
console.log('  PASS idempotency header present and stable');

// 17 — webhook batching, distinct event identity, duplicate delivery
const at = new Date('2026-11-22T10:00:00Z');
const batch = normalizeBrevoPayloads([
  { event: 'delivered', email: 'a@example.invalid', 'message-id': 'm1' } as any,
  { event: 'hard_bounce', email: 'a@example.invalid', 'message-id': 'm1' } as any,
]);
assert.equal(batch.length, 2);
assert.equal(normalizeBrevoPayloads(batch[0]!).length, 1);
const f1 = brevoEventFingerprint('m1', 'A@example.invalid', 'delivered', at);
const f2 = brevoEventFingerprint('m1', 'a@example.invalid', 'hard_bounce', at);
const f3 = brevoEventFingerprint('m1', 'a@example.invalid', 'delivered', at);
assert.notEqual(f1, f2);
assert.equal(f1, f3);
console.log('  PASS webhook batching and event identity');

// 19 — reservation and commit use the same billing period
const boundary = new Date('2026-10-31T18:29:00Z'); // 23:59 Asia/Kolkata
const next = new Date('2026-10-31T18:31:00Z'); // 00:01 Asia/Kolkata
const reserved = emailQuotaService.getCurrentBillingPeriod(boundary);
const committed = emailQuotaService.getCurrentBillingPeriod(boundary);
assert.equal(reserved, committed);
assert.notEqual(reserved, emailQuotaService.getCurrentBillingPeriod(next));
console.log('  PASS quota billing period consistency across boundary');
console.log('✅ Email reliability regression complete');

}

run().catch((err) => { console.error(err); process.exit(1); });
