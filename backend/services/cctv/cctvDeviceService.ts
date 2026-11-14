/**
 * GymDeck CCTV Subsystem - Device & Camera Management Service
 * Handles DVR/NVR registration, channel discovery persistence, and camera naming.
 * All device credentials are encrypted at rest with AES-256-GCM.
 */

import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { encryptField, decryptField } from '../../shared/security/fieldEncryption';
import { toRecorderDto, toCameraDto, RecorderDto, CameraDto } from './dto';
import { cctvAuditService } from './cctvAuditService';

export interface RegisterRecorderInput {
  gatewayId: string;
  brand: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  ipAddress: string;
  onvifPort?: number;
  rtspPort?: number;
  httpPort?: number;
  macAddress?: string;
  username: string;
  password: string;
  totalChannels: number;
}

export interface DiscoveredChannelInput {
  channelNumber: number;
  name?: string;
  locationZone?: string;
  ipAddress?: string;
  onvifToken?: string;
  mainRtspUrl?: string;
  subRtspUrl?: string;
  codec?: string;
  resolutionMain?: string;
  resolutionSub?: string;
  fps?: number;
  capabilities?: {
    supportsOnvifT?: boolean;
    supportsOnvifG?: boolean;
    supportsPtz?: boolean;
    supportsAudio?: boolean;
    supportsMotionEvents?: boolean;
    supportsSubstream?: boolean;
    maxFramerate?: number;
  };
}

export class CctvDeviceService {
  /**
   * Registers a discovered or manually configured CCTV recorder (DVR/NVR).
   * Encrypts the recorder password using AES-256-GCM before database insertion.
   */
  async registerRecorder(
    gymId: string,
    userId: string,
    input: RegisterRecorderInput
  ): Promise<RecorderDto> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify gateway belongs to this gym
      const gwCheck = await client.query(
        'SELECT id FROM cctv_gateways WHERE id = $1 AND gym_id = $2 AND status <> $3',
        [input.gatewayId, gymId, 'REVOKED']
      );
      if (gwCheck.rowCount === 0) {
        throw AppError.forbidden('Gateway does not exist or has been revoked.');
      }

      // Insert recorder record
      const recQuery = `
        INSERT INTO cctv_recorders (
          gateway_id, gym_id, brand, model, serial_number, firmware_version,
          ip_address, onvif_port, rtsp_port, http_port, mac_address, status, total_channels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ONLINE', $12)
        RETURNING *
      `;
      const recRes = await client.query(recQuery, [
        input.gatewayId,
        gymId,
        input.brand.toUpperCase(),
        input.model || null,
        input.serialNumber || null,
        input.firmwareVersion || null,
        input.ipAddress,
        input.onvifPort || 80,
        input.rtspPort || 554,
        input.httpPort || 80,
        input.macAddress || null,
        input.totalChannels,
      ]);
      const recorder = recRes.rows[0];

      // Encrypt device password with AES-256-GCM
      const encryptedPassword = encryptField(input.password);
      const credQuery = `
        INSERT INTO cctv_credentials (
          gym_id, recorder_id, username, encrypted_password, credential_type, last_verified_at
        ) VALUES ($1, $2, $3, $4, 'ONVIF', NOW())
      `;
      await client.query(credQuery, [gymId, recorder.id, input.username, encryptedPassword]);

      await client.query('COMMIT');

      await cctvAuditService.log({
        gymId,
        userId,
        action: 'RECORDER_REGISTERED',
        entityType: 'RECORDER',
        entityId: recorder.id,
        details: { brand: input.brand, ipAddress: input.ipAddress, totalChannels: input.totalChannels },
      });

      return toRecorderDto(recorder);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Syncs discovered camera channels for a recorder.
   */
  async syncCameras(
    gymId: string,
    recorderId: string,
    channels: DiscoveredChannelInput[]
  ): Promise<CameraDto[]> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Fetch recorder to get gatewayId and verify tenant ownership
      const recRes = await client.query(
        'SELECT id, gateway_id FROM cctv_recorders WHERE id = $1 AND gym_id = $2',
        [recorderId, gymId]
      );
      if (recRes.rowCount === 0) {
        throw AppError.notFound('Recorder not found.');
      }
      const gatewayId = recRes.rows[0].gateway_id;

