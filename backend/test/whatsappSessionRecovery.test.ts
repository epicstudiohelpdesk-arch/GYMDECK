import assert from 'node:assert/strict';
import { detectFailedSessions, planRecovery, recoverFailedSession } from '../services/whatsapp/sessionRecovery';

async function run(): Promise<void> {
console.log('🧪 WhatsApp failed-session recovery');
const sessions = [
  { id: 's1', name: 'gymdeck-a', status: 'ready' },
  { id: 's2', name: 'gymdeck-b', status: 'failed' },
  { id: 's3', name: 'gymdeck-c', status: 'ACTION_REQUIRED' },
];
const failed = detectFailedSessions(sessions);
assert.deepEqual(failed.map((s) => s.id), ['s2', 's3']);
const account = { gymId: 'gym-b', openwaSessionId: 's2', connectionStatus: 'ERROR' };
assert.equal(planRecovery(failed[0]!, account, false).allowed, false);
assert.equal(planRecovery(failed[0]!, account, true).allowed, true);
assert.equal(planRecovery(failed[0]!, { ...account, openwaSessionId: 'other' }, true).allowed, false);
assert.equal(planRecovery(failed[0]!, null, true).allowed, false);
assert.equal((await recoverFailedSession(failed[0]!, account, undefined)).allowed, false);
console.log('✅ Failed-session detection and guarded recovery: 6 assertions passed');

}
run().catch((e) => { console.error(e); process.exit(1); });
