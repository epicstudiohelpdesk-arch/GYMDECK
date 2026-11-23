import assert from 'node:assert/strict';
import { logger, redactMessage, redactSensitiveData } from '../shared/logging/logger';

console.log('🧪 Log redaction');

assert.doesNotMatch(redactMessage('Authorization: Bearer abc123456'), /abc123456/);
assert.doesNotMatch(redactMessage('GET /v1/inbox?token=abc123456&page=1'), /abc123456/);
assert.doesNotMatch(redactMessage('upstream api_key: sk_live_secret123'), /sk_live_secret123/);
console.log('  PASS free-form messages');

const redacted = redactSensitiveData({
  api_key: 'should-not-appear-1',
  note: 'token=should-not-appear-2',
  nested: [{ authorization: 'Bearer should-not-appear-3', detail: 'password=should-not-appear-4' }],
}) as Record<string, unknown>;
assert.equal(redacted.api_key, '[REDACTED]');
assert.doesNotMatch(JSON.stringify(redacted), /should-not-appear-[1-4]/);
console.log('  PASS structured context (including nested values)');

const originalError = console.error;
let captured = '';
console.error = (line?: unknown) => { captured = String(line); };
try {
  logger.error('fetch failed', new Error('upstream token=should-not-appear-5'), { detail: 'Bearer should-not-appear-6' });
} finally {
  console.error = originalError;
}
assert.doesNotMatch(captured, /should-not-appear-[56]/);
assert.match(captured, /fetch failed/);
console.log('  PASS error log path');

console.log('✅ Log redaction: 3 checks passed');
