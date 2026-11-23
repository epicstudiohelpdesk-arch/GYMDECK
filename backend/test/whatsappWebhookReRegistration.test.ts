import assert from 'node:assert/strict';
import { isLoopbackWebhookUrl, planWebhookReRegistration } from '../services/whatsapp/webhookReRegistration';

console.log('🧪 OpenWA webhook URL re-registration planning');
const canonical = 'http://backend:8080/v1/webhooks/openwa';
assert.equal(isLoopbackWebhookUrl('http://127.0.0.1:3001/v1/webhooks/openwa'), true);
assert.equal(isLoopbackWebhookUrl('http://localhost:3001/v1/webhooks/openwa'), true);
assert.equal(isLoopbackWebhookUrl(canonical), false);
assert.equal(isLoopbackWebhookUrl('https://api.gymdeck.com/v1/webhooks/openwa'), false);
const records = [
  { sessionId: 's1', url: 'http://127.0.0.1:3001/v1/webhooks/openwa' },
  { sessionId: 's2', url: canonical },
  { sessionId: 's3', url: 'http://localhost:3001/v1/webhooks/openwa' },
];
const plan = planWebhookReRegistration(records, canonical);
assert.deepEqual(plan.map((r) => r.sessionId), ['s1', 's3']);
assert.deepEqual(planWebhookReRegistration(plan.map((r) => ({ ...r, url: canonical })), canonical), []);
console.log('✅ Webhook re-registration: 7 assertions passed');