      const results: CameraDto[] = [];

      for (const ch of channels) {
        const defaultName = ch.name || `Camera ${ch.channelNumber}`;
        const mainEncrypted = ch.mainRtspUrl ? encryptField(ch.mainRtspUrl) : null;
        const subEncrypted = ch.subRtspUrl ? encryptField(ch.subRtspUrl) : null;

        const upsertQuery = `
          INSERT INTO cctv_cameras (
            recorder_id, gateway_id, gym_id, channel_number, name, location_zone,
            ip_address, onvif_token, main_rtsp_url_encrypted, sub_rtsp_url_encrypted,
            codec, resolution_main, resolution_sub, fps, is_active, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE, 'IDLE')
          ON CONFLICT (recorder_id, channel_number) DO UPDATE
          SET name = EXCLUDED.name,
              location_zone = COALESCE(cctv_cameras.location_zone, EXCLUDED.location_zone),
              ip_address = EXCLUDED.ip_address,
              onvif_token = EXCLUDED.onvif_token,
              main_rtsp_url_encrypted = COALESCE(EXCLUDED.main_rtsp_url_encrypted, cctv_cameras.main_rtsp_url_encrypted),
              sub_rtsp_url_encrypted = COALESCE(EXCLUDED.sub_rtsp_url_encrypted, cctv_cameras.sub_rtsp_url_encrypted),
              codec = EXCLUDED.codec,
              resolution_main = EXCLUDED.resolution_main,
              resolution_sub = EXCLUDED.resolution_sub,
              fps = EXCLUDED.fps,
              updated_at = NOW()
          RETURNING *
        `;

        const camRes = await client.query(upsertQuery, [
          recorderId,
          gatewayId,
          gymId,
          ch.channelNumber,
          defaultName,
          ch.locationZone || 'GENERAL',
          ch.ipAddress || null,
          ch.onvifToken || null,
          mainEncrypted,
          subEncrypted,
          ch.codec || 'H264',
          ch.resolutionMain || '1920x1080',
          ch.resolutionSub || '640x360',
          ch.fps || 15,
        ]);
        const cam = camRes.rows[0];

        // Upsert capabilities
        const caps = ch.capabilities || {};
        const capQuery = `
          INSERT INTO cctv_camera_capabilities (
            camera_id, supports_onvif_t, supports_onvif_g, supports_ptz,
            supports_audio, supports_motion_events, supports_substream,
            supported_codecs, max_framerate, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (camera_id) DO UPDATE
          SET supports_onvif_t = EXCLUDED.supports_onvif_t,
              supports_onvif_g = EXCLUDED.supports_onvif_g,
              supports_ptz = EXCLUDED.supports_ptz,
              supports_audio = EXCLUDED.supports_audio,
              supports_motion_events = EXCLUDED.supports_motion_events,
              supports_substream = EXCLUDED.supports_substream,
              supported_codecs = EXCLUDED.supported_codecs,
              max_framerate = EXCLUDED.max_framerate,
              updated_at = NOW()
        `;
        await client.query(capQuery, [
          cam.id,
          caps.supportsOnvifT ?? true,
          caps.supportsOnvifG ?? false,
          caps.supportsPtz ?? false,
          caps.supportsAudio ?? false,
          caps.supportsMotionEvents ?? false,
          caps.supportsSubstream ?? true,
          ch.codec || 'H264',
          caps.maxFramerate ?? 30,
        ]);

        results.push(toCameraDto(cam, caps));
      }

      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all cameras for a gym, with their capabilities and status.
   */
  async getCameras(gymId: string): Promise<CameraDto[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT c.*,
             cap.supports_onvif_t, cap.supports_onvif_g, cap.supports_ptz,
             cap.supports_audio, cap.supports_motion_events, cap.supports_substream,
             cap.max_framerate
      FROM cctv_cameras c
      LEFT JOIN cctv_camera_capabilities cap ON cap.camera_id = c.id
      WHERE c.gym_id = $1 AND c.is_active = TRUE
      ORDER BY c.channel_number ASC
    `;
    const res = await pool.query(query, [gymId]);
    return res.rows.map((row) => toCameraDto(row, row));
  }

  /**
   * Updates camera user-friendly name and location zone (e.g. "Reception", "Weight Floor").
   */
  async updateCamera(
    gymId: string,
    cameraId: string,
    userId: string,
    updates: { name?: string; locationZone?: string; isActive?: boolean }
  ): Promise<CameraDto> {
    const pool = getDatabasePool();
    const query = `
      UPDATE cctv_cameras
      SET name = COALESCE($1, name),
          location_zone = COALESCE($2, location_zone),
          is_active = COALESCE($3, is_active),
          updated_at = NOW()
      WHERE id = $4 AND gym_id = $5
      RETURNING *
    `;
    const res = await pool.query(query, [
      updates.name || null,
      updates.locationZone || null,
      updates.isActive !== undefined ? updates.isActive : null,
      cameraId,
      gymId,
    ]);

    if (res.rowCount === 0) {
      throw AppError.notFound('Camera not found.');
    }

    const cam = res.rows[0];

    await cctvAuditService.log({
      gymId,
      userId,
      action: 'CAMERA_RENAMED',
      entityType: 'CAMERA',
      entityId: cameraId,
      details: updates,
    });

    return toCameraDto(cam);
  }

  /**
   * Retrieves all registered recorders for a gym.
   */
  async getRecorders(gymId: string): Promise<RecorderDto[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT * FROM cctv_recorders
      WHERE gym_id = $1
      ORDER BY created_at ASC
    `;
    const res = await pool.query(query, [gymId]);
    return res.rows.map(toRecorderDto);
  }

