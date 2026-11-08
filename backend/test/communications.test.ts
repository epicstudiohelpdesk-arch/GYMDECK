/**
 * GymDeck Cloud Backend - Mode A Communications Helper Tests
 */

import {
  normalizePhone,
  maskPhone,
  maskEmail,
  sanitizeMessage,
  hashBody,
} from '../services/communications/communicationService';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ ${message}`);
}

async function run(): Promise<void> {
  console.log('🧪 Running Mode A communication helper tests...');

  assert(normalizePhone('98765 43210') === '919876543210', '10-digit Indian number normalizes');
  assert(normalizePhone('+91 98765 43210') === '919876543210', 'E.164 number normalizes');
  assert(normalizePhone('123') === null, 'Short numbers are rejected');
  assert(Boolean(maskPhone('+91 98765 43210')?.endsWith('3210')), 'Phone mask keeps last four digits');
  assert(Boolean(!maskPhone('+91 98765 43210')?.includes('98765')), 'Phone mask hides the middle digits');
  assert(maskEmail('owner@gym.com') === 'o•••@gym.com', 'Email mask hides the local part');
  assert(maskEmail('not-an-email') === null, 'Invalid email is rejected');

  assert(sanitizeMessage('  hello\r\nworld  ') === 'hello\nworld', 'Message is trimmed and newlines normalized');
  let rejected = false;
  try { sanitizeMessage('bad\u0000payload'); } catch { rejected = true; }
  assert(rejected, 'Control characters are rejected');

  const first = hashBody('same message');
  assert(first.length === 64, 'Body digest is SHA-256 hex');
  assert(first === hashBody('same message'), 'Body digest is deterministic');
  assert(first !== hashBody('different'), 'Different bodies produce different digests');

  console.log('✅ Mode A helper tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
