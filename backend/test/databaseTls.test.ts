import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveDatabaseSsl } from '../shared/database';

console.log('🧪 Database TLS policy');
assert.equal(resolveDatabaseSsl({ NODE_ENV: 'development' }), false);
assert.throws(() => resolveDatabaseSsl({ NODE_ENV: 'production' }), /DATABASE_SSL_CA/);
assert.throws(() => resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'disable' }), /DATABASE_SSL_MODE/);
assert.throws(() => resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'verify' }), /DATABASE_SSL_CA/);
assert.throws(
  () => resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'bogus', DATABASE_SSL_CA: '/unused' }),
  /DATABASE_SSL_MODE must be one of/
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gymdeck-tls-'));
const ca = path.join(dir, 'ca.pem');
const key = path.join(dir, 'ca.key');
const bad = path.join(dir, 'bad.pem');
fs.writeFileSync(bad, 'NOT A CERTIFICATE');
try {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', ca, '-days', '1', '-subj', '/CN=GymDeck-Test-CA'], { stdio: 'ignore' });
  fs.chmodSync(ca, 0o600);

  const ssl = resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'verify', DATABASE_SSL_CA: ca }) as any;
  assert.equal(ssl.rejectUnauthorized, true);
  assert.match(ssl.ca, /BEGIN CERTIFICATE/);

  assert.throws(
    () => resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'verify', DATABASE_SSL_CA: bad }),
    /does not contain a PEM certificate/
  );

  fs.chmodSync(ca, 0o000);
  assert.throws(
    () => resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'verify', DATABASE_SSL_CA: ca }),
    /not readable/
  );

  fs.chmodSync(ca, 0o666);
  assert.throws(
    () => resolveDatabaseSsl({ NODE_ENV: 'production', DATABASE_SSL_MODE: 'verify', DATABASE_SSL_CA: ca }),
    /group\/world writable/
  );
} finally {
  fs.chmodSync(ca, 0o600);
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log('✅ Database TLS policy: 9 assertions passed');