  /**
   * Internal helper: retrieves a camera with its associated recorder and decrypted credentials.
   * Internal only: never exposed directly in public API routes.
   */
  async getCameraWithRecorder(
    gymId: string,
    cameraId: string
  ): Promise<{
    camera: {
      id: string;
      name: string;
      channelNumber: number;
      mainRtspUrl: string | null;
      subRtspUrl: string | null;
      codec: string;
    };
    recorder: {
      id: string;
      gatewayId: string;
      brand: string;
      model: string | null;
      ipAddress: string;
      httpPort: number;
      rtspPort: number;
      username: string;
      password: string;
    };
  }> {
    const pool = getDatabasePool();
    const query = `
      SELECT c.id as camera_id, c.name as camera_name, c.channel_number,
             c.main_rtsp_url, c.sub_rtsp_url, c.codec,
             r.id as recorder_id, r.gateway_id, r.brand, r.model,
             r.ip_address, r.http_port, r.rtsp_port, r.username, r.password_encrypted
      FROM cctv_cameras c
      JOIN cctv_recorders r ON r.id = c.recorder_id
      WHERE c.id = $1 AND c.gym_id = $2 AND c.is_active = TRUE
    `;
    const res = await pool.query(query, [cameraId, gymId]);
    if (res.rowCount === 0) {
      throw AppError.notFound('Camera or associated recorder not found.');
    }

    const row = res.rows[0];
    const decryptedPassword = decryptField(row.password_encrypted) || '';

    return {
      camera: {
        id: row.camera_id,
        name: row.camera_name,
        channelNumber: row.channel_number,
        mainRtspUrl: row.main_rtsp_url,
        subRtspUrl: row.sub_rtsp_url,
        codec: row.codec,
      },
      recorder: {
        id: row.recorder_id,
        gatewayId: row.gateway_id,
        brand: row.brand,
        model: row.model,
        ipAddress: row.ip_address,
        httpPort: row.http_port || 80,
        rtspPort: row.rtsp_port || 554,
        username: row.username,
        password: decryptedPassword,
      },
    };
  }
}

export const cctvDeviceService = new CctvDeviceService();
