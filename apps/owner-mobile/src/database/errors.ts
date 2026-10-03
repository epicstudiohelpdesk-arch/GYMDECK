/**
 * GymDeck Owner Mobile - Database Error Hierarchy
 *
 * Provides explicit, typed error boundaries for the local encrypted database foundation.
 * Ensures security failures, tenant mismatches, and migration errors are reported explicitly
 * WITHOUT leaking cryptographic key material or plaintext secrets.
 */

export class DatabaseError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'DATABASE_ERROR') {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TenantMismatchError extends DatabaseError {
  public readonly expectedGymId: string;
  public readonly foundGymId: string;

  constructor(expectedGymId: string, foundGymId: string) {
    super(
      `Tenant mismatch detected in local database vault! Expected gym '${expectedGymId}' but found '${foundGymId}'. Database operation aborted to protect tenant isolation.`,
      'TENANT_MISMATCH'
    );
    this.name = 'TenantMismatchError';
    this.expectedGymId = expectedGymId;
    this.foundGymId = foundGymId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MigrationError extends DatabaseError {
  public readonly version: number;
  public readonly migrationName: string;

  constructor(version: number, migrationName: string, causeMessage: string) {
    super(
      `Failed to apply migration ${version} (${migrationName}): ${causeMessage}`,
      'MIGRATION_FAILED'
    );
    this.name = 'MigrationError';
    this.version = version;
    this.migrationName = migrationName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatabaseKeyError extends DatabaseError {
  constructor(message: string) {
    super(`Encryption key lifecycle error: ${message}`, 'DATABASE_KEY_ERROR');
    this.name = 'DatabaseKeyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DatabaseNotInitializedError extends DatabaseError {
  constructor() {
    super('Database has not been initialized. Call initializeLocalDatabase() first.', 'DATABASE_NOT_INITIALIZED');
    this.name = 'DatabaseNotInitializedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
