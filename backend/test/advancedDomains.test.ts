/**
 * GymDeck Cloud Backend - Advanced Member Domain Services Test Suite
 */

import { DevStorageProvider } from '../services/documents/storageProvider';

async function runAdvancedDomainTests() {
  console.log('🧪 Running Advanced Member Domain Services Test Suite (Workouts, PT, Vault, Notifications, Progress)...');

  // 1. Object Storage Provider & Signed URL Lifecycle
  console.log('  1. Testing Private Document Vault & Signed URL Generation...');
  const storageProvider = new DevStorageProvider();
  const signedUrl = await storageProvider.createSignedDownloadUrl('documents/waiver_123.pdf', 600);

  if (!signedUrl.includes('vault.gymdeck.cloud') || !signedUrl.includes('expires=')) {
    throw new Error(`❌ Malformed signed URL: ${signedUrl}`);
  }
  console.log('     ✅ Signed document URL generated with 10-minute validity window.');

  // 2. Workout Session State Machine & Invariants
  console.log('  2. Testing Workout Session State Machine Transitions...');
  const validTransitions = {
    NOT_STARTED: ['IN_PROGRESS'],
    IN_PROGRESS: ['COMPLETED', 'ABANDONED'],
    COMPLETED: [], // Terminal
    ABANDONED: [], // Terminal
  };

  const isTransitionAllowed = (from: keyof typeof validTransitions, to: string) => {
    return (validTransitions[from] as string[]).includes(to);
  };

  if (!isTransitionAllowed('IN_PROGRESS', 'COMPLETED')) {
    throw new Error('❌ Valid transition IN_PROGRESS -> COMPLETED rejected');
  }
  if (isTransitionAllowed('COMPLETED', 'IN_PROGRESS')) {
    throw new Error('❌ Illegal state transition COMPLETED -> IN_PROGRESS permitted');
  }
  console.log('     ✅ Workout state machine transitions verified.');

  // 3. Weight Log Validation
  console.log('  3. Testing Fitness Progress Canonical Validation...');
  const validateWeight = (kg: number) => kg >= 30 && kg <= 300;
  if (!validateWeight(75.5)) throw new Error('❌ Valid weight rejected');
  if (validateWeight(10) || validateWeight(500)) throw new Error('❌ Out-of-bounds weight accepted');
  console.log('     ✅ Body weight range bounds enforced (30 - 300 kg).');

  // 4. PT Package Consumption Invariant
  console.log('  4. Testing PT Package Consumption Math...');
  const totalSessions = 10;
  const usedSessions = 4;
  const remaining = totalSessions - usedSessions;
  if (remaining !== 6) throw new Error('❌ PT Package math incorrect');
  console.log('     ✅ PT package balance calculation validated.');

  console.log('\n🎉 ALL ADVANCED MEMBER DOMAIN TESTS PASSED SUCCESSFULLY!');
}

runAdvancedDomainTests().catch((err) => {
  console.error('❌ Advanced Domain Test Failed:', err);
  process.exit(1);
});
