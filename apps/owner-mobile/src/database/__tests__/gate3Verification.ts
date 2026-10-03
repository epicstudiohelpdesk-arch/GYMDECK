/**
 * GymDeck Owner Mobile - Gate 3 Automated Verification Suite
 *
 * Offline-First V1: Gate 3 — Complete Core Domain Local-First Reads
 *
 * Verifies the 10 required criteria across all 7 core business domains:
 *  1. Membership Plans (list, search, active filter, tenant isolation, integer paise)
 *  2. Member Memberships / Subscriptions (create, findActiveByMemberId, listByMemberId, tenant isolation)
 *  3. Trainers (list, active filter, search, tenant isolation)
 *  4. Attendance (recordCheckIn, listDaily with member JOIN, getStats, tenant isolation)
 *  5. Payments / Ledger (recordPayment, listTransactions with member JOIN, calculateTotalRevenueMinorUnits, integer paise)
 *  6. PT Packages (create, findById, listPackages, tenant isolation, integer paise)
 *  7. PT Sessions (create, findById, listSessions, tenant isolation)
 *  8. Multi-domain local persistence across connection restart
 *  9. Graceful empty state handling across all 7 domains (zero exceptions, graceful empty lists/zeros)
 * 10. Zero HTTP calls during local reads across all 7 domain repositories
 */

import { LocalDatabaseManager } from '../LocalDatabaseManager';
import { MemberRepository } from '../repositories/MemberRepository';
import { MembershipPlanRepository } from '../repositories/MembershipPlanRepository';
import { MemberMembershipRepository } from '../repositories/MemberMembershipRepository';
import { TrainerRepository } from '../repositories/TrainerRepository';
import { AttendanceRepository } from '../repositories/AttendanceRepository';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { PTPackageRepository } from '../repositories/PTPackageRepository';
import { generateUUID } from '../utils';

export interface Gate3SingleTestResult {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  details: string;
  durationMs: number;
}

export interface Gate3VerificationReport {
  overallStatus: 'PASS' | 'FAIL';
  passedCount: number;
  failedCount: number;
  totalCount: number;
  executedAt: string;
  tests: Gate3SingleTestResult[];
}

