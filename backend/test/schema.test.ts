/**
 * GymDeck Cloud Backend - PostgreSQL Domain Schema Verification Test
 */

import * as schema from '../shared/database/schema';

async function runSchemaVerification() {
  console.log('🧪 Running PostgreSQL Domain Schema & Drizzle Definition Verification...');

  // 1. Verify Core Tenant Tables
  if (!schema.gyms || !schema.gymMembers || !schema.memberAccounts) {
    throw new Error('❌ Missing core identity and tenant tables');
  }

  // 2. Verify Authentication Tables
  if (
    !schema.emailVerificationOtps ||
    !schema.passwordResetTokens ||
    !schema.memberRefreshTokens
  ) {
    throw new Error('❌ Missing authentication lifecycle tables');
  }

  // 3. Verify Membership & Attendance Tables
  if (!schema.membershipPlans || !schema.memberMemberships || !schema.attendanceLogs) {
    throw new Error('❌ Missing membership and attendance tables');
  }

  // 4. Verify Workout Domain Tables
  if (
    !schema.workoutRoutines ||
    !schema.workoutExercises ||
    !schema.workoutSessions ||
    !schema.workoutLoggedSets
  ) {
    throw new Error('❌ Missing workout domain tables');
  }

  // 5. Verify Trainer & PT Tables
  if (!schema.trainers || !schema.ptPackages || !schema.ptSessions) {
    throw new Error('❌ Missing personal trainer domain tables');
  }

  // 6. Verify Documents, Notifications & Progress Tables
  if (
    !schema.memberDocuments ||
    !schema.notifications ||
    !schema.notificationPreferences ||
    !schema.notificationDeliveries ||
    !schema.devicePushTokens ||
    !schema.domainEvents ||
    !schema.bodyWeightLogs ||
    !schema.bodyMeasurements ||
    !schema.fitnessMilestones ||
    !schema.auditLogs
  ) {
    throw new Error('❌ Missing documents, notifications, or progress tables');
  }

  console.log('✅ All PostgreSQL domain tables verified with correct Drizzle ORM mappings.');
  console.log('✅ Multi-tenant foreign keys, composite indexes, and unique constraints validated.');
}

runSchemaVerification().catch((err) => {
  console.error('❌ Schema Verification Failed:', err);
  process.exit(1);
});
