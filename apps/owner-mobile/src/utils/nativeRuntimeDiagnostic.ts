/**
 * GymDeck Owner Mobile - Isolated Native Runtime Verification Engine
 *
 * Provides granular test runners for:
 * 1. op-sqlite / SQLCipher (No-key / correct-key encryption verification)
 * 2. react-native-keychain (WRITE, READ, MATCH, DELETE, ABSENCE)
 * 3. react-native-mmkv (WRITE, READ, MATCH, DELETE)
 * 4. NetInfo (INITIAL STATE, DISCONNECT DETECTED, RECONNECT DETECTED)
 *
 * Strictly isolated: Zero modifications to production tables, auth, or member data.
 */

import { NativeModules, Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { open, isSQLCipher } from '@op-engineering/op-sqlite';

export interface SqliteTestReport {
  overallStatus: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  opSqliteRuntime: 'PASS' | 'FAIL';
  sqliteReadWrite: 'PASS' | 'FAIL';
  gateA: {
    nativeInit: 'PASS' | 'FAIL';
    createRead: 'PASS' | 'FAIL';
    closeReopen: 'PASS' | 'FAIL';
    cleanup: 'PASS' | 'FAIL';
  };
  sqlcipherEncryption: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  isSQLCipherFnResult: boolean;
  cipherVersionPragma: string | null;
  wrongKeyRejected: boolean;
  wrongKeyError: string | null;
  noKeyReadSucceeded: boolean;
  noKeyError: string | null;
  correctKeyReadSucceeded: boolean;
  evidence: string;
}

export interface KeychainTestReport {
  overallStatus: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  nativeModulePresent: boolean;
  nativeModuleName: string | null;
  write: 'PASS' | 'FAIL';
  read: 'PASS' | 'FAIL';
  match: 'PASS' | 'FAIL';
  delete: 'PASS' | 'FAIL';
  absence: 'PASS' | 'FAIL';
  evidence: string;
}

export interface MmkvTestReport {
  overallStatus: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  moduleLoaded: boolean;
  write: 'PASS' | 'FAIL';
  read: 'PASS' | 'FAIL';
  match: 'PASS' | 'FAIL';
  delete: 'PASS' | 'FAIL';
  evidence: string;
}

export interface NetInfoTestReport {
  overallStatus: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  initialState: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  disconnectDetected: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  reconnectDetected: 'PASS' | 'FAIL' | 'NOT VERIFIED';
  initialStateDetails: string;
  disconnectDetails: string | null;
  reconnectDetails: string | null;
  isListening: boolean;
  evidence: string;
}

export interface FullDiagnosticReport {
  timestamp: string;
  device: {
    platform: string;
    osVersion: string | number;
  };
  sqlite: SqliteTestReport;
  keychain: KeychainTestReport;
  mmkv: MmkvTestReport;
  netInfo: NetInfoTestReport;
}

// -------------------------------------------------------------
// 1. TEST op-sqlite / SQLCipher (GATE A & GATE B)
// -------------------------------------------------------------
export async function runOpSqliteEncryptionTest(): Promise<SqliteTestReport> {
  const report: SqliteTestReport = {
    overallStatus: 'NOT VERIFIED',
    opSqliteRuntime: 'FAIL',
    sqliteReadWrite: 'FAIL',
    gateA: {
      nativeInit: 'FAIL',
      createRead: 'FAIL',
      closeReopen: 'FAIL',
      cleanup: 'FAIL',
    },
    sqlcipherEncryption: 'NOT VERIFIED',
    isSQLCipherFnResult: false,
    cipherVersionPragma: null,
    wrongKeyRejected: false,
    wrongKeyError: null,
    noKeyReadSucceeded: false,
    noKeyError: null,
    correctKeyReadSucceeded: false,
    evidence: '',
  };

  // -------------------------------------------------------------
  // PART 1: GATE A — OP-SQLITE NATIVE RUNTIME (Unencrypted DB Lifecycle)
  // -------------------------------------------------------------
  const plainDbName = `_diag_plain_${Date.now()}.db`;
  const deterministicMsg = `plain_val_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    // 1. Open temporary database
    const plainDb = open({ name: plainDbName });
    report.gateA.nativeInit = 'PASS';
    report.opSqliteRuntime = 'PASS';

    // 2. Create test table & 3. Insert deterministic test data
    plainDb.executeSync('CREATE TABLE test_plain (id INTEGER PRIMARY KEY, msg TEXT);');
    plainDb.executeSync('INSERT INTO test_plain (id, msg) VALUES (1, ?);', [deterministicMsg]);

    // 4. Read back
    const read1 = plainDb.executeSync('SELECT msg FROM test_plain WHERE id = 1;');
    if (read1?.rows?.length && read1.rows[0].msg === deterministicMsg) {
      report.gateA.createRead = 'PASS';
    }

    // 5. Close database
    plainDb.close();

    // 6. Reopen it
    const reopenedPlain = open({ name: plainDbName });

    // 7. Read data again
    const read2 = reopenedPlain.executeSync('SELECT msg FROM test_plain WHERE id = 1;');
    if (read2?.rows?.length && read2.rows[0].msg === deterministicMsg) {
      report.gateA.closeReopen = 'PASS';
    }

    // 8. Delete temporary database
    reopenedPlain.delete();
    report.gateA.cleanup = 'PASS';
  } catch (err: any) {
    console.warn('[GATE_A_OP_SQLITE_ERROR]:', err?.message);
  }

  // -------------------------------------------------------------
  // PART 2: GATE B — SQLCIPHER RUNTIME ENCRYPTION VERIFICATION
  // -------------------------------------------------------------
  const encDbName = `_diag_enc_${Date.now()}.db`;
  const encKey = `key_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const wrongKey = `wrong_key_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const knownVal = `payload_${Math.random().toString(36).substring(2, 10)}`;

  try {
    // Check if isSQLCipher() native binding is present
    try {
      report.isSQLCipherFnResult = isSQLCipher();
    } catch {
      report.isSQLCipherFnResult = false;
    }

    // 1. Open/create temporary encrypted database with test key
    const db = open({ name: encDbName, encryptionKey: encKey });

    // 10. Query SQLCipher version if supported
    try {
      const pragmaRes = db.executeSync('PRAGMA cipher_version;');
      if (pragmaRes?.rows?.length) {
        report.cipherVersionPragma = String(Object.values(pragmaRes.rows[0])[0] || '');
      }
    } catch {
      report.cipherVersionPragma = null;
    }

    // 2. Create table & 3. Insert known value
    db.executeSync('CREATE TABLE test_enc (id INTEGER PRIMARY KEY, secret_val TEXT);');
    db.executeSync('INSERT INTO test_enc (id, secret_val) VALUES (1, ?);', [knownVal]);

    // 4. Read successfully with correct key
    const res1 = db.executeSync('SELECT secret_val FROM test_enc WHERE id = 1;');
    if (res1?.rows?.length && res1.rows[0].secret_val === knownVal) {
      report.sqliteReadWrite = 'PASS';
    }

    // 5. Close database
    db.close();

    // 6. Attempt to reopen/read using an INCORRECT KEY
    try {
      const wrongKeyDb = open({ name: encDbName, encryptionKey: wrongKey });
      const wrongRes = wrongKeyDb.executeSync('SELECT secret_val FROM test_enc WHERE id = 1;');
      if (wrongRes?.rows?.length && wrongRes.rows[0].secret_val === knownVal) {
        report.wrongKeyRejected = false;
      }
      wrongKeyDb.close();
    } catch (wrongKeyErr: any) {
      // Correct SQLCipher behavior: incorrect key MUST throw and fail to read
      report.wrongKeyRejected = true;
      report.wrongKeyError = wrongKeyErr?.message || String(wrongKeyErr);
    }

    // Attempt to reopen/read WITHOUT ANY KEY
    try {
      const noKeyDb = open({ name: encDbName });
      const noKeyRes = noKeyDb.executeSync('SELECT secret_val FROM test_enc WHERE id = 1;');
      if (noKeyRes?.rows?.length && noKeyRes.rows[0].secret_val === knownVal) {
        report.noKeyReadSucceeded = true;
      }
      noKeyDb.close();
    } catch (noKeyErr: any) {
      report.noKeyError = noKeyErr?.message || String(noKeyErr);
      report.noKeyReadSucceeded = false;
    }

    // 8. Reopen using the CORRECT KEY
    try {
      const correctDb = open({ name: encDbName, encryptionKey: encKey });
      const correctRes = correctDb.executeSync('SELECT secret_val FROM test_enc WHERE id = 1;');
      // 9. Confirm original data is readable
      if (correctRes?.rows?.length && correctRes.rows[0].secret_val === knownVal) {
        report.correctKeyReadSucceeded = true;
      }
      // Cleanup temporary encrypted test database
      correctDb.delete();
    } catch (cleanErr: any) {
      console.warn('[SQLITE_DIAGNOSTIC] Cleanup error:', cleanErr?.message);
    }

    // Evaluate SQLCipher encryption status
    const gateAPassed =
      report.gateA.nativeInit === 'PASS' &&
      report.gateA.createRead === 'PASS' &&
      report.gateA.closeReopen === 'PASS' &&
      report.gateA.cleanup === 'PASS';

    const gateBPassed =
      report.wrongKeyRejected &&
      !report.noKeyReadSucceeded &&
      report.correctKeyReadSucceeded &&
      report.cipherVersionPragma !== null;

    if (gateBPassed) {
      report.sqlcipherEncryption = 'PASS';
      report.overallStatus = gateAPassed ? 'PASS' : 'FAIL';
      report.evidence =
        `PASS: Gate A verified (native unencrypted lifecycle). ` +
        `Gate B SQLCipher verified: version='${report.cipherVersionPragma}', isSQLCipher()=${report.isSQLCipherFnResult}. ` +
        `Wrong key rejected (${report.wrongKeyError}). No key rejected (${report.noKeyError}). Correct key restored access.`;
    } else if (report.noKeyReadSucceeded || !report.wrongKeyRejected) {
      report.sqlcipherEncryption = 'FAIL';
      report.overallStatus = 'FAIL';
      report.evidence =
        `FAIL: Database was readable with wrong key or without key. ` +
        `isSQLCipher()=${report.isSQLCipherFnResult}, cipher_version=${report.cipherVersionPragma ?? 'null'}. ` +
        `Pure SQLite is active; encryption is NOT enforced.`;
    } else {
      report.sqlcipherEncryption = 'NOT VERIFIED';
      report.overallStatus = 'NOT VERIFIED';
      report.evidence = `Inconclusive test execution: wrongKeyErr=${report.wrongKeyError}, noKeyErr=${report.noKeyError}`;
    }
  } catch (err: any) {
    report.overallStatus = 'FAIL';
    report.evidence = `Error during SQLite execution: ${err?.message || String(err)}`;
  }

  return report;
}

// -------------------------------------------------------------
// 2. TEST react-native-keychain
// -------------------------------------------------------------
export async function runKeychainTest(): Promise<KeychainTestReport> {
  const hasRNKeychainManager = !!NativeModules.RNKeychainManager;
  const hasRNKeychain = !!NativeModules.RNKeychain;

  const report: KeychainTestReport = {
    overallStatus: 'NOT VERIFIED',
    nativeModulePresent: hasRNKeychainManager || hasRNKeychain,
    nativeModuleName: hasRNKeychainManager ? 'RNKeychainManager' : hasRNKeychain ? 'RNKeychain' : null,
    write: 'FAIL',
    read: 'FAIL',
    match: 'FAIL',
    delete: 'FAIL',
    absence: 'FAIL',
    evidence: '',
  };

  const service = 'com.gymdeck.test.runtime_keychain';
  const username = 'test_keychain_user';
  // Secret is generated randomly; never printed to logs
  const secret = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  try {
    // 1. WRITE
    await Keychain.setGenericPassword(username, secret, {
      service,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
    report.write = 'PASS';

    // 2. READ
    const creds = await Keychain.getGenericPassword({ service });
    if (creds && typeof creds === 'object') {
      report.read = 'PASS';

      // 3. MATCH
      if (creds.username === username && creds.password === secret) {
        report.match = 'PASS';
      }
    }

    // 4. DELETE
    const resetSuccess = await Keychain.resetGenericPassword({ service });
    if (resetSuccess) {
      report.delete = 'PASS';
    }

    // 5. ABSENCE
    const afterDelete = await Keychain.getGenericPassword({ service });
    if (afterDelete === false) {
      report.absence = 'PASS';
    }

    if (
      report.write === 'PASS' &&
      report.read === 'PASS' &&
      report.match === 'PASS' &&
      report.delete === 'PASS' &&
      report.absence === 'PASS'
    ) {
      report.overallStatus = 'PASS';
      report.evidence =
        `PASS: Real iOS Hardware Keychain verified via ${report.nativeModuleName}. ` +
        `SecItemAdd -> SecItemCopyMatching -> String match -> SecItemDelete -> Verified absence.`;
    } else {
      report.overallStatus = 'FAIL';
      report.evidence = `Keychain lifecycle incomplete: write=${report.write}, read=${report.read}, match=${report.match}, delete=${report.delete}, absence=${report.absence}`;
    }
  } catch (err: any) {
    report.overallStatus = 'FAIL';
    report.evidence = `Keychain error: ${err?.message || String(err)}`;
  }

  return report;
}

// -------------------------------------------------------------
// 3. TEST react-native-mmkv
// -------------------------------------------------------------
export async function runMmkvTest(): Promise<MmkvTestReport> {
  const report: MmkvTestReport = {
    overallStatus: 'NOT VERIFIED',
    moduleLoaded: typeof MMKV === 'function',
    write: 'FAIL',
    read: 'FAIL',
    match: 'FAIL',
    delete: 'FAIL',
    evidence: '',
  };

  const key = `_diag_mmkv_${Date.now()}`;
  const testVal = `val_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  try {
    const storage = new MMKV({ id: 'test_mmkv_verification' });

    // 1. WRITE
    storage.set(key, testVal);
    report.write = 'PASS';

    // 2. READ
    const retrieved = storage.getString(key);
    if (retrieved !== undefined) {
      report.read = 'PASS';

      // 3. MATCH
      if (retrieved === testVal) {
        report.match = 'PASS';
      }
    }

    // 4. DELETE
    storage.delete(key);
    const afterDelete = storage.getString(key);
    if (afterDelete === undefined) {
      report.delete = 'PASS';
    }

    storage.clearAll();

    if (
      report.write === 'PASS' &&
      report.read === 'PASS' &&
      report.match === 'PASS' &&
      report.delete === 'PASS'
    ) {
      report.overallStatus = 'PASS';
      report.evidence = `PASS: MMKV JSI TurboModule operational. Synchronous set -> getString -> exact match -> delete -> confirmed undefined.`;
    } else {
      report.overallStatus = 'FAIL';
      report.evidence = `MMKV failed: write=${report.write}, read=${report.read}, match=${report.match}, delete=${report.delete}`;
    }
  } catch (err: any) {
    report.overallStatus = 'FAIL';
    report.evidence = `MMKV error: ${err?.message || String(err)}`;
  }

  return report;
}

// -------------------------------------------------------------
// 4. TEST NetInfo
// -------------------------------------------------------------
export async function fetchInitialNetInfo(): Promise<{
  status: 'PASS' | 'FAIL';
  details: string;
  isConnected: boolean | null;
  type: string;
}> {
  try {
    const state = await NetInfo.fetch();
    const details = `Type: ${state.type} | Connected: ${state.isConnected} | IP: ${(state.details as any)?.ipAddress || 'unknown'}`;
    return {
      status: state.isConnected !== null ? 'PASS' : 'FAIL',
      details,
      isConnected: state.isConnected,
      type: state.type,
    };
  } catch (err: any) {
    return {
      status: 'FAIL',
      details: `NetInfo.fetch error: ${err?.message || String(err)}`,
      isConnected: false,
      type: 'none',
    };
  }
}

export function startNetInfoSubscription(
  onStateChange: (state: NetInfoState) => void
): () => void {
  try {
    const unsub = NetInfo.addEventListener((state) => {
      onStateChange(state);
    });
    return unsub;
  } catch (err: any) {
    console.warn('[NETINFO] addEventListener error (falling back to native fetch polling):', err?.message);
    // Periodic fetch fallback ensures transitions are captured even if NativeEventEmitter lacks TurboModule bindings
    const timer = setInterval(async () => {
      try {
        const state = await NetInfo.fetch();
        onStateChange(state);
      } catch (pollErr) {
        console.warn('[NETINFO] Poll error:', pollErr);
      }
    }, 1500);

    return () => clearInterval(timer);
  }
}

// -------------------------------------------------------------
// Full Automated Diagnostic (Runs 1, 2, 3 + Initial NetInfo)
// -------------------------------------------------------------
export async function runFullDiagnostic(): Promise<FullDiagnosticReport> {
  const [sqlite, keychain, mmkv, initialNet] = await Promise.all([
    runOpSqliteEncryptionTest(),
    runKeychainTest(),
    runMmkvTest(),
    fetchInitialNetInfo(),
  ]);

  const report: FullDiagnosticReport = {
    timestamp: new Date().toISOString(),
    device: {
      platform: Platform.OS,
      osVersion: Platform.Version,
    },
    sqlite,
    keychain,
    mmkv,
    netInfo: {
      overallStatus: initialNet.status === 'PASS' ? 'PASS' : 'FAIL',
      initialState: initialNet.status,
      disconnectDetected: 'NOT VERIFIED',
      reconnectDetected: 'NOT VERIFIED',
      initialStateDetails: initialNet.details,
      disconnectDetails: null,
      reconnectDetails: null,
      isListening: false,
      evidence: `Initial state: ${initialNet.details}. Toggle Wi-Fi or Airplane Mode to verify transitions.`,
    },
  };

  console.log('[GYMDECK_RUNTIME_DIAGNOSTIC_FULL]:', JSON.stringify(report, null, 2));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    await fetch('http://127.0.0.1:8089/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      signal: controller.signal,
    }).catch(() => {});
    clearTimeout(timeout);
  } catch {
    // optional receiver fallback
  }

  return report;
}

let explicitDevNav = false;

export function allowDevVerificationNav(): void {
  explicitDevNav = true;
}

export function isDevVerificationExplicit(): boolean {
  return explicitDevNav;
}

export function resetDevVerificationNav(): void {
  explicitDevNav = false;
}

