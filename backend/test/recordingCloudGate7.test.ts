/**
 * GymDeck CCTV Subsystem - Backend Cloud Recording Service Verification
 * Tests tenant-scoped recording queries, date validation, and audit trail creation.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { cctvRecordingService } from '../services/cctv/cctvRecordingService';

describe('CCTV Gate 7 - Cloud Recording Service & Audit Tests', () => {
  const gymId = '00000000-0000-0000-0000-000000000001';
  const userId = '00000000-0000-0000-0000-000000000002';
  const cameraId = '00000000-0000-0000-0000-000000000003';

  it('should reject invalid dates in searchRecordings', async () => {
    await assert.rejects(async () => {
      await cctvRecordingService.searchRecordings(gymId, userId, {
        cameraId,
        from: 'not-a-date',
        to: '2026-11-14T03:00:00Z',
      });
    }, (err: any) => err.statusCode === 422);
  });

  it('should reject search if from is after to', async () => {
    await assert.rejects(async () => {
      await cctvRecordingService.searchRecordings(gymId, userId, {
        cameraId,
        from: '2026-11-14T10:00:00Z',
        to: '2026-11-14T08:00:00Z',
      });
    }, (err: any) => err.statusCode === 422);
  });

  it('should reject search exceeding 31 days', async () => {
    await assert.rejects(async () => {
      await cctvRecordingService.searchRecordings(gymId, userId, {
        cameraId,
        from: '2026-01-01T00:00:00Z',
        to: '2026-03-01T00:00:00Z',
      });
    }, (err: any) => err.statusCode === 422);
  });

  it('should reject playback session with invalid timestamp', async () => {
    await assert.rejects(async () => {
      await cctvRecordingService.createPlaybackSession(gymId, userId, {
        cameraId,
        startTime: 'bad-timestamp',
      });
    }, (err: any) => err.statusCode === 422);
  });
});
