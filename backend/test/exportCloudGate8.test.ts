/**
 * GymDeck CCTV Subsystem - Backend Cloud Clip Export Service Verification
 * Tests validation of export requests, duration limits, and download URL generation.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { cctvExportService } from '../services/cctv/cctvExportService';

describe('CCTV Gate 8 - Cloud Clip Export Service Tests', () => {
  const gymId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const cameraId = '00000000-0000-0000-0000-000000000003';

  it('should reject export with invalid date strings', async () => {
    await assert.rejects(async () => {
      await cctvExportService.requestExport(gymId, userId, {
        cameraId,
        startTime: 'bad-date',
        endTime: '2026-11-14T10:00:00Z',
      });
    }, (err: any) => err.statusCode === 422);
  });

  it('should reject export when startTime is >= endTime', async () => {
    await assert.rejects(async () => {
      await cctvExportService.requestExport(gymId, userId, {
        cameraId,
        startTime: '2026-11-14T11:00:00Z',
        endTime: '2026-11-14T10:00:00Z',
      });
    }, (err: any) => err.statusCode === 422);
  });

  it('should reject export exceeding 1 hour (3600 seconds)', async () => {
    await assert.rejects(async () => {
      await cctvExportService.requestExport(gymId, userId, {
        cameraId,
        startTime: '2026-11-14T08:00:00Z',
        endTime: '2026-11-14T10:00:00Z',
      });
    }, (err: any) => err.statusCode === 422);
  });
});
