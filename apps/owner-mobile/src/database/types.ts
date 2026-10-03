/**
 * GymDeck Owner Mobile - Local Encrypted Database Type Definitions
 *
 * Enforces domain terminology alignment with Desktop Tauri and Cloud PostgreSQL schemas.
 *
 * CRITICAL FINANCIAL INVARIANT:
 * All monetary amounts are represented strictly as integer minor units (paise: 1 INR = 100 paise).
 * REAL / FLOAT / DOUBLE types are prohibited for financial calculations and storage.
 */

import { QueryResult, Scalar } from '@op-engineering/op-sqlite';
import { MinorUnits } from '../types/money';

/**
 * Common database executor abstraction supporting both standalone db connections
 * and transactional closures (tx).
 */
export interface IDatabaseExecutor {
  execute(query: string, params?: Scalar[]): Promise<QueryResult>;
  executeSync?(query: string, params?: Scalar[]): QueryResult;
}

export interface VaultMetadataRecord {
  id: string;
  gym_id: string;
  vault_version: number;
  device_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type MembershipStatusType = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE';
export type SyncStatusType = 'SYNCED' | 'PENDING_MUTATION';

export interface GymMemberRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  member_code: string; // Visible business code e.g. "GD-1001"
  full_name: string;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  gender: string | null;
  dob: string | null;
  address: string | null;
  membership_status: MembershipStatusType;
  joined_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface MembershipPlanRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  plan_name: string;
  duration_days: number;
  price_minor_units: MinorUnits; // Integer paise
  description: string | null;
  benefits: string | null;
  is_active: number; // SQLite boolean 0 or 1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface MemberMembershipRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  member_id: string; // UUID v4
  plan_id: string; // UUID v4
  status: string; // ACTIVE, EXPIRED, FROZEN, CANCELLED
  start_date: string;
  end_date: string;
  price_at_purchase_minor_units: MinorUnits; // Integer paise
  auto_renew: number; // 0 or 1
  frozen_at: string | null;
  freeze_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface AttendanceLogRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  member_id: string; // UUID v4
  check_in_time: string;
  check_out_time: string | null;
  entry_method: string; // MANUAL, QR_DYNAMIC, RFID, BIOMETRIC, CODE_LOOKUP
  device_metadata: string | null;
  notes: string | null;
  recorded_by_user_id: string | null;
  created_at: string;
  deleted_at: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface PaymentRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  member_id: string; // UUID v4
  membership_id: string | null;
  amount_minor_units: MinorUnits; // Integer paise (e.g. 50000 = ₹500.00)
  payment_method: string; // CASH, CARD, UPI, BANK_TRANSFER, REFUND, OTHER
  transaction_reference: string | null;
  receipt_number: string | null;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED';
  notes: string | null;
  paid_at: string;
  created_at: string;
  deleted_at: string | null;
  linked_payment_id?: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface TrainerRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  full_name: string;
  phone: string;
  email: string | null;
  specialization: string | null;
  experience_years: number | null;
  bio: string | null;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface TrainerAssignmentRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  member_id: string;
  trainer_id: string;
  assigned_at: string;
  ended_at: string | null;
  status: string; // ACTIVE, ENDED
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface PTPackageRecord {
  id: string; // UUID v4
  gym_id: string; // UUID v4
  member_id: string;
  trainer_id: string;
  package_name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  price_minor_units: MinorUnits; // Integer paise
  expiry_date: string;
  status: string; // ACTIVE, EXPIRED, COMPLETED
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

export interface PTSessionRecord {
  id: string; // UUID v4
  package_id: string;
  gym_id: string;
  member_id: string;
  trainer_id: string;
  session_date: string;
  duration_minutes: number;
  focus_area: string | null;
  trainer_notes: string | null;
  status: string; // SCHEDULED, COMPLETED, CANCELLED
  created_at: string;
  deleted_at?: string | null;
  server_version?: number | null;
  sync_status?: SyncStatusType;
}

/**
 * Canonical Sync Outbox Event Contract
 */
export type OutboxOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID';

export type OutboxStatus =
  | 'PENDING'
  | 'IN_FLIGHT'
  | 'ACKNOWLEDGED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_PERMANENT';

export interface CanonicalOutboxEvent<T = Record<string, any>> {
  schemaVersion: number;
  eventId: string;
  gymId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  operation: OutboxOperation;
  baseServerSequence: number | null;
  payload: T;
  clientTimestamp: string;
}

export interface OutboxRecord {
  id: string;
  schemaVersion: number;
  eventId: string;
  gymId: string;
  deviceId: string;
  entityType: string;
  entityId: string;
  operation: OutboxOperation;
  baseServerSequence: number | null;
  payload: string;
  parsedPayload?: Record<string, any>;
  clientTimestamp: string;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  leaseExpiresAt: string | null;
  workerId: string | null;
  status: OutboxStatus;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface SyncOutboxRecord {
  id: string; // UUID v4
  schema_version: number;
  event_id: string; // UUID v4
  gym_id: string; // UUID v4
  device_id: string;
  entity_type: string;
  entity_id: string;
  operation: OutboxOperation;
  base_server_sequence: number | null;
  payload: string; // JSON string
  client_timestamp: string;
  created_at: string;
  attempt_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  lease_expires_at: string | null;
  worker_id: string | null;
  status: OutboxStatus;
  error_code: string | null;
  error_message: string | null;
}

export interface SyncInboxRecord {
  server_sequence: number;
  gym_id: string;
  event_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  applied_at: string;
}

export interface SyncStateRecord {
  key: string;
  gym_id: string;
  value: string;
  updated_at: string;
}

export interface SchemaMigrationRecord {
  version: number;
  name: string;
  applied_at: string;
  checksum: string | null;
}
