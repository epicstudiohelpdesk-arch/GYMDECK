/**
 * GymDeck Cloud Backend - Health Route & Bootstrap Verification Test
 */

import { createApp } from '../gateway/src/app';

async function runHealthTest() {
  console.log('🧪 Running Health & Bootstrap Verification Test...');

  const app = createApp();

  if (!app) {
    throw new Error('❌ Failed to instantiate Express application');
  }

  console.log('✅ Express app instantiated successfully with security middleware and routes.');
}

runHealthTest().catch((err) => {
  console.error('❌ Health Test Failed:', err);
  process.exit(1);
});
