/**
 * GymDeck CCTV Subsystem - Stream Session Authorization Service
 * Controls live WebRTC viewing authorization, short-lived ticket signing, and session closure.
 */

import * as crypto from 'crypto';
import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { signJwt } from '../../shared/security';
import { config } from '../../shared/config';
import { cctvAuditService } from './cctvAuditService';

export interface RequestStreamTicketParams {
  gymId: string;
  userId: string;
  userRole: string;
  cameraId: string;
  streamProfile?: 'MAIN' | 'SUB';
  clientType?: 'DESKTOP' | 'OWNER_MOBILE';
}

export interface StreamTicketPayload {
  sessionId: string;
  gymId: string;
  cameraId: string;
  userId: string;
  streamProfile: 'MAIN' | 'SUB';
  clientType: 'DESKTOP' | 'OWNER_MOBILE';
  expiresAt: string;
  ticket: string; // Signed JWT for WebRTC signaling
}

export class CctvSessionService {
  /**
   * Generates a short-lived (60 seconds) Stream Authorization Ticket.
   * Enforces strict RBAC and multi-tenant scoping.
   */
  async requestStreamTicket(params: RequestStreamTicketParams): Promise<StreamTicketPayload> {
    const pool = getDatabasePool();

    // 1. Verify Camera exists and belongs to this gym
    const camRes = await pool.query(
      'SELECT id, name, gateway_id, is_active FROM cctv_cameras WHERE id = $1 AND gym_id = $2',
      [params.cameraId, params.gymId]
    );

    if (camRes.rowCount === 0) {
      throw AppError.notFound('Camera not found or does not belong to this facility.');
    }

    const camera = camRes.rows[0];
    if (!camera.is_active) {
      throw AppError.validation('This camera is currently deactivated.');
    }

    // 2. RBAC check: Owners and Admins have full access. Other roles check cctv_user_permissions
    if (params.userRole !== 'OWNER' && params.userRole !== 'ADMIN') {
      const permRes = await pool.query(
        'SELECT can_view_live, allowed_camera_ids FROM cctv_user_permissions WHERE gym_id = $1 AND user_id = $2',
        [params.gymId, params.userId]
      );

      if (permRes.rowCount === 0 || !permRes.rows[0].can_view_live) {
        throw AppError.forbidden('You do not have authorization to view live CCTV feeds.');
      }

      const allowedCameras = permRes.rows[0].allowed_camera_ids;
      if (allowedCameras !== '*' && allowedCameras) {
        try {
          const list = JSON.parse(allowedCameras);
          if (Array.isArray(list) && !list.includes(params.cameraId)) {
            throw AppError.forbidden('You do not have authorization for this specific camera.');
          }
        } catch {
          // If parse fails and not wildcard, block
          throw AppError.forbidden('Camera authorization policy error.');
        }
      }
    }

    // 3. Create Session Record (TTL 4 hours before auto-expiry)
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    const streamProfile = params.streamProfile || 'SUB';
    const clientType = params.clientType || 'DESKTOP';

    const sessionQuery = `
      INSERT INTO cctv_stream_sessions (
        id, gym_id, camera_id, user_id, client_type, connection_type,
        stream_profile, status, started_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, 'LOCAL_LAN', $6, 'INITIALIZING', NOW(), $7)
    `;
    await pool.query(sessionQuery, [
      sessionId,
      params.gymId,
      params.cameraId,
      params.userId,
      clientType,
      streamProfile,
      expiresAt,
    ]);

    // 4. Sign Short-Lived Ticket (60s validity to initiate WebRTC handshake)
    const ticket = signJwt(
      {
        sub: params.userId,
        sessionId,
        gymId: params.gymId,
        email: `session-${sessionId}@gymdeck.cctv`,
        role: params.userRole as any,
        permissions: ['cctv.stream.view'],
        jti: crypto.randomUUID(),
      },
      config.JWT_SECRET,
      60 // 60 seconds TTL
    );

    await cctvAuditService.log({
      gymId: params.gymId,
      userId: params.userId,
      action: 'STREAM_VIEW_START',
      entityType: 'STREAM',
      entityId: sessionId,
      details: { cameraId: params.cameraId, profile: streamProfile, clientType },
    });

    return {
      sessionId,
      gymId: params.gymId,
      cameraId: params.cameraId,
      userId: params.userId,
      streamProfile,
      clientType,
      expiresAt,
      ticket,
    };
  }

  /**
   * Closes an active stream session and logs byte transfer metrics.
   */
  async closeSession(gymId: string, sessionId: string, bytesTransferred = 0): Promise<void> {
    const pool = getDatabasePool();
    const query = `
      UPDATE cctv_stream_sessions
      SET status = 'CLOSED',
          bytes_transferred = COALESCE($1, bytes_transferred),
          closed_at = NOW()
      WHERE id = $2 AND gym_id = $3
      RETURNING id, camera_id, user_id
    `;
    const res = await pool.query(query, [bytesTransferred, sessionId, gymId]);
    if ((res.rowCount ?? 0) > 0) {
      const sess = res.rows[0];
      await cctvAuditService.log({
        gymId,
        userId: sess.user_id,
        action: 'STREAM_VIEW_END',
        entityType: 'STREAM',
        entityId: sessionId,
        details: { bytesTransferred },
      });
    }
  }
}

export const cctvSessionService = new CctvSessionService();
