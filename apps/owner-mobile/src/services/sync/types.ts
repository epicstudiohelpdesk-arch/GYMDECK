/**
 * GymDeck Owner Mobile - Synchronization Engine Type Definitions
 *
 * Gate 5 — Cloud Synchronization Architecture
 *
 * Establishes:
 * 1. Push batch DTOs & API response shapes (aligned with Cloud PostgreSQL contract)
 * 2. Pull query & response shapes (aligned with Cloud Change Log contract)
 * 3. Outbox & Inbox state models
 * 4. Sync configuration parameters
 * 5. Sync diagnostics & state definitions
 */

import { OutboxOperation, OutboxStatus } from '../../database/types';

export type SyncState = 'IDLE' | 'SYNCING' | 'OFFLINE' | 'AUTH_ERROR' | 'ERROR';

export interface SyncConfig {
  batchSize: number; // Maximum events per push batch (default: 50)
  pullLimit: number; // Maximum changes per pull request (default: 100)
  requestTimeoutMs: number; // Per-request HTTP timeout in ms (default: 15000)
  maxRetryAttempts: number; // Maximum retry count before marked FAILED_PERMANENT (default: 5)
  baseBackoffMs: number; // Initial exponential backoff in ms (default: 2000)
  maxBackoffMs: number; // Maximum backoff ceiling in ms (default: 60000)
  inFlightLeaseMs: number; // Duration of IN_FLIGHT lease before auto-recovery (default: 120000 = 2m)
  debounceDelayMs: number; // Debounce window for mutation-triggered sync (default: 1000)
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  batchSize: 50,
  pullLimit: 100,
  requestTimeoutMs: 15000,
  maxRetryAttempts: 5,
  baseBackoffMs: 2000,
  maxBackoffMs: 60000,
  inFlightLeaseMs: 120000,
  debounceDelayMs: 1000,
};

// ==============================================================================
// Push Contract (Mobile -> Cloud)
// ==============================================================================

export interface PushEventItemDto {
  eventId: string; // UUIDv4
  entityType: string;
  entityId: string; // UUIDv4
  operation: OutboxOperation;
  payload: Record<string, any>;
  clientTimestamp: string;
}

export interface PushPayloadDto {
  deviceId: string;
  events: PushEventItemDto[];
}

export interface PushApiResultItem {
  eventId: string;
  entityId: string;
  status: 'APPLIED' | 'ALREADY_APPLIED' | 'CONFLICT_RESOLVED' | 'FAILED';
  serverSequence?: number;
  error?: string;
}

export interface PushApiResponse {
  success: boolean;
  data: {
    results: PushApiResultItem[];
    latestServerSequence: number;
  };
}

// ==============================================================================
// Pull Contract (Cloud -> Mobile)
// ==============================================================================

export interface PullQueryParams {
  deviceId: string;
  cursor: number;
  limit: number;
}

export interface PullChangeItem {
  serverSequence: number;
  eventId: string;
  entityType: string;
  entityId: string;
  operation: OutboxOperation;
  payload: Record<string, any>;
  createdAt: string;
}

export interface PullApiResponse {
  success: boolean;
  data: {
    cursor: number;
    latestServerSequence: number;
    hasMore: boolean;
    changes: PullChangeItem[];
  };
}

// ==============================================================================
// Sync Diagnostics & Observability
// ==============================================================================

export interface SyncDiagnostics {
  syncState: SyncState;
  pendingOutboxCount: number;
  inFlightCount: number;
  acknowledgedCount: number;
  retryableFailureCount: number;
  permanentFailureCount: number;
  lastSuccessfulPushAt: string | null;
  lastSuccessfulPullAt: string | null;
  currentCursor: number;
  latestServerSequence: number;
  activeDeviceId: string;
  activeGymId: string | null;
  lastError: string | null;
}
