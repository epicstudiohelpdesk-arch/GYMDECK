/**
 * GymDeck CCTV Subsystem - Video Clip Export Service
 * Orchestrates clip extraction requests, tracks remuxing job progress,
 * enforces storage quotas, and provides secure, time-limited download URLs.
 */

import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { cctvDeviceService } from './cctvDeviceService';
import { cctvAuditService } from './cctvAuditService';
import * as crypto from 'crypto';

export interface RequestExportInput {
  cameraId: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  notes?: string;
}

export interface ExportJobDto {
  id: string;
  gymId: string;
  cameraId: string;
  cameraName?: string;
  channelNumber?: number;
  requestedByUserId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progressPercent: number;
  fileSizeBytes: number;
  downloadUrl?: string | null;
  expiresAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CctvExportService {
  private maxDurationSeconds = 3600; // 1-hour maximum per clip
  private maxConcurrentPerGym = 3;

  /**
   * Enqueues a new video clip export job.
   */
  async requestExport(
    gymId: string,
    userId: string,
    input: RequestExportInput
  ): Promise<ExportJobDto> {
    const fromDate = new Date(input.startTime);
    const toDate = new Date(input.endTime);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw AppError.validation('Invalid ISO 8601 timestamps for clip export.');
    }

    if (fromDate >= toDate) {
      throw AppError.validation('Export start time must precede end time.');
    }

    const durationSeconds = Math.round((toDate.getTime() - fromDate.getTime()) / 1000);
    if (durationSeconds > this.maxDurationSeconds) {
      throw AppError.validation(`Export duration cannot exceed ${this.maxDurationSeconds} seconds (1 hour).`);
    }

    // Verify camera exists and belongs to this gym
    const details = await cctvDeviceService.getCameraWithRecorder(gymId, input.cameraId);

    const pool = getDatabasePool();

    // Check concurrent export limit for this gym
    const activeRes = await pool.query(
      `SELECT COUNT(*)::int as active_count
       FROM cctv_export_jobs
       WHERE gym_id = $1 AND status IN ('QUEUED', 'PROCESSING')`,
      [gymId]
    );

    const activeCount = activeRes.rows[0]?.active_count || 0;
    if (activeCount >= this.maxConcurrentPerGym) {
      throw AppError.conflict(
        `Gym currently has ${activeCount} active export jobs. Please wait for them to finish before starting a new export.`
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7-day retention
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const downloadUrl = `/v1/cctv/exports/download/${downloadToken}`;

    const insertQuery = `
      INSERT INTO cctv_export_jobs (
        gym_id, camera_id, requested_by_user_id, start_time, end_time,
        status, progress_percent, download_url, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'QUEUED', 0, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const res = await pool.query(insertQuery, [
      gymId,
      input.cameraId,
      userId,
      fromDate.toISOString(),
      toDate.toISOString(),
      downloadUrl,
      expiresAt.toISOString(),
    ]);

    const jobRow = res.rows[0];

    await cctvAuditService.log({
      gymId,
      userId,
      action: 'CLIP_EXPORT_REQUESTED',
      entityType: 'EXPORT',
      entityId: jobRow.id,
      details: {
        cameraId: input.cameraId,
        cameraName: details.camera.name,
        channelNumber: details.camera.channelNumber,
        startTime: input.startTime,
        endTime: input.endTime,
        durationSeconds,
        notes: input.notes,
      },
    });

    return this.toExportDto(jobRow, details.camera.name, details.camera.channelNumber);
  }

  /**
   * Retrieves export history for a gym.
   */
  async getExports(
    gymId: string,
    limit = 20,
    offset = 0
  ): Promise<{ total: number; exports: ExportJobDto[] }> {
    const pool = getDatabasePool();

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as total FROM cctv_export_jobs WHERE gym_id = $1`,
      [gymId]
    );
    const total = countRes.rows[0]?.total || 0;

    const listQuery = `
      SELECT j.*, c.name as camera_name, c.channel_number
      FROM cctv_export_jobs j
      LEFT JOIN cctv_cameras c ON c.id = j.camera_id
      WHERE j.gym_id = $1
      ORDER BY j.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const res = await pool.query(listQuery, [gymId, limit, offset]);
    const exports = res.rows.map((r) => this.toExportDto(r, r.camera_name, r.channel_number));

    return { total, exports };
  }

  /**
   * Retrieves single export job by ID with tenant verification.
   */
  async getExportById(gymId: string, jobId: string): Promise<ExportJobDto> {
    const pool = getDatabasePool();
    const query = `
      SELECT j.*, c.name as camera_name, c.channel_number
      FROM cctv_export_jobs j
      LEFT JOIN cctv_cameras c ON c.id = j.camera_id
      WHERE j.id = $1 AND j.gym_id = $2
    `;
    const res = await pool.query(query, [jobId, gymId]);
    if (res.rowCount === 0) {
      throw AppError.notFound('Export job not found.');
    }

    const r = res.rows[0];
    return this.toExportDto(r, r.camera_name, r.channel_number);
  }

  /**
   * Generates a verified download URL for a completed export.
   */
  async getDownloadTicket(
    gymId: string,
    userId: string,
    jobId: string
  ): Promise<{ downloadUrl: string; expiresAt: string; fileSizeBytes: number }> {
    const pool = getDatabasePool();
    const query = `
      SELECT * FROM cctv_export_jobs
      WHERE id = $1 AND gym_id = $2
    `;
    const res = await pool.query(query, [jobId, gymId]);
    if (res.rowCount === 0) {
      throw AppError.notFound('Export job not found.');
    }

    const job = res.rows[0];
    if (job.status !== 'COMPLETED') {
      throw AppError.conflict(`Export job is not ready for download. Current status: ${job.status}`);
    }

    await cctvAuditService.log({
      gymId,
      userId,
      action: 'CLIP_DOWNLOADED',
      entityType: 'EXPORT',
      entityId: jobId,
      details: {
        fileSizeBytes: job.file_size_bytes,
      },
    });

    return {
      downloadUrl: job.download_url || `/v1/cctv/exports/${jobId}/file`,
      expiresAt: job.expires_at ? new Date(job.expires_at).toISOString() : new Date(Date.now() + 3600000).toISOString(),
      fileSizeBytes: Number(job.file_size_bytes || 0),
    };
  }

  private toExportDto(row: any, cameraName?: string, channelNumber?: number): ExportJobDto {
    const startMs = new Date(row.start_time).getTime();
    const endMs = new Date(row.end_time).getTime();
    const durationSeconds = Math.round((endMs - startMs) / 1000);

    return {
      id: row.id,
      gymId: row.gym_id,
      cameraId: row.camera_id,
      cameraName: cameraName || undefined,
      channelNumber: channelNumber || undefined,
      requestedByUserId: row.requested_by_user_id,
      startTime: new Date(row.start_time).toISOString(),
      endTime: new Date(row.end_time).toISOString(),
      durationSeconds,
      status: row.status,
      progressPercent: row.progress_percent,
      fileSizeBytes: Number(row.file_size_bytes || 0),
      downloadUrl: row.download_url || null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      errorMessage: row.error_message || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

export const cctvExportService = new CctvExportService();
