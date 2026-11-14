/**
 * GymDeck CCTV Subsystem - Security & Privacy Audit Logger
 * Records immutable audit logs for all camera views, clip exports, credential updates, and gateway events.
 */

import { getDatabasePool } from '../../shared/database';
import { logger } from '../../shared/logging';

export type CctvAuditAction =
  | 'GATEWAY_ENROLLMENT_TOKEN_CREATED'
  | 'GATEWAY_ENROLLED'
  | 'GATEWAY_REVOKED'
  | 'RECORDER_REGISTERED'
  | 'RECORDER_UPDATED'
  | 'RECORDER_DELETED'
  | 'CAMERA_RENAMED'
  | 'CAMERA_ZONE_UPDATED'
  | 'STREAM_VIEW_START'
  | 'STREAM_VIEW_END'
  | 'CLIP_EXPORT_REQUESTED'
  | 'CLIP_EXPORT_COMPLETED'
  | 'CLIP_DOWNLOADED'
  | 'RECORDINGS_SEARCHED'
  | 'PLAYBACK_STARTED'
  | 'PLAYBACK_STOPPED'
  | 'CREDENTIALS_UPDATED';

export interface AuditLogParams {
  gymId: string;
  userId?: string | null;
  action: CctvAuditAction;
  entityType: 'GATEWAY' | 'RECORDER' | 'CAMERA' | 'STREAM' | 'EXPORT' | 'CREDENTIAL' | 'PLAYBACK';
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, any>;
}

export class CctvAuditService {
  async log(params: AuditLogParams): Promise<void> {
    try {
      const pool = getDatabasePool();
      const query = `
        INSERT INTO cctv_audit_logs (
          gym_id, user_id, action, entity_type, entity_id, ip_address, user_agent, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const values = [
        params.gymId,
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId || null,
        params.ipAddress || null,
        params.userAgent || null,
        params.details ? JSON.stringify(params.details) : null,
      ];
      await pool.query(query, values);
    } catch (err) {
      // Never crash the primary flow on audit log failures, but log with error severity
      logger.error('[CCTV Audit] Failed to record audit log', { error: err, params });
    }
  }

  async getRecentLogs(gymId: string, limit = 50): Promise<any[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT id, gym_id, user_id, action, entity_type, entity_id, ip_address, details, created_at
      FROM cctv_audit_logs
      WHERE gym_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const res = await pool.query(query, [gymId, Math.min(limit, 100)]);
    return res.rows.map((row) => ({
      id: row.id,
      gymId: row.gym_id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      ipAddress: row.ip_address,
      details: row.details ? JSON.parse(row.details) : null,
      createdAt: row.created_at,
    }));
  }
}

export const cctvAuditService = new CctvAuditService();
