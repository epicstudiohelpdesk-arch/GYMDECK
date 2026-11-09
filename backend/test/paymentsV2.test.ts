/**
 * GymDeck Payments V2 - domain, database and tenant-isolation test matrix.
 * Runs against the configured PostgreSQL database and creates isolated gyms.
 */

import assert from 'node:assert/strict';
import { db, closeDatabasePool, getDatabasePool } from '../shared/database';
import { bootstrapDatabaseSchema } from '../shared/database/bootstrap';
import { gyms, users, gymMembers } from '../shared/database/schema';
import { paymentAccountService } from '../services/payments/accountService';
import { paymentIntentService } from '../services/payments/paymentIntentService';
import { reconciliationService } from '../services/payments/reconciliationService';
import { invoiceService } from '../services/payments/invoiceService';
import { billingService } from '../services/billing/billingService';
import { hashPassword } from '../shared/security';

const pool = () => getDatabasePool();

async function seedTenant(label: string) {
  const gymId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  await db.insert(gyms).values({
    id: gymId,
    name: `${label} Gym`,
    code: `GD-${label}-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
    status: 'ACTIVE',
  });
  await db.insert(users).values({
    id: userId,
    gymId,
    email: `owner-${crypto.randomUUID().substring(0, 8)}@${label}.test`,
    fullName: `${label} Owner`,
    passwordHash: await hashPassword('SecureOwnerPass123!'),
    role: 'OWNER',
    permissions: ['payments.read', 'payments.write', 'memberships.read', 'memberships.write', 'settings.read', 'settings.write'],
    accountStatus: 'ACTIVE',
  });
  return { gymId, userId };
}

async function seedMember(gymId: string, name: string) {
  const [member] = await db
    .insert(gymMembers)
    .values({
      gymId,
      memberCode: `M-${crypto.randomUUID().substring(0, 6).toUpperCase()}`,
      fullName: name,
      phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      membershipStatus: 'ACTIVE',
    })
    .returning();
  return member!;
}

async function run() {
  await bootstrapDatabaseSchema();
  const gymA = await seedTenant('alpha');
  const gymB = await seedTenant('bravo');
  const memberA = await seedMember(gymA.gymId, 'Asha Rao');
  await seedMember(gymB.gymId, 'Bilal Khan');
  console.log('Payments V2: tenants seeded');

  // --- Receiving accounts -------------------------------------------------
  await assert.rejects(
    paymentAccountService.createAccount(gymA.gymId, gymA.userId, {
      method: 'BANK_TRANSFER',
      beneficiaryName: 'Alpha Gym',
      accountNumber: '123456789012',
      confirmAccountNumber: '123456789012',
      ifscCode: 'BADIFSC1',
    }),
    /IFSC/
  );
  await assert.rejects(
    paymentAccountService.createAccount(gymA.gymId, gymA.userId, {
      method: 'BANK_TRANSFER',
      beneficiaryName: 'Alpha Gym',
      accountNumber: '123456789012',
      confirmAccountNumber: '999999999999',
      ifscCode: 'HDFC0001234',
    }),
    /confirmation/
  );
  await assert.rejects(
    paymentAccountService.createAccount(gymA.gymId, gymA.userId, {
      method: 'UPI',
      beneficiaryName: 'Alpha Gym',
      upiVpa: 'not-a-vpa',
    }),
    /VPA/
  );

  const upiAccount = await paymentAccountService.createAccount(gymA.gymId, gymA.userId, {
    method: 'UPI',
    beneficiaryName: 'Alpha Gym',
    upiVpa: 'alphagym@okhdfcbank',
    isPrimary: true,
  });
  assert.equal(upiAccount.status, 'UNVERIFIED');
  assert.equal(upiAccount.isPrimary, true);

  const bankAccount = await paymentAccountService.createAccount(gymB.gymId, gymB.userId, {
    method: 'BANK_TRANSFER',
    beneficiaryName: 'Bravo Gym',
    accountNumber: '123456789012',
    confirmAccountNumber: '123456789012',
    ifscCode: 'HDFC0001234',
    isPrimary: true,
  });
  assert.equal(bankAccount.status, 'UNVERIFIED');
  const stored = (await pool().query(`SELECT account_number_enc FROM gym_payment_accounts WHERE id = $1`, [bankAccount.id])).rows[0];
  assert.ok(stored.account_number_enc.startsWith('v1:'), 'account number must be encrypted at rest');
  assert.ok(!JSON.stringify(bankAccount).includes('123456789012'), 'full account number must never be returned');

  const second = await paymentAccountService.createAccount(gymA.gymId, gymA.userId, {
    method: 'UPI',
    beneficiaryName: 'Second UPI',
    upiVpa: 'second@okaxis',
    isPrimary: true,
  });
  assert.equal(second.isPrimary, true);
  const accounts = await paymentAccountService.listAccounts(gymA.gymId);
  assert.equal(accounts.filter((a) => a.isPrimary).length, 1, 'only one primary per method');
  await assert.rejects(
    paymentAccountService.updateAccount(gymB.gymId, upiAccount.id, gymB.userId, { label: 'hijack' }),
    /not found/i
  );

  // --- Membership -> invoice ---------------------------------------------
  const plan = await billingService.createPlan(gymA.gymId, {
    planName: 'Quarterly',
    durationDays: 90,
    price: 3000,
  }, gymA.userId);

  const purchase = await billingService.purchaseMembership(
    gymA.gymId,
    memberA.id,
    { planId: plan.id, paymentAmount: 0 },
    gymA.userId
  );
  assert.equal(purchase.membership.status, 'PENDING_PAYMENT');
  const summary0 = await invoiceService.getMemberSummary(gymA.gymId, memberA.id);
  assert.equal(summary0.totalOutstandingMinor, 300000);
  assert.equal(summary0.openInvoices.length, 1);
  const invoiceId = summary0.openInvoices[0]!.id;

  // --- Payment request ----------------------------------------------------
  await assert.rejects(
    paymentIntentService.createAttempt(gymA.gymId, memberA.id, {
      invoiceId,
      amountMinor: 100000,
    }),
    /Partial payments/
  );
  const intent = await paymentIntentService.createAttempt(gymA.gymId, memberA.id, { invoiceId });
  assert.equal(intent.attempt.amountMinor, 300000);
  assert.match(intent.payment!.upiUri!, /^upi:\/\/pay\?/);
  assert.match(intent.payment!.upiUri!, /tr=GD-PAY-/);
  assert.match(intent.payment!.upiUri!, /am=3000\.00/);
  assert.match(intent.payment!.upiUri!, /[?&]pa=/);
  assert.match(intent.payment!.upiUri!, /[?&]cu=INR/);
  assert.match(intent.payment!.upiUri!, /[?&]pn=/);

  // --- Submission ---------------------------------------------------------
  await assert.rejects(
    reconciliationService.submit(gymA.gymId, memberA.id, intent.attempt.id, {
      utr: '!!',
      claimedAmountMinor: 300000,
    }),
    /UTR/
  );
  const submitted = await reconciliationService.submit(gymA.gymId, memberA.id, intent.attempt.id, {
    utr: '426812345678',
    claimedAmountMinor: 300000,
  });
  assert.equal(submitted.status, 'SUBMITTED');

  await assert.rejects(
    reconciliationService.submit(gymA.gymId, memberA.id, intent.attempt.id, {
      utr: '426812345678',
      claimedAmountMinor: 300000,
    }),
    /already/
  );

  // Member cannot self-verify
  await assert.rejects(
    reconciliationService.verify(gymA.gymId, intent.attempt.id, undefined, {}),
    /authenticated operator/
  );
  // Cross-tenant operator cannot verify
  await assert.rejects(
    reconciliationService.verify(gymB.gymId, intent.attempt.id, gymB.userId, {}),
    /not found/
  );

  const verified = await reconciliationService.verify(gymA.gymId, intent.attempt.id, gymA.userId, {
    note: 'Bank statement matched',
  });
  assert.equal(verified.status, 'VERIFIED');
  assert.equal(verified.invoice.status, 'PAID');
  assert.ok(verified.payment.id);
  assert.equal(verified.payment.amount, 3000);
  assert.ok(verified.receiptNumber.startsWith('REC-'));

  const after = await invoiceService.getMemberSummary(gymA.gymId, memberA.id);
  assert.equal(after.totalOutstandingMinor, 0);
  assert.equal(after.hasDues, false);

  await assert.rejects(
    reconciliationService.verify(gymA.gymId, intent.attempt.id, gymA.userId, {}),
    /already been verified/
  );

  // Pending amounts must not count as verified collections
  const revenue = await billingService.getFinancialDashboard(gymA.gymId);
  assert.equal(revenue.todayRevenue, 3000);

  // --- Partial payments ---------------------------------------------------
  await pool().query(
    `INSERT INTO gym_payment_settings (gym_id, allow_partial_payments) VALUES ($1, TRUE)
     ON CONFLICT (gym_id) DO UPDATE SET allow_partial_payments = TRUE`,
    [gymA.gymId]
  );
  const memberC = await seedMember(gymA.gymId, 'Chitra Menon');
  const p2 = await billingService.purchaseMembership(
    gymA.gymId,
    memberC.id,
    { planId: plan.id, paymentAmount: 0 },
    gymA.userId
  );
  const invC = (await invoiceService.getMemberSummary(gymA.gymId, memberC.id)).openInvoices[0]!;
  const partial = await paymentIntentService.createAttempt(gymA.gymId, memberC.id, {
    invoiceId: invC.id,
    amountMinor: 100000,
  });
  assert.equal(partial.attempt.amountMinor, 100000);
  await reconciliationService.submit(gymA.gymId, memberC.id, partial.attempt.id, {
    utr: 'UTR-PART-0001',
    claimedAmountMinor: 100000,
  });
  const partialVerified = await reconciliationService.verify(
    gymA.gymId,
    partial.attempt.id,
    gymA.userId,
    {}
  );
  assert.equal(partialVerified.invoice.status, 'PARTIALLY_PAID');
  assert.equal(partialVerified.membershipActivated, false);
  const summed = await invoiceService.getMemberSummary(gymA.gymId, memberC.id);
  assert.equal(summed.totalOutstandingMinor, 200000);
  const pendingMembership = (await pool().query(`SELECT status FROM member_memberships WHERE id = $1`, [p2.membership.id])).rows[0];
  assert.equal(pendingMembership.status, 'PENDING_PAYMENT');
  const pendingMember = (await pool().query(`SELECT expires_at FROM gym_members WHERE id = $1`, [memberC.id])).rows[0];
  assert.equal(pendingMember.expires_at, null);

  // --- Concurrent verification -------------------------------------------
  const memberD = await seedMember(gymA.gymId, 'Dev Sharma');
  await billingService.purchaseMembership(gymA.gymId, memberD.id, { planId: plan.id, paymentAmount: 0 }, gymA.userId);
  const invD = (await invoiceService.getMemberSummary(gymA.gymId, memberD.id)).openInvoices[0]!;
  const intentD = await paymentIntentService.createAttempt(gymA.gymId, memberD.id, { invoiceId: invD.id });
  await reconciliationService.submit(gymA.gymId, memberD.id, intentD.attempt.id, {
    utr: 'UTR-CONCURRENT-01',
    claimedAmountMinor: 300000,
  });
  const results = await Promise.allSettled([
    reconciliationService.verify(gymA.gymId, intentD.attempt.id, gymA.userId, {}),
    reconciliationService.verify(gymA.gymId, intentD.attempt.id, gymA.userId, {}),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1, 'exactly one concurrent verification must succeed');
  assert.equal(results.filter((r) => r.status === 'rejected').length, 1, 'the second must be rejected');
  const allocations = (await pool().query(
    `SELECT COUNT(*)::int AS c FROM payment_allocations WHERE gym_id = $1 AND invoice_id = $2`,
    [gymA.gymId, invD.id]
  )).rows[0];
  assert.equal(allocations.c, 1);

  // --- Rejection ----------------------------------------------------------
  const memberE = await seedMember(gymA.gymId, 'Esha Iyer');
  await billingService.purchaseMembership(gymA.gymId, memberE.id, { planId: plan.id, paymentAmount: 0 }, gymA.userId);
  const invE = (await invoiceService.getMemberSummary(gymA.gymId, memberE.id)).openInvoices[0]!;
  const intentE = await paymentIntentService.createAttempt(gymA.gymId, memberE.id, { invoiceId: invE.id });
  await reconciliationService.submit(gymA.gymId, memberE.id, intentE.attempt.id, {
    utr: 'UTR-REJECT-0001',
    claimedAmountMinor: 300000,
  });
  await assert.rejects(
    reconciliationService.reject(gymA.gymId, intentE.attempt.id, gymA.userId, ''),
    /reason/
  );
  const rejected = await reconciliationService.reject(
    gymA.gymId,
    intentE.attempt.id,
    gymA.userId,
    'Screenshot does not match bank statement'
  );
  assert.equal(rejected.status, 'REJECTED');
  await assert.rejects(
    reconciliationService.verify(gymA.gymId, intentE.attempt.id, gymA.userId, {}),
    /not in a verifiable state/
  );
  const noAlloc = (await pool().query(
    `SELECT COUNT(*)::int AS c FROM payment_allocations WHERE gym_id = $1 AND invoice_id = $2`,
    [gymA.gymId, invE.id]
  )).rows[0];
  assert.equal(noAlloc.c, 0, 'rejected payments must not create allocations');

  console.log('✅ Payments V2 test matrix passed');
}

run()
  .then(async () => {
    await closeDatabasePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Payments V2 test matrix failed:', err);
    try {
      await closeDatabasePool();
    } catch {}
    process.exit(1);
  });





