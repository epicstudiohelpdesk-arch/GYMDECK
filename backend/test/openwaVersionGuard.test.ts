import assert from 'node:assert/strict';
import { assertOpenwaCompatible, MIN_OPENWA_VERSION } from '../services/whatsapp/openwaClient';

console.log('🧪 OpenWA version compatibility guard');
assert.equal(MIN_OPENWA_VERSION, '0.30.3');
assert.doesNotThrow(() => assertOpenwaCompatible('0.30.3'));
assert.doesNotThrow(() => assertOpenwaCompatible('v0.30.3'));
assert.doesNotThrow(() => assertOpenwaCompatible('0.31.0'));
assert.throws(() => assertOpenwaCompatible('0.30.2'), /incompatible/);
assert.throws(() => assertOpenwaCompatible('0.29.9'), /incompatible/);
console.log('✅ OpenWA version guard: 5/5 assertions passed');
