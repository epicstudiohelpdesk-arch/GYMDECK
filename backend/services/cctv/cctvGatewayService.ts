/**
 * GymDeck CCTV Subsystem - Edge Gateway Service
 * Manages gateway enrollment, identity attestation, heartbeats, and status monitoring.
 */

import * as crypto from 'crypto';
import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { generateSecureToken, hashToken, signJwt } from '../../shared/security';
import { config } from '../../shared/config';
import { toGatewayDto, GatewayDto } from './dto';
import { cctvAuditService } from './cctvAuditService';

export interface HostInfo {
  hostOs?: string;
  hostLocalIp?: string;
  version?: string;
  name?: string;
}

export interface GatewayHeartbeatMetrics {
  cpuUsagePercent?: number;
  memoryUsageMb?: number;
  diskFreeGb?: number;
  activeStreamsCount?: number;
  networkInKbps?: number;
  networkOutKbps?: number;
}

export class CctvGatewayService {
  /**
   * Generates a single-use enrollment token for an owner to register an edge gateway.
   * TTL: 15 minutes.
   */
  async generateEnrollmentToken(gymId: string, requestedByUserId: string): Promise<{ token: string; expiresAt: string }> {
    const pool = getDatabasePool();
    const rawToken = `gd_cctv_enroll_${generateSecureToken(24)}`;
    const tokenHash = hashToken(rawToken);

    // Create a pending gateway row or update existing enrolling record
    const query = `
      INSERT INTO cctv_gateways (
        gym_id, name, status, enrollment_token_hash, version
      ) VALUES ($1, $2, 'ENROLLING', $3, '1.0.0')
      RETURNING id, created_at
    `;
    const res = await pool.query(query, [gymId, 'Primary Edge Gateway', tokenHash]);
    const gatewayId = res.rows[0].id;

    await cctvAuditService.log({
      gymId,
      userId: requestedByUserId,
      action: 'GATEWAY_ENROLLMENT_TOKEN_CREATED',
      entityType: 'GATEWAY',
      entityId: gatewayId,
    });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return { token: rawToken, expiresAt };
  }

  /**
   * Called by the local Edge Gateway binary during initial installation/handshake.
   * Validates the single-use enrollment token and returns a permanent device JWT.
   */
  async enrollGateway(
    token: string,
    hostInfo: HostInfo,
    publicKey?: string
  ): Promise<{ gatewayId: string; gymId: string; deviceToken: string }> {
    const pool = getDatabasePool();
    const tokenHash = hashToken(token);

    // Find the pending gateway by enrollment token
    const findQuery = `
      SELECT id, gym_id, status, created_at
      FROM cctv_gateways
      WHERE enrollment_token_hash = $1
    `;
    const findRes = await pool.query(findQuery, [tokenHash]);

    if (findRes.rowCount === 0) {
      throw AppError.unauthorized('Invalid or expired gateway enrollment token.');
    }

    const gateway = findRes.rows[0];

    // Check token age (must be < 15 minutes old)
    const ageMs = Date.now() - new Date(gateway.created_at).getTime();
    if (ageMs > 15 * 60 * 1000) {
      throw AppError.unauthorized('Enrollment token has expired. Please generate a new one from GymDeck Desktop.');
    }

    // Generate permanent device authentication token
    const deviceAuthRaw = generateSecureToken(32);
    const deviceAuthHash = hashToken(deviceAuthRaw);

    // Activate the gateway
    const updateQuery = `
      UPDATE cctv_gateways
      SET status = 'ONLINE',
          name = COALESCE($1, name),
          host_os = $2,
          host_local_ip = $3,
          version = COALESCE($4, version),
          public_key = $5,
          enrollment_token_hash = NULL,
          device_auth_token_hash = $6,
          last_heartbeat_at = NOW(),
          updated_at = NOW()
      WHERE id = $7
      RETURNING id, gym_id, name, host_os, host_local_ip, version, status
    `;
    await pool.query(updateQuery, [
      hostInfo.name || 'Primary Edge Gateway',
      hostInfo.hostOs || 'UNKNOWN',
      hostInfo.hostLocalIp || null,
      hostInfo.version || '1.0.0',
      publicKey || null,
      deviceAuthHash,
      gateway.id,
    ]);

    // Issue signed device JWT for persistent gateway communications
    const deviceToken = signJwt(
      {
        sub: gateway.id,
        gymId: gateway.gym_id,
        email: `gateway-${gateway.id}@gymdeck.edge`,
        role: 'DESKTOP_SYNC',
        jti: crypto.randomUUID(),
      },
      config.JWT_SECRET,
      86400 * 365 // 1 year
    );

    await cctvAuditService.log({
      gymId: gateway.gym_id,
      action: 'GATEWAY_ENROLLED',
      entityType: 'GATEWAY',
      entityId: gateway.id,
      details: { hostOs: hostInfo.hostOs, hostLocalIp: hostInfo.hostLocalIp },
    });

    return {
      gatewayId: gateway.id,
      gymId: gateway.gym_id,
      deviceToken,
    };
  }

