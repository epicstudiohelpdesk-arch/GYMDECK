/**
 * GymDeck Cloud Backend - Configuration Validation Test
 */

import { config } from '../shared/config';

async function runConfigTest() {
  console.log('🧪 Running Configuration Validation Test...');

  if (!config.PORT || config.PORT < 1000) {
    throw new Error(`❌ Invalid port configuration: ${config.PORT}`);
  }

  if (!config.NODE_ENV) {
    throw new Error('❌ Missing NODE_ENV configuration');
  }

  if (!config.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error(`❌ Invalid DATABASE_URL protocol: ${config.DATABASE_URL}`);
  }

  console.log(`✅ Configuration validated: Environment=${config.NODE_ENV}, Port=${config.PORT}`);
}

runConfigTest().catch((err) => {
  console.error('❌ Config Test Failed:', err);
  process.exit(1);
});
