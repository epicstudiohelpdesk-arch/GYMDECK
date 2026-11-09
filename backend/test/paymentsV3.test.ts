import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { getDatabasePool } from '../shared/database';
import { paymentAccountService } from '../services/payments/accountService';
import { AppError } from '../shared/errors';

async function seedV3Tenant(name: string) {
  const pool = getDatabasePool();
  const gymId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO gyms (id, name, code, status)
     VALUES ($1, $2, $3, 'ACTIVE')`,
    [gymId, name, `V3-${Date.now().toString().slice(-4)}-${Math.random().toString(36).slice(2, 6)}`]
  );

  await pool.query(
    `INSERT INTO users (id, gym_id, email, password_hash, full_name, role, account_status)
     VALUES ($1, $2, $3, 'hashed_pass', 'Owner Admin', 'OWNER', 'ACTIVE')`,
    [ownerId, gymId, `owner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@gymdeck.test`]
  );
  return { gymId, userId: ownerId };
}

async function runPaymentsV3TestSuite() {
  console.log('================================================================');
  console.log('GYMDECK PAYMENTS V3: TEST SUITE EXECUTION');
  console.log('================================================================');

  const tenantA = await seedV3Tenant('Iron Pulse V3 Flagship');
  const tenantB = await seedV3Tenant('Rival Fitness V3');

  // 1. GATE 4: INDEPENDENT UPI-ONLY CONFIGURATION
  console.log('\n--- 1. Testing Standalone UPI-Only Configuration ---');
  const upiOnly = await paymentAccountService.createAccount(tenantA.gymId, tenantA.userId, {
    method: 'UPI',
    beneficiaryName: 'Iron Pulse Fitness',
    upiVpa: 'ironpulse.merchant@okhdfcbank',
    isPrimary: true
  });

  assert.equal(upiOnly.method, 'UPI', 'Method must be UPI');
  assert.equal(upiOnly.upiVpa, 'ironpulse.merchant@okhdfcbank', 'UPI VPA must match');
  assert.equal(upiOnly.accountNumberMasked, null, 'UPI-only must NOT have bank account');
  assert.equal(upiOnly.ifscCode, null, 'UPI-only must NOT have IFSC');
  assert.equal(upiOnly.status, 'UNVERIFIED', 'Newly added UPI must be UNVERIFIED');
  console.log('✅ Standalone UPI-only account successfully created and persisted without bank details.');

  // 2. GATE 4: INDEPENDENT BANK-ONLY CONFIGURATION
  console.log('\n--- 2. Testing Standalone Bank-Only Configuration ---');
  const bankOnly = await paymentAccountService.createAccount(tenantA.gymId, tenantA.userId, {
    method: 'BANK_TRANSFER',
    beneficiaryName: 'Iron Pulse Fitness Club LLP',
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
    confirmAccountNumber: '50200012345678',
    ifscCode: 'HDFC0000240',
    branchName: 'Fort Commercial Branch',
    branchCity: 'Mumbai',
    isPrimary: true
  });

  assert.equal(bankOnly.method, 'BANK_TRANSFER', 'Method must be BANK_TRANSFER');
  assert.equal(bankOnly.upiVpa, null, 'Bank-only must NOT have UPI VPA');
  assert.equal(bankOnly.accountNumberMasked, '•••• •••• 5678', 'Bank account must be masked in DTO');
  assert.equal(bankOnly.ifscCode, 'HDFC0000240', 'IFSC must match');
  assert.equal(bankOnly.status, 'UNVERIFIED', 'Newly added Bank must be UNVERIFIED');
  console.log('✅ Standalone Bank-only account successfully created and persisted without UPI VPA.');

  // 3. COMBINED BANK + UPI CONFIGURATION
  console.log('\n--- 3. Testing Combined Bank + UPI Configuration ---');
  const combined = await paymentAccountService.createAccount(tenantA.gymId, tenantA.userId, {
    method: 'BANK_TRANSFER',
    beneficiaryName: 'Iron Pulse Multi-Rail',
    bankName: 'ICICI Bank',
    accountNumber: '001105001234',
    confirmAccountNumber: '001105001234',
    ifscCode: 'ICIC0000011',
    branchName: 'Nariman Point',
    branchCity: 'Mumbai',
    upiVpa: 'ironpulse.nariman@icici',
    isPrimary: false
  });

  assert.equal(combined.method, 'BANK_TRANSFER', 'Method must be BANK_TRANSFER');
  assert.equal(combined.upiVpa, 'ironpulse.nariman@icici', 'Combined must store valid UPI VPA');
  assert.equal(combined.accountNumberMasked, '•••• •••• 1234', 'Combined must store masked bank account');
  console.log('✅ Combined Bank + UPI account successfully created with both rails active.');

  // 4. RETRIEVAL & DIRECTORY LISTING
  console.log('\n--- 4. Testing Directory Retrieval & Statuses ---');
  const allAccounts = await paymentAccountService.listAccounts(tenantA.gymId);
  assert.equal(allAccounts.length, 3, 'Tenant A must have exactly 3 accounts');
  const upiInList = allAccounts.find(a => a.id === upiOnly.id);
  const bankInList = allAccounts.find(a => a.id === bankOnly.id);
  const combinedInList = allAccounts.find(a => a.id === combined.id);
  assert(upiInList && bankInList && combinedInList, 'All accounts must be listed');
  console.log('✅ Directory lists all modular accounts with uncompromised integrity.');

  // 5. MEMBER-FACING CONFIGURATION ISOLATION (GATE 7)
  console.log('\n--- 5. Testing Member-Facing API Privacy Isolation ---');
  const memberConfig = await paymentAccountService.getMemberFacingConfig(tenantA.gymId);
  assert(memberConfig.upi, 'Member config must return primary UPI');
  assert.equal(memberConfig.receivingMode, 'UPI', 'Receiving mode must be UPI');
  assert.equal(memberConfig.upi.vpa, 'ironpulse.merchant@okhdfcbank', 'Member config must return active UPI VPA');
  assert(memberConfig.bank, 'Member config must return direct bank option');
  assert.equal(memberConfig.bank.accountNumberMasked, '•••• •••• 5678', 'Member must only receive masked last 4');
  assert.equal((memberConfig as any).bank.accountNumberEnc, undefined, 'Ciphertext must NEVER leak to members');
  assert.equal((memberConfig as any).bank.accountNumber, undefined, 'Plaintext account must NEVER leak to members');
  console.log('✅ Member-facing API strictly sanitizes coordinates and prevents credential leakage.');

  // 6. MULTI-TENANT ISOLATION (GATE 8)
  console.log('\n--- 6. Testing Multi-Tenant Boundary Enforcement ---');
  await assert.rejects(
    paymentAccountService.updateAccount(tenantB.gymId, upiOnly.id, tenantB.userId, { beneficiaryName: 'Malicious Hijack' }),
    AppError,
    'Tenant B must be strictly forbidden from updating Tenant A accounts'
  );
  console.log('✅ Cross-tenant account access strictly rejected by database boundary.');

  // 7. EDITING & STANDALONE INTEGRITY PRESERVATION
  console.log('\n--- 7. Testing Independent Account Updates ---');
  const updatedUpi = await paymentAccountService.updateAccount(tenantA.gymId, upiOnly.id, tenantA.userId, {
    upiVpa: 'ironpulse.updated@okhdfcbank',
    beneficiaryName: 'Iron Pulse Renamed'
  });
  assert.equal(updatedUpi.upiVpa, 'ironpulse.updated@okhdfcbank', 'UPI VPA must be updated');
  assert.equal(updatedUpi.beneficiaryName, 'Iron Pulse Renamed', 'Beneficiary name must be updated');
  assert.equal(updatedUpi.accountNumberMasked, null, 'Updating UPI must NOT create spurious bank account');
  console.log('✅ Updating UPI-only account preserved its standalone nature.');

  console.log('\n================================================================');
  console.log('ALL PAYMENTS V3 TESTS PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

runPaymentsV3TestSuite()
  .then(async () => {
    const pool = getDatabasePool();
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Test failure:', err);
    const pool = getDatabasePool();
    await pool.end();
    process.exit(1);
  });