export async function runGate3VerificationSuite(
  primaryGymId: string = 'gym_gate3_verify_main'
): Promise<Gate3VerificationReport> {
  const tests: Gate3SingleTestResult[] = [];

  const recordResult = (
    id: number,
    name: string,
    passed: boolean,
    details: string,
    durationMs: number
  ) => {
    tests.push({
      id,
      name,
      status: passed ? 'PASS' : 'FAIL',
      details,
      durationMs,
    });
  };

  const dbManager = LocalDatabaseManager.getInstance();
  const priorGymId = dbManager.getActiveGymId();

  try {
    // Ensure DB is initialized for primary tenant
    if (!dbManager.isOpen() || dbManager.getActiveGymId() !== primaryGymId) {
      if (dbManager.isOpen()) await dbManager.close();
      await dbManager.initialize(primaryGymId);
    }

  const memberRepo = new MemberRepository(dbManager);
  const planRepo = new MembershipPlanRepository(dbManager);
  const membershipRepo = new MemberMembershipRepository(dbManager);
  const trainerRepo = new TrainerRepository(dbManager);
  const attendanceRepo = new AttendanceRepository(dbManager);
  const paymentRepo = new PaymentRepository(dbManager);
  const ptRepo = new PTPackageRepository(dbManager);

  // Common IDs for domain relations
  const testMemberId = generateUUID();
  const testTrainerId = generateUUID();
  const testPlanId = generateUUID();
  const testMembershipId = generateUUID();
  const testAttendanceId = generateUUID();
  const testPaymentId = generateUUID();
  const testPackageId = generateUUID();
  const testSessionId = generateUUID();

  // Seed base member for foreign key / JOIN tests
  await memberRepo.upsert({
    id: testMemberId,
    gymId: primaryGymId,
    memberCode: 'G3-M01',
    fullName: 'Kavya Sharma',
    phone: '+919876543210',
    email: 'kavya.sharma@example.com',
    membershipStatus: 'ACTIVE',
    joinedAt: new Date().toISOString(),
  });

  // ==============================================================================
  // TEST 1: Membership Plans
  // ==============================================================================
  const t1Start = Date.now();
  try {
    // 1. Create plan with 1500 INR = 150000 paise
    await planRepo.create({
      id: testPlanId,
      gymId: primaryGymId,
      planName: 'Gold Annual Pass',
      durationDays: 365,
      priceMinorUnits: 150000,
      description: 'Full gym & pool access',
      benefits: 'Sauna, Locker, Free PT Session',
      isActive: true,
    });

    // 2. Fetch by ID
    const plan = await planRepo.findById(testPlanId, primaryGymId);

    // 3. Search & Active filter
    const searchResults = await planRepo.list({ gymId: primaryGymId, search: 'Gold' });
    const activeList = await planRepo.list({ gymId: primaryGymId, onlyActive: true });

    // 4. Tenant isolation check
    const foreignPlanId = generateUUID();
    await planRepo.create({
      id: foreignPlanId,
      gymId: 'gym_gate3_foreign_99',
      planName: 'Foreign Diamond Pass',
      durationDays: 180,
      priceMinorUnits: 250000,
      isActive: true,
    });
    const leakCheck = await planRepo.findById(foreignPlanId, primaryGymId);

    const pass =
      plan !== null &&
      plan.id === testPlanId &&
      plan.price_minor_units === 150000 &&
      plan.duration_days === 365 &&
      searchResults.some((p) => p.id === testPlanId) &&
      activeList.some((p) => p.id === testPlanId) &&
      leakCheck === null;

    recordResult(
      1,
      'Domain: Membership Plans',
      pass,
      `Plan '${plan?.plan_name}' verified: price=${plan?.price_minor_units} paise (₹${Number(plan?.price_minor_units) / 100}), isolation: leakCheck=${leakCheck}`,
      Date.now() - t1Start
    );
  } catch (err: any) {
    recordResult(1, 'Domain: Membership Plans', false, `Failed: ${err?.message}`, Date.now() - t1Start);
  }

  // ==============================================================================
  // TEST 2: Member Memberships / Subscriptions
  // ==============================================================================
  const t2Start = Date.now();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

    await membershipRepo.create({
      id: testMembershipId,
      gymId: primaryGymId,
      memberId: testMemberId,
      planId: testPlanId,
      status: 'ACTIVE',
      startDate: today,
      endDate: nextYear,
      priceAtPurchaseMinorUnits: 150000,
      autoRenew: false,
    });

    const activeSub = await membershipRepo.findActiveByMemberId(testMemberId, primaryGymId);
    const subList = await membershipRepo.listByMemberId(testMemberId, primaryGymId);

    // Tenant isolation
    const foreignSubId = generateUUID();
    await membershipRepo.create({
      id: foreignSubId,
      gymId: 'gym_gate3_foreign_99',
      memberId: testMemberId,
      planId: testPlanId,
      status: 'ACTIVE',
      startDate: today,
      endDate: nextYear,
      priceAtPurchaseMinorUnits: 100000,
    });
    const crossCheck = await membershipRepo.findById(foreignSubId, primaryGymId);

    const pass =
      activeSub !== null &&
      activeSub.id === testMembershipId &&
      activeSub.price_at_purchase_minor_units === 150000 &&
      subList.length >= 1 &&
      crossCheck === null;

    recordResult(
      2,
      'Domain: Member Memberships',
      pass,
      `Active membership verified: id=${activeSub?.id}, planId=${activeSub?.plan_id}, status=${activeSub?.status}, crossCheck=${crossCheck}`,
      Date.now() - t2Start
    );
  } catch (err: any) {
    recordResult(2, 'Domain: Member Memberships', false, `Failed: ${err?.message}`, Date.now() - t2Start);
  }

  // ==============================================================================
  // TEST 3: Trainers
  // ==============================================================================
  const t3Start = Date.now();
  try {
    await trainerRepo.create({
      id: testTrainerId,
      gymId: primaryGymId,
      fullName: 'Vikram Rajput',
      phone: '+919112233445',
      email: 'vikram.rajput@example.com',
      specialization: 'Hypertrophy & Strength',
      experienceYears: 7,
      bio: 'Certified strength and conditioning coach',
      isActive: true,
    });

    const trainer = await trainerRepo.findById(testTrainerId, primaryGymId);
    const searchResults = await trainerRepo.list({ gymId: primaryGymId, search: 'Vikram' });
    const activeTrainers = await trainerRepo.list({ gymId: primaryGymId, onlyActive: true });

    // Tenant isolation
    const foreignTrainerId = generateUUID();
    await trainerRepo.create({
      id: foreignTrainerId,
      gymId: 'gym_gate3_foreign_99',
      fullName: 'Foreign Coach X',
      phone: '+919000000001',
      isActive: true,
    });
    const foreignRead = await trainerRepo.findById(foreignTrainerId, primaryGymId);

    const pass =
      trainer !== null &&
      trainer.id === testTrainerId &&
      trainer.specialization === 'Hypertrophy & Strength' &&
      searchResults.some((t) => t.id === testTrainerId) &&
      activeTrainers.some((t) => t.id === testTrainerId) &&
      foreignRead === null;

    recordResult(
      3,
      'Domain: Trainers & Coaches',
      pass,
      `Trainer '${trainer?.full_name}' verified: spec=${trainer?.specialization}, search=${searchResults.length}, foreignRead=${foreignRead}`,
      Date.now() - t3Start
    );
  } catch (err: any) {
    recordResult(3, 'Domain: Trainers & Coaches', false, `Failed: ${err?.message}`, Date.now() - t3Start);
  }

  // ==============================================================================
  // TEST 4: Attendance & Daily Presence (with Member JOIN)
  // ==============================================================================
  const t4Start = Date.now();
  try {
    const checkInTime = new Date().toISOString();
    await attendanceRepo.recordCheckIn({
      id: testAttendanceId,
      gymId: primaryGymId,
      memberId: testMemberId,
      checkInTime,
      entryMethod: 'MANUAL',
      notes: 'Morning workout check-in',
    });

    const todayDate = checkInTime.slice(0, 10);
    // listDaily performs LEFT JOIN gym_members
    const daily = await attendanceRepo.listDaily({
      gymId: primaryGymId,
      date: todayDate,
    });

    const stats = await attendanceRepo.getStats(todayDate, primaryGymId);

    // Tenant isolation
    const foreignAttId = generateUUID();
    await attendanceRepo.recordCheckIn({
      id: foreignAttId,
      gymId: 'gym_gate3_foreign_99',
      memberId: testMemberId,
      checkInTime,
      entryMethod: 'RFID',
    });
    const foreignList = await attendanceRepo.listDaily({
      gymId: primaryGymId,
      date: todayDate,
    });
    const leaked = foreignList.items.some((a) => a.id === foreignAttId);

    const targetRow = daily.items.find((a) => a.id === testAttendanceId);
    const pass =
      targetRow !== undefined &&
      targetRow.fullName === 'Kavya Sharma' &&
      targetRow.memberCode === 'G3-M01' &&
      stats.onFloorCount >= 1 &&
      stats.todayTotalCheckIns >= 1 &&
      !leaked;

    recordResult(
      4,
      'Domain: Attendance & Floor Presence',
      pass,
      `Attendance row joined member info: name='${targetRow?.fullName}', code='${targetRow?.memberCode}', onFloor=${stats.onFloorCount}, leakFree=${!leaked}`,
      Date.now() - t4Start
    );
  } catch (err: any) {
    recordResult(4, 'Domain: Attendance & Floor Presence', false, `Failed: ${err?.message}`, Date.now() - t4Start);
  }

  // ==============================================================================
  // TEST 5: Payments & Financial Ledger (with Member JOIN & Minor Units)
  // ==============================================================================
  const t5Start = Date.now();
  try {
    const paidAt = new Date().toISOString();
    // 1500 INR = 150000 paise
    await paymentRepo.recordPayment({
      id: testPaymentId,
      gymId: primaryGymId,
      memberId: testMemberId,
      membershipId: testMembershipId,
      amountMinorUnits: 150000,
      paymentMethod: 'UPI',
      status: 'COMPLETED',
      paidAt,
      receiptNumber: 'REC-G3-001',
      transactionReference: 'UPI-TXN-998877',
      notes: 'Annual pass settlement',
    });

    // listTransactions joins gym_members
    const txns = await paymentRepo.listTransactions({
      gymId: primaryGymId,
      period: 'today',
      status: 'COMPLETED',
    });

    const totalRevenuePaise = await paymentRepo.calculateTotalRevenueMinorUnits(undefined, undefined, primaryGymId);

    // Tenant isolation
    const foreignPaymentId = generateUUID();
    await paymentRepo.recordPayment({
      id: foreignPaymentId,
      gymId: 'gym_gate3_foreign_99',
      memberId: testMemberId,
      membershipId: testMembershipId,
      amountMinorUnits: 500000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      paidAt,
    });
    const foreignTxnRead = await paymentRepo.findById(foreignPaymentId, primaryGymId);

    const targetTxn = txns.find((t) => t.id === testPaymentId);
    const pass =
      targetTxn !== undefined &&
      targetTxn.memberName === 'Kavya Sharma' &&
      targetTxn.amountMinorUnits === 150000 &&
      targetTxn.amount === 1500 && // Converted to rupees for UI display
      totalRevenuePaise >= 150000 &&
      foreignTxnRead === null;

    recordResult(
      5,
      'Domain: Payments & Financial Ledger',
      pass,
      `Transaction joined member: name='${targetTxn?.memberName}', amount=₹${targetTxn?.amount} (${targetTxn?.amountMinorUnits} paise), totalRevenue=${totalRevenuePaise} paise, foreignTxnRead=${foreignTxnRead}`,
      Date.now() - t5Start
    );
  } catch (err: any) {
    recordResult(5, 'Domain: Payments & Financial Ledger', false, `Failed: ${err?.message}`, Date.now() - t5Start);
  }

  // ==============================================================================
  // TEST 6: PT Packages
  // ==============================================================================
  const t6Start = Date.now();
  try {
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    // 10 sessions, 8000 INR = 800000 paise
    await ptRepo.createPackage({
      id: testPackageId,
      gymId: primaryGymId,
      memberId: testMemberId,
      trainerId: testTrainerId,
      packageName: '10-Session Strength PT',
      totalSessions: 10,
      usedSessions: 0,
      remainingSessions: 10,
      priceMinorUnits: 800000,
      expiryDate: expiry,
      status: 'ACTIVE',
    });

    const pkg = await ptRepo.findPackageById(testPackageId, primaryGymId);
    const memberPkgs = await ptRepo.listPackages({ gymId: primaryGymId, memberId: testMemberId });
    const trainerPkgs = await ptRepo.listPackages({ gymId: primaryGymId, trainerId: testTrainerId });

    // Tenant isolation
    const foreignPkgId = generateUUID();
    await ptRepo.createPackage({
      id: foreignPkgId,
      gymId: 'gym_gate3_foreign_99',
      memberId: testMemberId,
      trainerId: testTrainerId,
      packageName: 'Foreign PT',
      totalSessions: 5,
      remainingSessions: 5,
      priceMinorUnits: 400000,
      expiryDate: expiry,
    });
    const foreignPkgRead = await ptRepo.findPackageById(foreignPkgId, primaryGymId);

    const pass =
      pkg !== null &&
      pkg.id === testPackageId &&
      pkg.price_minor_units === 800000 &&
      pkg.remaining_sessions === 10 &&
      memberPkgs.some((p) => p.id === testPackageId) &&
      trainerPkgs.some((p) => p.id === testPackageId) &&
      foreignPkgRead === null;

    recordResult(
      6,
      'Domain: Personal Training Packages',
      pass,
      `PT Package '${pkg?.package_name}' verified: total=${pkg?.total_sessions}, remaining=${pkg?.remaining_sessions}, price=${pkg?.price_minor_units} paise (₹${Number(pkg?.price_minor_units) / 100}), foreignPkgRead=${foreignPkgRead}`,
      Date.now() - t6Start
    );
  } catch (err: any) {
    recordResult(6, 'Domain: Personal Training Packages', false, `Failed: ${err?.message}`, Date.now() - t6Start);
  }

  // ==============================================================================
  // TEST 7: PT Sessions
  // ==============================================================================
  const t7Start = Date.now();
  try {
    const sessionDate = new Date().toISOString();
    await ptRepo.createSession({
      id: testSessionId,
      packageId: testPackageId,
      gymId: primaryGymId,
      memberId: testMemberId,
      trainerId: testTrainerId,
      sessionDate,
      durationMinutes: 60,
      focusArea: 'Lower Body & Squat Mechanics',
      trainerNotes: 'Excellent bar path, increased weight by 5kg',
      status: 'COMPLETED',
    });

    const session = await ptRepo.findSessionById(testSessionId, primaryGymId);
    const sessionsByPkg = await ptRepo.listSessions({ gymId: primaryGymId, packageId: testPackageId });
    const sessionsByTrainer = await ptRepo.listSessions({ gymId: primaryGymId, trainerId: testTrainerId });

    // Tenant isolation
    const foreignSessionId = generateUUID();
    await ptRepo.createSession({
      id: foreignSessionId,
      packageId: testPackageId,
      gymId: 'gym_gate3_foreign_99',
      memberId: testMemberId,
      trainerId: testTrainerId,
      sessionDate,
      durationMinutes: 45,
      status: 'COMPLETED',
    });
    const foreignSessionRead = await ptRepo.findSessionById(foreignSessionId, primaryGymId);

    const pass =
      session !== null &&
      session.id === testSessionId &&
      session.duration_minutes === 60 &&
      session.focus_area === 'Lower Body & Squat Mechanics' &&
      sessionsByPkg.some((s) => s.id === testSessionId) &&
      sessionsByTrainer.some((s) => s.id === testSessionId) &&
      foreignSessionRead === null;

    recordResult(
      7,
      'Domain: Personal Training Sessions',
      pass,
      `PT Session verified: focus='${session?.focus_area}', duration=${session?.duration_minutes}m, status=${session?.status}, foreignSessionRead=${foreignSessionRead}`,
      Date.now() - t7Start
    );
  } catch (err: any) {
    recordResult(7, 'Domain: Personal Training Sessions', false, `Failed: ${err?.message}`, Date.now() - t7Start);
  }

  // ==============================================================================
  // TEST 8: Multi-Domain Local Persistence Across Restart
  // ==============================================================================
  const t8Start = Date.now();
  try {
    // 1. Close database connection cleanly
    await dbManager.close();

    // 2. Re-initialize database for primary tenant
    await dbManager.initialize(primaryGymId);

    // 3. Re-instantiate fresh repositories
    const freshPlanRepo = new MembershipPlanRepository(dbManager);
    const freshSubRepo = new MemberMembershipRepository(dbManager);
    const freshTrainerRepo = new TrainerRepository(dbManager);
    const freshAttendanceRepo = new AttendanceRepository(dbManager);
    const freshPaymentRepo = new PaymentRepository(dbManager);
    const freshPTRepo = new PTPackageRepository(dbManager);

    // 4. Verify all 7 domain records survived complete DB disconnect/reconnect cycle
    const restoredPlan = await freshPlanRepo.findById(testPlanId, primaryGymId);
    const restoredSub = await freshSubRepo.findById(testMembershipId, primaryGymId);
    const restoredTrainer = await freshTrainerRepo.findById(testTrainerId, primaryGymId);
    const restoredAttendance = await freshAttendanceRepo.listDaily({
      gymId: primaryGymId,
      date: new Date().toISOString().slice(0, 10),
    });
    const restoredPayment = await freshPaymentRepo.findById(testPaymentId, primaryGymId);
    const restoredPackage = await freshPTRepo.findPackageById(testPackageId, primaryGymId);
    const restoredSession = await freshPTRepo.findSessionById(testSessionId, primaryGymId);

    const hasAttendance = restoredAttendance.items.some((a) => a.id === testAttendanceId);

    const pass =
      restoredPlan !== null &&
      restoredSub !== null &&
      restoredTrainer !== null &&
      hasAttendance &&
      restoredPayment !== null &&
      restoredPackage !== null &&
      restoredSession !== null;

    recordResult(
      8,
      'Multi-Domain Persistence Across Restart',
      pass,
      `All 7 domain entities verified after complete DB restart: plan=${!!restoredPlan}, sub=${!!restoredSub}, trainer=${!!restoredTrainer}, att=${hasAttendance}, pay=${!!restoredPayment}, ptPkg=${!!restoredPackage}, ptSession=${!!restoredSession}`,
      Date.now() - t8Start
    );
  } catch (err: any) {
    recordResult(8, 'Multi-Domain Persistence Across Restart', false, `Failed: ${err?.message}`, Date.now() - t8Start);
  }

  // ==============================================================================
  // TEST 9: Empty State Graceful Handling Across All 7 Domains
  // ==============================================================================
  const t9Start = Date.now();
  try {
    const emptyGymId = `gym_empty_${Date.now()}`;

    const emptyPlans = await planRepo.list({ gymId: emptyGymId });
    const emptySubs = await membershipRepo.list({ gymId: emptyGymId });
    const emptyTrainers = await trainerRepo.list({ gymId: emptyGymId });
    const emptyAttendance = await attendanceRepo.listDaily({ gymId: emptyGymId, date: '2026-01-01' });
    const emptyStats = await attendanceRepo.getStats('2026-01-01', emptyGymId);
    const emptyTxns = await paymentRepo.listTransactions({ gymId: emptyGymId });
    const emptyRevenue = await paymentRepo.calculateTotalRevenueMinorUnits(undefined, undefined, emptyGymId);
    const emptyPackages = await ptRepo.listPackages({ gymId: emptyGymId });
    const emptySessions = await ptRepo.listSessions({ gymId: emptyGymId });

    const pass =
      Array.isArray(emptyPlans) && emptyPlans.length === 0 &&
      Array.isArray(emptySubs) && emptySubs.length === 0 &&
      Array.isArray(emptyTrainers) && emptyTrainers.length === 0 &&
      Array.isArray(emptyAttendance.items) && emptyAttendance.items.length === 0 &&
      emptyStats.todayTotalCheckIns === 0 &&
      emptyStats.onFloorCount === 0 &&
      Array.isArray(emptyTxns) && emptyTxns.length === 0 &&
      emptyRevenue === 0 &&
      Array.isArray(emptyPackages) && emptyPackages.length === 0 &&
      Array.isArray(emptySessions) && emptySessions.length === 0;

    recordResult(
      9,
      'Empty State Graceful Handling',
      pass,
      `Empty tenant '${emptyGymId}' returned zero-length arrays and zero counts without throwing: plans=${emptyPlans.length}, subs=${emptySubs.length}, trainers=${emptyTrainers.length}, att=${emptyAttendance.items.length}, txns=${emptyTxns.length}, rev=${emptyRevenue} paise, ptPkgs=${emptyPackages.length}, ptSessions=${emptySessions.length}`,
      Date.now() - t9Start
    );
  } catch (err: any) {
    recordResult(9, 'Empty State Graceful Handling', false, `Failed: ${err?.message}`, Date.now() - t9Start);
  }

  // ==============================================================================
  // TEST 10: Zero HTTP Calls During Local Reads Across All 7 Domains
  // ==============================================================================
  const t10Start = Date.now();
  try {
    let networkCallCount = 0;
    const originalFetch = (globalThis as any).fetch;

    // Spy on fetch to detect accidental HTTP egress
    (globalThis as any).fetch = (...args: any[]) => {
      networkCallCount++;
      return originalFetch(...args);
    };

    try {
      // Execute read operations across all 7 domain repositories
      await planRepo.list({ gymId: primaryGymId });
      await planRepo.findById(testPlanId, primaryGymId);
      await membershipRepo.findActiveByMemberId(testMemberId, primaryGymId);
      await membershipRepo.listByMemberId(testMemberId, primaryGymId);
      await trainerRepo.list({ gymId: primaryGymId });
      await trainerRepo.findById(testTrainerId, primaryGymId);
      await attendanceRepo.listDaily({ gymId: primaryGymId, date: new Date().toISOString().slice(0, 10) });
      await attendanceRepo.getStats(undefined, primaryGymId);
      await paymentRepo.listTransactions({ gymId: primaryGymId });
      await paymentRepo.calculateTotalRevenueMinorUnits(undefined, undefined, primaryGymId);
      await ptRepo.listPackages({ gymId: primaryGymId });
      await ptRepo.listSessions({ gymId: primaryGymId });
    } finally {
      (globalThis as any).fetch = originalFetch;
    }

    const pass = networkCallCount === 0;
    recordResult(
      10,
      'Zero HTTP Calls in Local Domain Reads',
      pass,
      `Executed 12 queries across all 7 core repositories: networkCallCount = ${networkCallCount} (100% local encrypted SQLCipher reads)`,
      Date.now() - t10Start
    );
  } catch (err: any) {
    recordResult(10, 'Zero HTTP Calls in Local Domain Reads', false, `Failed: ${err?.message}`, Date.now() - t10Start);
  }

    const passedCount = tests.filter((t) => t.status === 'PASS').length;
    const failedCount = tests.filter((t) => t.status === 'FAIL').length;

    return {
      overallStatus: failedCount === 0 ? 'PASS' : 'FAIL',
      passedCount,
      failedCount,
      totalCount: tests.length,
      executedAt: new Date().toISOString(),
      tests,
    };
  } finally {
    if (priorGymId && priorGymId !== primaryGymId) {
      try {
        await dbManager.initialize(priorGymId);
      } catch {
        // ignore restore error
      }
    }
  }
}
