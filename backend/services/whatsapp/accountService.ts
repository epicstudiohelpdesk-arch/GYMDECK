/**
 * GymDeck WhatsApp - per-gym OpenWA connection lifecycle.
 *
 * Each gym owns exactly one OpenWA session. A session is created through the
 * bundled gateway, linked by scanning its QR code, and considered CONNECTED only
 * when OpenWA reports READY and the linked phone number. A typed phone number in
 * Gym Profile never implies a connection.
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import { gymWhatsAppAccounts } from '../../shared/database/schema';
import { config } from '../../shared/config';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logging';
import { openwaClient, OpenWARequestError, type OpenWASession } from './openwaClient';
import { normalizeWhatsAppNumber, maskWhatsAppNumber } from './phone';
import { evaluateDelivery, OWNER_ERRORS } from './policy';
import type { ConnectionStatus } from './types';
import { recordWhatsAppAudit } from './audit';

const WEBHOOK_EVENTS = [
  'message.received',
  'message.sent',
  'message.ack',
  'message.failed',
  'session.status',
];

export interface PrerequisiteReport {
  ready: boolean;
  liveMode: boolean;
  items: Array<{
    key: string;
    label: string;
    configured: boolean;
    detail: string;
  }>;
}

function statusOwnerMessage(status: ConnectionStatus, reason: string | null): string {
  switch (status) {
    case 'CONNECTED':
      return 'WhatsApp is linked and ready to send through OpenWA.';
    case 'CONNECTING':
      return 'Scan the QR code with the gym phone to link WhatsApp.';
    case 'DISCONNECTED':
      return 'WhatsApp is disconnected. Reconnect and scan a new QR code.';
    case 'CONNECTION_EXPIRED':
    case 'REAUTHORIZATION_REQUIRED':
      return OWNER_ERRORS.ACCOUNT_REQUIRES_REAUTH;
    case 'RESTRICTED':
      return 'WhatsApp has restricted this account. Check the phone and OpenWA logs.';
    case 'ERROR':
      return reason || 'The OpenWA session could not be verified. Please reconnect.';
    default:
      return 'Connect the gym WhatsApp by scanning a QR code.';
  }
}

function sessionNameForGym(gymId: string): string {
  const compact = gymId.replace(/-/g, '').slice(0, 24);
  const prefix = String(config.OPENWA_SESSION_PREFIX || 'gymdeck')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 18);
  return `${prefix || 'gymdeck'}-${compact}`;
}

function mapSessionStatus(session: OpenWASession): ConnectionStatus {
  switch (String(session.status || '').toLowerCase()) {
    case 'ready':
      return 'CONNECTED';
    case 'qr_ready':
    case 'initializing':
    case 'authenticating':
    case 'created':
      return 'CONNECTING';
    case 'failed':
    case 'action_required':
      return 'ERROR';
    case 'disconnected':
    default:
      return 'DISCONNECTED';
  }
}

export class WhatsAppAccountService {
  public getPrerequisites(): PrerequisiteReport {
    const items = [
      {
        key: 'gatewayUrl',
        label: 'OpenWA gateway URL',
        configured: Boolean(config.OPENWA_API_URL),
        detail: `GymDeck calls ${config.OPENWA_API_URL}.`,
      },
      {
        key: 'apiKey',
        label: 'OpenWA API key',
        configured:
          Boolean(config.OPENWA_API_KEY) &&
          !/dev_openwa|change_me|placeholder/i.test(config.OPENWA_API_KEY),
        detail: 'Set OPENWA_API_KEY to the key configured in the bundled OpenWA service.',
      },
      {
        key: 'webhookSecret',
        label: 'OpenWA webhook secret',
        configured:
          Boolean(config.OPENWA_WEBHOOK_SECRET) &&
          !/dev_openwa|change_me|placeholder/i.test(config.OPENWA_WEBHOOK_SECRET),
        detail: 'Set OPENWA_WEBHOOK_SECRET so delivery receipts are HMAC-verified.',
      },
      {
        key: 'webhookUrl',
        label: 'Public GymDeck webhook',
        configured: Boolean(config.OPENWA_WEBHOOK_URL),
        detail: 'Set OPENWA_WEBHOOK_URL to the HTTPS /v1/webhooks/openwa endpoint.',
      },
    ];

    return {
      ready: items.every((item) => item.configured),
      liveMode: true,
      items,
    };
  }

  public async getAccount(gymId: string): Promise<any | null> {
    const rows = await db
      .select()
      .from(gymWhatsAppAccounts)
      .where(eq(gymWhatsAppAccounts.gymId, gymId))
      .orderBy(desc(gymWhatsAppAccounts.updatedAt))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Owner-safe connection DTO. Never returns the API key, session credentials or raw phone. */
  public async getConnection(gymId: string): Promise<any> {
    const account = await this.getAccount(gymId);
    const prerequisites = this.getPrerequisites();

    if (!account || !account.openwaSessionId) {
      return {
        connectionStatus: 'NOT_CONNECTED',
        ownerMessage: statusOwnerMessage('NOT_CONNECTED', null),
        displayName: null,
        businessPhoneNumber: null,
        webhookSubscribed: false,
        connectedAt: null,
        lastVerifiedAt: null,
        statusReason: null,
        isLive: false,
        isSandbox: false,
        isDevelopment: false,
        environment: 'NONE',
        provider: 'OPENWA',
        qrCode: null,
        gatewayReachable: null,
        prerequisites,
      };
    }

    let session: OpenWASession | null = null;
    let gatewayReachable: boolean | null = null;
    let gatewayError: string | null = null;

    try {
      session = await openwaClient.getSession(account.openwaSessionId);
      gatewayReachable = true;
    } catch (err: any) {
      gatewayReachable = false;
      gatewayError =
        err instanceof OpenWARequestError && err.status === 404
          ? 'The OpenWA session no longer exists. Reconnect WhatsApp.'
          : 'The OpenWA gateway is unreachable. Check that the bundled service is running.';
      logger.warn('[whatsapp] could not read OpenWA session', {
        gymId,
        message: err instanceof Error ? err.message : 'unknown',
      });
    }

    let qrCode: string | null = null;
    if (session && String(session.status).toLowerCase() === 'qr_ready') {
      try {
        qrCode = await openwaClient.getQR(account.openwaSessionId);
      } catch {
        qrCode = null;
      }
    }

    let status = (session ? mapSessionStatus(session) : account.connectionStatus) as ConnectionStatus;
    if (session && status === 'CONNECTED' && !session.phone) {
      // OpenWA only reports READY once authenticated; a missing phone is still a
      // transient state while the gateway finishes writing the session.
      status = 'CONNECTING';
    }

    const now = new Date();
    const patch: Record<string, unknown> = {
      openwaStatus: session?.status ?? account.openwaStatus,
      lastVerifiedAt: gatewayReachable ? now : account.lastVerifiedAt,
      updatedAt: now,
    };

    if (session) {
      patch.connectionStatus = status;
      patch.statusReason =
        status === 'ERROR'
          ? session.lastError || 'The OpenWA session reported a failure.'
          : status === 'CONNECTED'
            ? null
            : gatewayError;
      if (status === 'CONNECTED') {
        patch.businessPhoneNumber = session.phone || account.businessPhoneNumber;
        patch.displayName = session.pushName || account.displayName;
        patch.connectedAt = account.connectedAt || now;
        patch.disconnectedAt = null;
      }
    } else {
      patch.statusReason = gatewayError;
    }

    await db
      .update(gymWhatsAppAccounts)
      .set(patch)
      .where(and(eq(gymWhatsAppAccounts.id, account.id), eq(gymWhatsAppAccounts.gymId, gymId)));

    const phone = patch.businessPhoneNumber ?? account.businessPhoneNumber;
    return {
      connectionStatus: status,
      ownerMessage:
        gatewayReachable === false
          ? gatewayError
          : statusOwnerMessage(status, (patch.statusReason as string) || null),
      displayName: (patch.displayName as string) ?? account.displayName,
      businessPhoneNumber: phone ? maskWhatsAppNumber(phone) : null,
      webhookSubscribed: Boolean(account.webhookSubscribed),
      connectedAt: (patch.connectedAt as Date) ?? account.connectedAt,
      lastVerifiedAt: patch.lastVerifiedAt,
      statusReason: (patch.statusReason as string) || null,
      isLive: status === 'CONNECTED' && gatewayReachable !== false,
      isSandbox: false,
      isDevelopment: false,
      environment: status === 'CONNECTED' ? 'PRODUCTION' : 'NONE',
      provider: 'OPENWA',
      openwaStatus: session?.status ?? account.openwaStatus,
      qrCode,
      gatewayReachable,
      prerequisites,
    };
  }

  /**
   * Create/start this gym's OpenWA session and register the GymDeck webhook.
   * Returns the QR code when WhatsApp asks for a link.
   */
  public async connect(gymId: string, actorUserId?: string): Promise<any> {
    const sessionName = sessionNameForGym(gymId);
    let session: OpenWASession;
    let webhookId: string | null = null;

    try {
      session = await openwaClient.ensureSession(sessionName);
      // Start session & ensure webhook concurrently for faster launch
      const [, webhook] = await Promise.all([
        openwaClient.startSession(session.id),
        openwaClient.ensureWebhook(
          session.id,
          config.OPENWA_WEBHOOK_URL,
          config.OPENWA_WEBHOOK_SECRET,
          WEBHOOK_EVENTS
        ).catch((webhookErr) => {
          logger.warn('[whatsapp] Webhook setup non-fatal warning', {
            gymId,
            message: webhookErr instanceof Error ? webhookErr.message : 'unknown',
          });
          return null;
        }),
      ]);
      webhookId = webhook?.id ? String(webhook.id) : null;

      // Re-read after start: a session already authenticated is READY now.
      session = await openwaClient.getSession(session.id);
    } catch (err: any) {
      logger.error('[whatsapp] OpenWA connect failed', {
        gymId,
        status: err?.status,
        message: err instanceof Error ? err.message : 'unknown',
      });
      throw AppError.conflict(
        err instanceof OpenWARequestError
          ? `OpenWA could not start the WhatsApp session: ${err.message}`
          : 'Could not start the OpenWA WhatsApp session.'
      );
    }

    const status = mapSessionStatus(session);
    const now = new Date();
    const phone = session.phone ? normalizeWhatsAppNumber(session.phone) : null;

    await db
      .insert(gymWhatsAppAccounts)
      .values({
        gymId,
        provider: 'OPENWA',
        openwaSessionId: session.id,
        openwaSessionName: session.name,
        openwaWebhookId: webhookId,
        openwaStatus: session.status,
        businessPhoneNumber: phone,
        displayName: session.pushName || 'GymDeck WhatsApp',
        connectionStatus: status,
        statusReason:
          status === 'ERROR' ? session.lastError || 'OpenWA reported a session failure.' : null,
        webhookSubscribed: Boolean(webhookId),
        lastVerifiedAt: now,
        connectedAt: status === 'CONNECTED' ? now : null,
        createdBy: actorUserId ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: gymWhatsAppAccounts.gymId,
        set: {
          provider: 'OPENWA',
          openwaSessionId: session.id,
          openwaSessionName: session.name,
          openwaWebhookId: webhookId,
          openwaStatus: session.status,
          businessPhoneNumber: phone,
          displayName: session.pushName || 'GymDeck WhatsApp',
          connectionStatus: status,
          statusReason:
            status === 'ERROR' ? session.lastError || 'OpenWA reported a session failure.' : null,
          webhookSubscribed: Boolean(webhookId),
          lastVerifiedAt: now,
          connectedAt: status === 'CONNECTED' ? now : null,
          disconnectedAt: null,
          updatedAt: now,
        },
      });

    await recordWhatsAppAudit({
      gymId,
      actorId: actorUserId,
      action: 'WHATSAPP_OPENWA_SESSION_STARTED',
      metadata: { sessionName, sessionStatus: session.status },
    });

    // If OpenWA hasn't generated the QR immediately on start, poll quickly with a tight interval
    // so the initial response to the user already contains the fresh QR image with minimal latency.
    let initialConnection = await this.getConnection(gymId);
    if (!initialConnection.qrCode && initialConnection.connectionStatus === 'CONNECTING') {
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        initialConnection = await this.getConnection(gymId);
        if (initialConnection.qrCode || initialConnection.connectionStatus !== 'CONNECTING') {
          break;
        }
      }
    }

    return initialConnection;
  }

  public async refreshConnection(gymId: string): Promise<any> {
    return this.getConnection(gymId);
  }

  public async verifyConnection(gymId: string): Promise<any> {
    const account = await this.getAccount(gymId);
    if (!account) throw AppError.notFound('No WhatsApp account is connected for this gym.');
    return this.getConnection(gymId);
  }

  public async setStatus(gymId: string, status: ConnectionStatus, reason: string | null): Promise<void> {
    const existing = await this.getAccount(gymId);
    const now = new Date();

    if (existing) {
      await db
        .update(gymWhatsAppAccounts)
        .set({ connectionStatus: status, statusReason: reason, updatedAt: now })
        .where(and(eq(gymWhatsAppAccounts.id, existing.id), eq(gymWhatsAppAccounts.gymId, gymId)));
      return;
    }

    await db
      .insert(gymWhatsAppAccounts)
      .values({
        gymId,
        provider: 'OPENWA',
        connectionStatus: status,
        statusReason: reason,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: gymWhatsAppAccounts.gymId,
        set: { connectionStatus: status, statusReason: reason, updatedAt: now },
      });
  }

  public async disconnect(gymId: string, actorUserId?: string): Promise<any> {
    const account = await this.getAccount(gymId);
    if (!account) return this.getConnection(gymId);

    if (account.openwaSessionId) {
      try {
        // First perform a clean logout while engine is alive (unlinks phone on WhatsApp Web)
        await openwaClient.logoutSession(account.openwaSessionId);
      } catch (err: any) {
        logger.warn('[whatsapp] OpenWA logout failed', {
          gymId,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }

      try {
        // Ensure engine is stopped
        await openwaClient.stopSession(account.openwaSessionId);
      } catch (err: any) {
        logger.warn('[whatsapp] OpenWA stop failed', {
          gymId,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }

      try {
        // Delete session and purge on-disk authentication directories completely
        // so that subsequent connects will strictly require a fresh QR scan
        await openwaClient.deleteSession(account.openwaSessionId);
      } catch (err: any) {
        logger.warn('[whatsapp] OpenWA delete session failed', {
          gymId,
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    await db
      .update(gymWhatsAppAccounts)
      .set({
        openwaSessionId: null,
        openwaSessionName: null,
        openwaWebhookId: null,
        businessPhoneNumber: null,
        displayName: 'GymDeck WhatsApp',
        connectionStatus: 'DISCONNECTED',
        openwaStatus: 'disconnected',
        statusReason: 'Disconnected by the gym owner.',
        webhookSubscribed: false,
        disconnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(gymWhatsAppAccounts.id, account.id), eq(gymWhatsAppAccounts.gymId, gymId)));

    await recordWhatsAppAudit({
      gymId,
      actorId: actorUserId,
      action: 'WHATSAPP_DISCONNECTED',
      targetId: account.id,
      metadata: { provider: 'OPENWA' },
    });

    return this.getConnection(gymId);
  }

  /**
   * Request an 8-character phone number pairing code from OpenWA.
   * Safe lifecycle:
   * 1. Validates and normalizes the target phone number.
   * 2. Checks if an active session exists; if already CONNECTED, returns existing status.
   * 3. If session does not exist or is stopped, ensures & starts session and ensures webhook.
   * 4. Waits until session reaches qr_ready (the state required by OpenWA to accept pairing).
   * 5. Requests the pairing code via OpenWA v0.30.3 POST /sessions/:id/pairing-code.
   * 6. Audits the pairing request with masked phone.
   */
  public async requestPairingCode(
    gymId: string,
    phoneNumber: string,
    actorUserId?: string
  ): Promise<{
    pairingCode: string;
    status: string;
    connectionStatus: ConnectionStatus;
    expiresInSeconds: number;
  }> {
    const normalized = normalizeWhatsAppNumber(phoneNumber);
    if (!normalized) {
      throw AppError.validation(
        'Invalid phone number. Please provide a valid number with country code.'
      );
    }

    // Check existing account
    let account = await this.getAccount(gymId);
    let session: OpenWASession | null = null;

    if (account?.openwaSessionId) {
      try {
        session = await openwaClient.getSession(account.openwaSessionId);
      } catch {
        session = null;
      }
    }

    // If already connected, do not break the active connection
    if (session && String(session.status).toLowerCase() === 'ready') {
      const conn = await this.getConnection(gymId);
      throw AppError.conflict(
        `WhatsApp is already connected for this gym (${conn.businessPhoneNumber || 'Active Line'}). Disconnect first if you want to link a different number.`
      );
    }

    const sessionName = sessionNameForGym(gymId);
    let webhookId: string | null = account?.openwaWebhookId || null;

    // Ensure session exists and is started
    if (!session || !account?.openwaSessionId) {
      try {
        session = await openwaClient.ensureSession(sessionName);
        const [, webhook] = await Promise.all([
          openwaClient.startSession(session.id),
          openwaClient
            .ensureWebhook(
              session.id,
              config.OPENWA_WEBHOOK_URL,
              config.OPENWA_WEBHOOK_SECRET,
              WEBHOOK_EVENTS
            )
            .catch(() => null),
        ]);
        webhookId = webhook?.id ? String(webhook.id) : webhookId;
        session = await openwaClient.getSession(session.id);
      } catch (err: any) {
        logger.error('[whatsapp] Failed to ensure session for pairing', {
          gymId,
          message: err instanceof Error ? err.message : 'unknown',
        });
        throw AppError.conflict(
          err instanceof OpenWARequestError
            ? `OpenWA could not start WhatsApp session: ${err.message}`
            : 'Could not start WhatsApp session for pairing.'
        );
      }

      const now = new Date();
      await db
        .insert(gymWhatsAppAccounts)
        .values({
          gymId,
          provider: 'OPENWA',
          openwaSessionId: session.id,
          openwaSessionName: session.name,
          openwaWebhookId: webhookId,
          openwaStatus: session.status,
          connectionStatus: mapSessionStatus(session),
          lastVerifiedAt: now,
          createdBy: actorUserId ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: gymWhatsAppAccounts.gymId,
          set: {
            openwaSessionId: session.id,
            openwaSessionName: session.name,
            openwaWebhookId: webhookId,
            openwaStatus: session.status,
            connectionStatus: mapSessionStatus(session),
            lastVerifiedAt: now,
            updatedAt: now,
          },
        });
    } else {
      // Session exists; if stopped or disconnected, start it
      const currentStatus = String(session.status).toLowerCase();
      if (['disconnected', 'failed', 'stopped'].includes(currentStatus)) {
        await openwaClient.startSession(session.id).catch(() => null);
        session = await openwaClient.getSession(session.id);
      }
    }

    // Wait up to ~15 seconds for the engine to reach qr_ready
    let engineStatus = String(session.status).toLowerCase();
    if (engineStatus !== 'qr_ready') {
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          session = await openwaClient.getSession(session.id);
          engineStatus = String(session.status).toLowerCase();
          if (engineStatus === 'qr_ready' || engineStatus === 'ready') break;
        } catch {
          // Keep polling
        }
      }
    }

    if (engineStatus === 'ready') {
      throw AppError.conflict('WhatsApp session is already authenticated.');
    }

    if (engineStatus !== 'qr_ready') {
      throw AppError.conflict(
        'WhatsApp session is still initializing. Please wait a few seconds and try again.'
      );
    }

    // Request pairing code from OpenWA (with automatic retry if engine is in transition)
    try {
      let pairingResult: { pairingCode: string; status: string };
      try {
        pairingResult = await openwaClient.requestPairingCode(session.id, normalized);
      } catch (firstErr: any) {
        // If 409 Conflict occurred because the previous socket closed or was in transition,
        // restart the session cleanly, wait for qr_ready, and retry once.
        if (firstErr instanceof OpenWARequestError && firstErr.status === 409) {
          logger.warn('[whatsapp] Pairing code 409 conflict, restarting session for retry', {
            sessionId: session.id,
          });
          await openwaClient.stopSession(session.id).catch(() => null);
          await openwaClient.startSession(session.id).catch(() => null);

          let retriedReady = false;
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            try {
              session = await openwaClient.getSession(session.id);
              if (String(session.status).toLowerCase() === 'qr_ready') {
                retriedReady = true;
                break;
              }
            } catch {
              // keep polling
            }
          }

          if (!retriedReady) {
            throw firstErr;
          }

          pairingResult = await openwaClient.requestPairingCode(session.id, normalized);
        } else {
          throw firstErr;
        }
      }

      await recordWhatsAppAudit({
        gymId,
        actorId: actorUserId,
        action: 'WHATSAPP_PAIRING_CODE_REQUESTED',
        targetId: session.id,
        metadata: {
          maskedPhone: maskWhatsAppNumber(normalized),
          status: pairingResult.status,
        },
      });

      return {
        pairingCode: pairingResult.pairingCode,
        status: pairingResult.status,
        connectionStatus: 'CONNECTING',
        expiresInSeconds: 300, // OpenWA / WhatsApp pairing codes are valid for ~5 minutes
      };
    } catch (err: any) {
      logger.error('[whatsapp] Pairing code generation failed', {
        gymId,
        status: err?.status,
        message: err instanceof Error ? err.message : 'unknown',
      });

      if (err instanceof OpenWARequestError) {
        if (err.status === 409) {
          throw AppError.conflict(
            'WhatsApp session is not ready to pair or another pairing attempt is active. Please wait a moment and try again.'
          );
        }
        if (err.status === 400) {
          throw AppError.validation(err.message || 'WhatsApp rejected the phone number.');
        }
        if (err.status === 429 || (err.status === 500 && (err.message?.includes('rate-overlimit') || err.message?.includes('429')))) {
          throw AppError.rateLimited(
            'WhatsApp is temporarily rate-limiting pairing code requests for this phone number. Please wait a couple of minutes before requesting a new code.'
          );
        }
        if (err.message) {
          throw AppError.conflict(err.message);
        }
      }
      if (err instanceof Error) {
        if (err.message?.includes('rate-overlimit') || err.message?.includes('429')) {
          throw AppError.rateLimited(
            'WhatsApp is temporarily rate-limiting pairing code requests for this phone number. Please wait a couple of minutes before requesting a new code.'
          );
        }
        if (err.message && !err.message.includes('unknown')) {
          throw AppError.conflict(err.message);
        }
      }
      throw AppError.conflict('Could not generate pairing code from WhatsApp. Please try again.');
    }
  }

  /** Resolve tenant ownership from the OpenWA webhook session id, never from the request body gym. */
  public async findByOpenWASessionId(sessionId: string): Promise<any | null> {
    if (!sessionId) return null;
    const rows = await db
      .select()
      .from(gymWhatsAppAccounts)
      .where(eq(gymWhatsAppAccounts.openwaSessionId, sessionId))
      .limit(1);
    return rows[0] ?? null;
  }

  public async assertCanSendLive(gymId: string): Promise<any> {
    const account = await this.getAccount(gymId);
    if (!account) throw AppError.forbidden(OWNER_ERRORS.ACCOUNT_NOT_CONNECTED);

    if (account.connectionStatus !== 'CONNECTED' || !account.openwaSessionId) {
      throw AppError.forbidden(
        account.connectionStatus === 'CONNECTION_EXPIRED' ||
          account.connectionStatus === 'REAUTHORIZATION_REQUIRED'
          ? OWNER_ERRORS.ACCOUNT_REQUIRES_REAUTH
          : statusOwnerMessage(account.connectionStatus as ConnectionStatus, account.statusReason)
      );
    }
    return account;
  }

  public evaluateAccount(accountStatus: string | null): ReturnType<typeof evaluateDelivery> {
    return evaluateDelivery({
      accountStatus,
      hasValidPhone: true,
      consentStatus: 'GRANTED',
      messageKind: 'UTILITY',
      windowOpen: false,
      template: null,
    });
  }
}

export const whatsappAccountService = new WhatsAppAccountService();
