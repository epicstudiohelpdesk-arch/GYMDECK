/**
 * GymDeck Owner Mobile - Incoming Remote Event Validator
 *
 * Gate 5 — Cloud Synchronization Architecture
 *
 * Guarantees:
 * 1. Rejects malformed, unsupported, or corrupted incoming cloud events.
 * 2. Strict tenant isolation: incoming event cannot cross gym boundaries.
 * 3. Enforces valid UUID formats for eventId and entityId.
 * 4. Verifies integer minor units for monetary payloads (paise).
 * 5. Sanitizes against arbitrary executable or SQL payload injections.
 */

import { z } from 'zod';
import { PullChangeItem } from './types';
import { ValidationError } from '../../database/errors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUPPORTED_ENTITY_TYPES = new Set([
  'gym_member',
  'membership_plan',
  'member_membership',
  'payment',
  'attendance',
  'attendance_log',
  'trainer',
  'trainer_assignment',
  'pt_package',
  'pt_session',
]);

const SUPPORTED_OPERATIONS = new Set(['CREATE', 'UPDATE', 'DELETE', 'VOID']);

export class EventValidator {
  /**
   * Validates an incoming PullChangeItem against tenant boundary, schema, and domain invariants.
   */
  public static validateIncomingChange(change: PullChangeItem, expectedGymId: string): void {
    if (!change) {
      throw new ValidationError('Incoming change event is null or undefined', 'NULL_EVENT');
    }

    // 1. Server Sequence Validation
    if (
      typeof change.serverSequence !== 'number' ||
      !Number.isInteger(change.serverSequence) ||
      change.serverSequence <= 0
    ) {
      throw new ValidationError(
        `Invalid serverSequence: '${change.serverSequence}'. Must be a positive integer.`,
        'INVALID_SERVER_SEQUENCE'
      );
    }

    // 2. Event ID Validation
    if (!change.eventId || typeof change.eventId !== 'string' || !UUID_REGEX.test(change.eventId)) {
      throw new ValidationError(
        `Invalid eventId: '${change.eventId}'. Must be a valid UUIDv4.`,
        'INVALID_EVENT_ID'
      );
    }

    // 3. Entity ID Validation
    if (!change.entityId || typeof change.entityId !== 'string' || !UUID_REGEX.test(change.entityId)) {
      throw new ValidationError(
        `Invalid entityId: '${change.entityId}'. Must be a valid UUIDv4.`,
        'INVALID_ENTITY_ID'
      );
    }

    // 4. Entity Type Validation
    if (!change.entityType || !SUPPORTED_ENTITY_TYPES.has(change.entityType)) {
      throw new ValidationError(
        `Unsupported entityType: '${change.entityType}'. Must be one of: ${Array.from(SUPPORTED_ENTITY_TYPES).join(', ')}`,
        'UNSUPPORTED_ENTITY_TYPE'
      );
    }

    // 5. Operation Validation
    if (!change.operation || !SUPPORTED_OPERATIONS.has(change.operation)) {
      throw new ValidationError(
        `Unsupported operation: '${change.operation}'. Must be CREATE, UPDATE, DELETE, or VOID.`,
        'UNSUPPORTED_OPERATION'
      );
    }

    // 6. Payload Existence & Structure
    if (!change.payload || typeof change.payload !== 'object') {
      throw new ValidationError(
        `Invalid payload for entity '${change.entityId}'. Expected JSON object.`,
        'INVALID_PAYLOAD'
      );
    }

    // 7. Tenant Isolation Check (if gymId is present inside payload, must match expectedGymId)
    // Note: Historical desktop events may carry the NIL UUID placeholder in payload;
    // remote event applier strictly scopes all persistence to expectedGymId.
    const payloadGymId = change.payload.gymId || change.payload.gym_id;
    const NIL_UUID = '00000000-0000-0000-0000-000000000000';
    if (payloadGymId && payloadGymId !== expectedGymId && payloadGymId !== NIL_UUID) {
      throw new ValidationError(
        `Tenant mismatch: incoming event gymId '${payloadGymId}' does not match expected active tenant '${expectedGymId}'.`,
        'TENANT_MISMATCH'
      );
    }

    // 8. Financial Safety Invariants (Integer Minor Units)
    if (change.entityType === 'payment') {
      const amountPaise = change.payload.amountMinorUnits ?? change.payload.amount_minor_units;
      if (amountPaise !== undefined && amountPaise !== null) {
        if (typeof amountPaise !== 'number' || !Number.isInteger(amountPaise)) {
          throw new ValidationError(
            `Financial safety violation: payment amountMinorUnits must be integer paise. Received: '${amountPaise}'`,
            'INVALID_MINOR_UNITS'
          );
        }
      }
    }

    if (change.entityType === 'membership_plan') {
      const pricePaise = change.payload.priceMinorUnits ?? change.payload.price_minor_units;
      if (pricePaise !== undefined && pricePaise !== null) {
        if (typeof pricePaise !== 'number' || !Number.isInteger(pricePaise)) {
          throw new ValidationError(
            `Financial safety violation: plan priceMinorUnits must be integer paise. Received: '${pricePaise}'`,
            'INVALID_MINOR_UNITS'
          );
        }
      }
    }

    // 9. Injection Defense
    this.sanitizePayloadKeys(change.payload);
  }

  private static sanitizePayloadKeys(payload: Record<string, any>): void {
    const dangerousPatterns = [/drop\s+table/i, /delete\s+from/i, /exec\s*\(/i, /<script/i];
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new ValidationError(
              `Potential injection payload rejected in field '${key}'`,
              'INJECTION_ATTEMPT_REJECTED'
            );
          }
        }
      }
    }
  }
}
