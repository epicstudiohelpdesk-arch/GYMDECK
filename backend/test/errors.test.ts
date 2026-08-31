/**
 * GymDeck Cloud Backend - Error Normalization Test
 */

import { AppError } from '../shared/errors';

async function runErrorTest() {
  console.log('🧪 Running Error Hierarchy Validation Test...');

  const valErr = AppError.validation('Field required', { email: ['Must be a valid email'] });
  if (valErr.statusCode !== 422 || valErr.domain !== 'VALIDATION_ERROR') {
    throw new Error('❌ Validation error status or domain mismatch');
  }

  const unauthErr = AppError.unauthorized();
  if (unauthErr.statusCode !== 401 || unauthErr.domain !== 'UNAUTHORIZED') {
    throw new Error('❌ Unauthorized error status mismatch');
  }

  const notFoundErr = AppError.notFound();
  if (notFoundErr.statusCode !== 404 || notFoundErr.domain !== 'NOT_FOUND') {
    throw new Error('❌ Not found error status mismatch');
  }

  console.log('✅ Error hierarchy validated: Status codes and domain categories conform to API specification.');
}

runErrorTest().catch((err) => {
  console.error('❌ Error Test Failed:', err);
  process.exit(1);
});