  /**
   * Ingests periodic health metrics from the running Edge Gateway.
   */
  async processHeartbeat(gatewayId: string, gymId: string, metrics: GatewayHeartbeatMetrics): Promise<void> {
    const pool = getDatabasePool();

    // Verify gateway belongs to gym
    const verifyQuery = `
      UPDATE cctv_gateways
      SET status = 'ONLINE',
          last_heartbeat_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND gym_id = $2 AND status <> 'REVOKED'
      RETURNING id
    `;
    const verifyRes = await pool.query(verifyQuery, [gatewayId, gymId]);
    if (verifyRes.rowCount === 0) {
      throw AppError.forbidden('Gateway not recognized or has been revoked.');
    }

    // Insert heartbeat record
    const metricQuery = `
      INSERT INTO cctv_gateway_heartbeats (
        gateway_id, gym_id, cpu_usage_percent, memory_usage_mb, disk_free_gb,
        active_streams_count, network_in_kbps, network_out_kbps, reported_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;
    await pool.query(metricQuery, [
      gatewayId,
      gymId,
      metrics.cpuUsagePercent ?? 0.0,
      metrics.memoryUsageMb ?? 0,
      metrics.diskFreeGb ?? 0,
      metrics.activeStreamsCount ?? 0,
      metrics.networkInKbps ?? 0,
      metrics.networkOutKbps ?? 0,
    ]);
  }

  /**
   * Retrieves active gateway status for a tenant.
   */
  async getGatewayStatus(gymId: string): Promise<GatewayDto | null> {
    const pool = getDatabasePool();
    const query = `
      SELECT id, gym_id, name, host_os, host_local_ip, version, status, last_heartbeat_at, created_at
      FROM cctv_gateways
      WHERE gym_id = $1 AND status <> 'REVOKED'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = await pool.query(query, [gymId]);
    if (res.rowCount === 0) return null;

    const row = res.rows[0];
    // Check if heartbeat is stale (> 90 seconds)
    let status = row.status;
    if (status === 'ONLINE' && row.last_heartbeat_at) {
      const staleMs = Date.now() - new Date(row.last_heartbeat_at).getTime();
      if (staleMs > 90 * 1000) {
        status = 'OFFLINE';
      }
    }

    return toGatewayDto({ ...row, status });
  }

  /**
   * Revokes a gateway.
   */
  async revokeGateway(gatewayId: string, gymId: string, requestedByUserId: string): Promise<void> {
    const pool = getDatabasePool();
    const query = `
      UPDATE cctv_gateways
      SET status = 'REVOKED',
          device_auth_token_hash = NULL,
          updated_at = NOW()
      WHERE id = $1 AND gym_id = $2
      RETURNING id
    `;
    const res = await pool.query(query, [gatewayId, gymId]);
    if (res.rowCount === 0) {
      throw AppError.notFound('Gateway not found.');
    }

    await cctvAuditService.log({
      gymId,
      userId: requestedByUserId,
      action: 'GATEWAY_REVOKED',
      entityType: 'GATEWAY',
      entityId: gatewayId,
    });
  }
}

export const cctvGatewayService = new CctvGatewayService();
