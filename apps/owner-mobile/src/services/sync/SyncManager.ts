/**
 * GymDeck Owner Mobile - Synchronization Engine Manager
 *
 * Gate 5 — Cloud Synchronization Architecture
 *
 * Implements the authoritative bidirectional synchronization engine between
 * Owner Mobile SQLCipher and GymDeck Cloud PostgreSQL.
 *
 * Architectural Invariants:
 * 1. Durable outbox processing with crash-safe IN_FLIGHT recovery.
 * 2. Idempotent push: repeat requests with same eventId do NOT duplicate mutations on Cloud.
 * 3. Monotonic server sequence cursor advancement: cursor advances ONLY after transactional commit.
 * 4. Inbox deduplication: incoming server changes applied exactly once.
 * 5. GATE 5 BOUNDARY: Zero semantic conflict resolution; preserves Gate 6 metadata.
 * 6. Zero secret leakage: diagnostic logs and state contain no auth tokens or credentials.
 * 7. Offline resiliency: local mutations continue seamlessly offline; sync auto-resumes on reconnect.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AxiosInstance } from 'axios';
import { LocalDatabaseManager } from '../../database/LocalDatabaseManager';
import { OutboxRepository, outboxRepository } from '../../database/repositories/OutboxRepository';
import { InboxRepository, inboxRepository } from './InboxRepository';
import { EventValidator } from './EventValidator';
import { RemoteEventApplier } from './RemoteEventApplier';
import { DeviceIdentityService } from '../DeviceIdentityService';
import { apiClient } from '../api/client';
import { Logger } from '../../observability';
import { OutboxRecord } from '../../database/types';
import {
  SyncConfig,
  DEFAULT_SYNC_CONFIG,
  SyncState,
  SyncDiagnostics,
  PushPayloadDto,
  PushApiResponse,
  PushApiResultItem,
  PullApiResponse,
  PullChangeItem,
} from './types';

export class SyncManager {
  private static instance: SyncManager;

  private config: SyncConfig;
  private dbManager: LocalDatabaseManager;
  private outboxRepo: OutboxRepository;
  private inboxRepo: InboxRepository;
  private http: AxiosInstance;

  private currentState: SyncState = 'IDLE';
  private lastSuccessfulPushAt: string | null = null;
  private lastSuccessfulPullAt: string | null = null;
  private lastError: string | null = null;
  private isSynchronizing: boolean = false;
  private debounceTimer: any = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private stateListeners: Set<(diag: SyncDiagnostics) => void> = new Set();

  constructor(
    config: Partial<SyncConfig> = {},
    dbManager: LocalDatabaseManager = LocalDatabaseManager.getInstance(),
    outboxRepoInstance: OutboxRepository = outboxRepository,
    inboxRepoInstance: InboxRepository = inboxRepository,
    httpClient: AxiosInstance = apiClient
  ) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.dbManager = dbManager;
    this.outboxRepo = outboxRepoInstance;
    this.inboxRepo = inboxRepoInstance;
    this.http = httpClient;
  }

  public static getInstance(config?: Partial<SyncConfig>): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(config);
    }
    return SyncManager.instance;
  }

  /**
   * Initializes network listeners and crash recovery.
   */
  public start(): void {
    if (this.netInfoUnsubscribe) {
      return; // Already started
    }

    Logger.info('[SyncManager] Starting synchronization engine...');

    // 1. Recover any stranded IN_FLIGHT events from previous session/crash
    this.recoverStaleInFlightEvents().catch((err) => {
      Logger.warn('[SyncManager] Failed initial in-flight recovery', { error: err?.message });
    });

    // 2. Subscribe to network state transitions
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        Logger.info('[SyncManager] Network online detected. Triggering sync...');
        this.synchronize('network_reconnect').catch(() => {});
      } else {
        Logger.info('[SyncManager] Network offline detected.');
        this.setSyncState('OFFLINE');
      }
    });

    // 3. Immediately evaluate current connectivity to trigger startup sync
    NetInfo.fetch()
      .then((state: NetInfoState) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          Logger.info('[SyncManager] Initial online state confirmed. Triggering startup sync...');
          this.synchronize('engine_start').catch(() => {});
        }
      })
      .catch(() => {});
  }

  /**
   * Stops listeners.
   */
  public stop(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isSynchronizing = false;
    this.setSyncState('IDLE');
    Logger.info('[SyncManager] Synchronization engine stopped.');
  }

  /**
   * Called by local mutation service whenever a new offline mutation is committed.
   * Debounces execution to batch rapid UI actions.
   */
  public notifyLocalMutation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.synchronize('local_mutation').catch(() => {});
    }, this.config.debounceDelayMs);
  }

  // ==============================================================================
  // Core Synchronization Pipeline
  // ==============================================================================

  /**
   * Primary synchronization entry point.
   * Runs sequentially:
   * 1. Crash recovery for stranded IN_FLIGHT events
   * 2. Push Phase (Outbox -> Cloud)
   * 3. Pull Phase (Cloud -> Inbox -> Domain)
   */
  public async synchronize(reason: string = 'manual'): Promise<SyncDiagnostics> {
    if (this.isSynchronizing) {
      Logger.debug(`[SyncManager] Sync already in progress. Skipping trigger (${reason}).`);
      return this.getDiagnostics();
    }

    const gymId = this.dbManager.getActiveGymId();
    if (!gymId) {
      Logger.debug('[SyncManager] No active gym tenant context. Sync idle.');
      return this.getDiagnostics();
    }

    // Check connectivity
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected || net.isInternetReachable === false) {
        this.setSyncState('OFFLINE');
        return this.getDiagnostics();
      }
    } catch {
      // Non-blocking in test / isolated runtimes
    }

    this.isSynchronizing = true;
    this.setSyncState('SYNCING');
    this.lastError = null;

    Logger.info(`[SyncManager] Beginning synchronization cycle (${reason}) for tenant: ${gymId}`);

    try {
      // 1. Recover stale in-flight events
      await this.recoverStaleInFlightEvents(gymId);

      // 2. Execute Push Phase
      await this.pushPendingOutbox(gymId);

      // 3. Execute Pull Phase
      await this.pullRemoteChanges(gymId);

      this.setSyncState('IDLE');
      Logger.info('[SyncManager] Synchronization cycle completed successfully.');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      this.lastError = errMsg;

      if (err?.statusCode === 401 || errMsg.includes('401') || errMsg.includes('Unauthorized') || errMsg.includes('Session expired')) {
        this.setSyncState('AUTH_ERROR');
        Logger.warn('[SyncManager] Sync paused due to authentication expiration.');
      } else if (errMsg.includes('Network') || errMsg.includes('timeout') || errMsg.includes('ECONNREFUSED')) {
        this.setSyncState('OFFLINE');
        Logger.warn('[SyncManager] Sync interrupted due to network reachability.', { error: errMsg });
      } else {
        this.setSyncState('ERROR');
        Logger.error('[SyncManager] Sync cycle encountered error', { error: errMsg });
      }
    } finally {
      this.isSynchronizing = false;
    }

    return this.getDiagnostics();
  }

  // ==============================================================================
  // Push Processing (Mobile -> Cloud)
  // ==============================================================================

  public async pushPendingOutbox(gymId: string): Promise<{ pushedCount: number; acknowledgedCount: number }> {
    const deviceId = DeviceIdentityService.getDeviceIdSync();
    let totalPushed = 0;
    let totalAcknowledged = 0;

    // Loop through outbox in batches until queue drained
    while (true) {
      const claimableEvents = await this.outboxRepo.getClaimableEvents(this.config.batchSize, gymId);
      if (claimableEvents.length === 0) {
        break; // Outbox empty or all pending events in retry backoff
      }

      const eventIds = claimableEvents.map((e) => e.eventId);
      const workerId = `worker_${deviceId.slice(-6)}_${Date.now()}`;
      const leaseExpiresAt = new Date(Date.now() + this.config.inFlightLeaseMs).toISOString();

      // Claim batch as IN_FLIGHT
      await this.outboxRepo.markBatchInFlight(eventIds, leaseExpiresAt, workerId, gymId);

      const pushPayload: PushPayloadDto = {
        deviceId,
        events: claimableEvents.map((e) => ({
          eventId: e.eventId,
          entityType: e.entityType,
          entityId: e.entityId,
          operation: e.operation,
          payload: e.parsedPayload || (typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload),
          clientTimestamp: e.clientTimestamp,
        })),
      };

      try {
        Logger.debug(`[SyncManager] Pushing batch of ${claimableEvents.length} events to /sync/push...`);

        const response = await this.http.post<{ success: boolean; data: { results: PushApiResultItem[]; latestServerSequence: number } }>(
          '/sync/push',
          pushPayload,
          { timeout: this.config.requestTimeoutMs }
        );

        const results = response.data?.data?.results || [];

        // Process per-event results deterministically
        for (const res of results) {
          const matchingEvent = claimableEvents.find((e) => e.eventId === res.eventId);
          if (!matchingEvent) continue;

          if (res.status === 'APPLIED' || res.status === 'ALREADY_APPLIED') {
            // Acknowledge outbox event
            await this.outboxRepo.updateStatus(res.eventId, 'ACKNOWLEDGED', {}, undefined, gymId);

            // Stamp local domain record with server_version
            if (res.serverSequence) {
              await this.stampLocalServerVersion(matchingEvent.entityType, matchingEvent.entityId, res.serverSequence, gymId);
            }

            totalAcknowledged++;
          } else {
            // Processing failure on server
            await this.handleFailedEvent(matchingEvent, res.error || 'Server rejected mutation', gymId);
          }
        }

        totalPushed += claimableEvents.length;
        this.lastSuccessfulPushAt = new Date().toISOString();
      } catch (err: any) {
        Logger.warn('[SyncManager] Push batch HTTP transport failure. Scheduling backoff retry.', {
          error: err?.message,
          batchCount: claimableEvents.length,
        });

        // Network failure, timeout, or server error -> schedule retryable backoff for all events in batch
        for (const event of claimableEvents) {
          await this.handleFailedEvent(event, err?.message || 'Transport error', gymId);
        }

        throw err; // Propagate to synchronize() to update syncState
      }
    }

    return { pushedCount: totalPushed, acknowledgedCount: totalAcknowledged };
  }

  // ==============================================================================
  // Pull Processing (Cloud -> Mobile)
  // ==============================================================================

  public async pullRemoteChanges(gymId: string): Promise<{ appliedCount: number; cursor: number }> {
    const deviceId = DeviceIdentityService.getDeviceIdSync();
    let totalApplied = 0;
    let hasMore = true;

    while (hasMore) {
      const currentCursor = await this.inboxRepo.getLastAppliedServerSequence(gymId);

      Logger.debug(`[SyncManager] Pulling incremental changes since cursor ${currentCursor}...`);

      const response = await this.http.get<{
        success: boolean;
        data: {
          cursor: number;
          latestServerSequence: number;
          hasMore: boolean;
          changes: PullChangeItem[];
        };
      }>('/sync/pull', {
        params: {
          deviceId,
          cursor: currentCursor,
          limit: this.config.pullLimit,
        },
        timeout: this.config.requestTimeoutMs,
      });

      const pullData = response.data?.data;
      if (!pullData) {
        break;
      }

      const changes = pullData.changes || [];
      hasMore = Boolean(pullData.hasMore);

      if (changes.length === 0) {
        break;
      }

      // Sort changes strictly by serverSequence ascending
      changes.sort((a, b) => a.serverSequence - b.serverSequence);

      for (const change of changes) {
        // 1. Validate change schema, tenant boundary, and payload invariants
        EventValidator.validateIncomingChange(change, gymId);

        // 2. Transactionally apply change, record in sync_inbox, and advance cursor
        await this.dbManager.runInTransaction(async (tx) => {
          // Idempotent record in sync_inbox
          const isNew = await this.inboxRepo.recordInboxEvent(change, tx, gymId);
          if (isNew) {
            // Apply domain mutation locally (preserving Gate 6 conflict metadata)
            await RemoteEventApplier.applyRemoteChange(tx, change, gymId);
          }

          // Advance cursor in the exact same transaction
          await this.inboxRepo.setLastAppliedServerSequence(change.serverSequence, tx, gymId);
        });

        totalApplied++;
      }

      this.lastSuccessfulPullAt = new Date().toISOString();
    }

    const finalCursor = await this.inboxRepo.getLastAppliedServerSequence(gymId);
    return { appliedCount: totalApplied, cursor: finalCursor };
  }

  // ==============================================================================
  // Helpers & Recovery
  // ==============================================================================

  /**
   * Recovers events stranded in IN_FLIGHT state beyond the lease duration.
   */
  public async recoverStaleInFlightEvents(gymId?: string): Promise<number> {
    const activeGymId = gymId || this.dbManager.getActiveGymId();
    if (!activeGymId) return 0;

    const threshold = new Date(Date.now()).toISOString();
    const recovered = await this.outboxRepo.recoverStaleInFlightEvents(threshold, activeGymId);
    if (recovered > 0) {
      Logger.info(`[SyncManager] Recovered ${recovered} stranded IN_FLIGHT events back to PENDING.`);
    }
    return recovered;
  }

  private async handleFailedEvent(event: OutboxRecord, errorMessage: string, gymId: string): Promise<void> {
    const newAttemptCount = event.attemptCount + 1;
    const isPermanent = newAttemptCount >= this.config.maxRetryAttempts;

    if (isPermanent) {
      await this.outboxRepo.updateStatus(
        event.eventId,
        'FAILED_PERMANENT',
        { errorMessage, errorCode: 'MAX_RETRIES_EXCEEDED' },
        undefined,
        gymId
      );
    } else {
      // Exponential backoff with jitter
      const exponentialDelay = this.config.baseBackoffMs * Math.pow(2, event.attemptCount);
      const jitter = Math.floor(Math.random() * 500);
      const delayMs = Math.min(exponentialDelay, this.config.maxBackoffMs) + jitter;
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      await this.outboxRepo.updateStatus(
        event.eventId,
        'FAILED_RETRYABLE',
        { errorMessage, nextRetryAt },
        undefined,
        gymId
      );
    }
  }

  private async stampLocalServerVersion(
    entityType: string,
    entityId: string,
    serverSequence: number,
    gymId: string
  ): Promise<void> {
    const tableMap: Record<string, string> = {
      gym_member: 'gym_members',
      membership_plan: 'membership_plans',
      member_membership: 'member_memberships',
      attendance: 'attendance_logs',
      attendance_log: 'attendance_logs',
      payment: 'payments',
      trainer: 'trainers',
      trainer_assignment: 'trainer_assignments',
      pt_package: 'pt_packages',
      pt_session: 'pt_sessions',
    };

    const tableName = tableMap[entityType];
    if (!tableName) return;

    try {
      await this.dbManager.execute(
        `UPDATE ${tableName}
         SET server_version = ?, sync_status = 'SYNCED'
         WHERE id = ? AND gym_id = ? AND sync_status != 'PENDING_MUTATION';`,
        [serverSequence, entityId, gymId]
      );
    } catch {
      // Non-critical local metadata update
    }
  }

  // ==============================================================================
  // State & Diagnostics
  // ==============================================================================

  private setSyncState(state: SyncState): void {
    this.currentState = state;
    this.notifyStateListeners();
  }

  public async getDiagnostics(): Promise<SyncDiagnostics> {
    const activeGymId = this.dbManager.getActiveGymId();
    const deviceId = DeviceIdentityService.getDeviceIdSync();

    let pendingCount = 0;
    let inFlightCount = 0;
    let acknowledgedCount = 0;
    let retryableCount = 0;
    let permanentCount = 0;
    let currentCursor = 0;

    if (activeGymId) {
      try {
        const counts = await this.outboxRepo.countAllStatuses(activeGymId);
        pendingCount = counts.pending;
        inFlightCount = counts.inFlight;
        acknowledgedCount = counts.acknowledged;
        retryableCount = counts.failedRetryable;
        permanentCount = counts.failedPermanent;
        currentCursor = await this.inboxRepo.getLastAppliedServerSequence(activeGymId);
      } catch {
        // Non-blocking
      }
    }

    return {
      syncState: this.currentState,
      pendingOutboxCount: pendingCount,
      inFlightCount,
      acknowledgedCount,
      retryableFailureCount: retryableCount,
      permanentFailureCount: permanentCount,
      lastSuccessfulPushAt: this.lastSuccessfulPushAt,
      lastSuccessfulPullAt: this.lastSuccessfulPullAt,
      currentCursor,
      latestServerSequence: currentCursor,
      activeDeviceId: deviceId,
      activeGymId,
      lastError: this.lastError,
    };
  }

  public onSyncStateChange(listener: (diag: SyncDiagnostics) => void): () => void {
    this.stateListeners.add(listener);
    this.getDiagnostics().then(listener).catch(() => {});
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyStateListeners(): void {
    this.getDiagnostics().then((diag) => {
      this.stateListeners.forEach((l) => {
        try {
          l(diag);
        } catch {
          // ignore
        }
      });
    }).catch(() => {});
  }
}

export const syncManager = SyncManager.getInstance();
