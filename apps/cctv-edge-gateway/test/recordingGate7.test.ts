/**
 * GymDeck CCTV Subsystem - Gate 7 Verification Suite
 * Tests recording availability search, vendor adapters (ONVIF Profile G, Hikvision, Dahua),
 * playback session lifecycle, seeking, speed variations, and local API IPC endpoints.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'http';
import { OnvifProfileGAdapter } from '../src/recordings/onvifProfileGAdapter';
import { HikvisionRecordingAdapter } from '../src/recordings/hikvisionRecordingAdapter';
import { DahuaRecordingAdapter } from '../src/recordings/dahuaRecordingAdapter';
import { RecordingAdapterFactory } from '../src/recordings/recordingAdapterFactory';
import { PlaybackEngine } from '../src/recordings/playbackEngine';
import { LocalApiServer } from '../src/server/localApi';

describe('CCTV Gate 7 - Recording Search & Playback Architecture', () => {
  const cameraId = 'cam-uuid-101';
  const credentials = { username: 'admin', password: 'SecretPassword123!' };

  describe('1. ONVIF Profile G Adapter', () => {
    const adapter = new OnvifProfileGAdapter('192.168.1.100', 80, 554, credentials);

    it('should report Profile G capabilities with seeking and variable speed', async () => {
      const caps = await adapter.getCapabilities(cameraId);
      assert.strictEqual(caps.supportsProfileG, true);
      assert.strictEqual(caps.supportsSeeking, true);
      assert.strictEqual(caps.supportsVariableSpeed, true);
      assert.strictEqual(caps.maxSpeed, 8);
    });

    it('should split time range into contiguous recording segments', async () => {
      const from = new Date('2026-11-14T00:00:00Z');
      const to = new Date('2026-11-14T03:00:00Z');
      const segments = await adapter.searchRecordings(cameraId, 1, from, to);

      assert.strictEqual(segments.length, 3);
      assert.strictEqual(segments[0].startTime, '2026-11-14T00:00:00.000Z');
      assert.strictEqual(segments[0].endTime, '2026-11-14T01:00:00.000Z');
      assert.strictEqual(segments[0].durationSeconds, 3600);
      assert.strictEqual(segments[0].recordingType, 'CONTINUOUS');
      assert.strictEqual(segments[0].storageLocation, 'ON_DEVICE_NVR');
    });

    it('should reject invalid time range where from >= to', async () => {
      const from = new Date('2026-11-14T03:00:00Z');
      const to = new Date('2026-11-14T01:00:00Z');
      await assert.rejects(async () => {
        await adapter.searchRecordings(cameraId, 1, from, to);
      }, /Search start time must precede end time/);
    });

    it('should construct standards-compliant ONVIF replay RTSP URL', async () => {
      const startTime = new Date('2026-11-14T02:30:00Z');
      const session = await adapter.createPlaybackSession(cameraId, 1, startTime, 2);

      assert.ok(session.sessionId.startsWith('pb_'));
      assert.strictEqual(session.speed, 2);
      assert.strictEqual(session.supportsSeeking, true);
      assert.ok(session.playbackRtspUrl.includes('onvif-replay?channel=1'));
      assert.ok(session.playbackRtspUrl.includes('scale=2'));
      assert.ok(session.whepPath.startsWith('playback/pb_'));
    });
  });

  describe('2. Hikvision Recording Adapter', () => {
    const adapter = new HikvisionRecordingAdapter('192.168.1.150', 80, 554, credentials);

    it('should report Hikvision capabilities with up to 16x playback speed', async () => {
      const caps = await adapter.getCapabilities(cameraId);
      assert.strictEqual(caps.supportsProfileG, true);
      assert.strictEqual(caps.maxSpeed, 16);
      assert.strictEqual(caps.retentionDaysEstimate, 45);
    });

    it('should format Hikvision track playback RTSP URLs with compact UTC timestamps', async () => {
      const startTime = new Date('2026-11-14T05:00:00Z');
      const session = await adapter.createPlaybackSession(cameraId, 2, startTime, 1);

      assert.ok(session.sessionId.startsWith('pb_hik_'));
      assert.strictEqual(session.channelNumber, 2);
      // Track for channel 2 main stream is 201
      assert.ok(session.playbackRtspUrl.includes('/Streaming/tracks/201?'));
      assert.ok(session.playbackRtspUrl.includes('starttime=20261114T050000Z'));
      assert.ok(session.supportedSpeeds.includes(16));
    });
  });

  describe('3. Dahua Recording Adapter', () => {
    const adapter = new DahuaRecordingAdapter('192.168.1.200', 80, 554, credentials);

    it('should format Dahua cam/playback RTSP URLs with underscore timestamps', async () => {
      const startTime = new Date('2026-11-14T08:15:30Z');
      const session = await adapter.createPlaybackSession(cameraId, 4, startTime, 1);

      assert.ok(session.sessionId.startsWith('pb_dah_'));
      assert.strictEqual(session.channelNumber, 4);
      assert.ok(session.playbackRtspUrl.includes('/cam/playback?channel=4'));
      assert.ok(session.playbackRtspUrl.includes('starttime=2026_11_14_08_15_30'));
    });
  });

  describe('4. Recording Adapter Factory', () => {
    it('should instantiate Hikvision adapter for Hikvision brands', () => {
      const ad = RecordingAdapterFactory.getAdapter('HIKVISION', '192.168.1.10');
      assert.strictEqual(ad.brand, 'HIKVISION');
    });

    it('should instantiate Dahua adapter for Dahua brands', () => {
      const ad = RecordingAdapterFactory.getAdapter('Dahua Technology', '192.168.1.20');
      assert.strictEqual(ad.brand, 'DAHUA');
    });

    it('should fallback to ONVIF Profile G for generic or third-party brands', () => {
      const ad = RecordingAdapterFactory.getAdapter('Axis Communications', '192.168.1.30');
      assert.strictEqual(ad.brand, 'ONVIF_PROFILE_G');
    });
  });

  describe('5. Playback Engine State & Control Management', () => {
    const engine = new PlaybackEngine();

    it('should manage full session lifecycle: start, speed change, seek, pause, resume, stop', async () => {
      const startTime = new Date('2026-11-14T12:00:00Z');
      const session = await engine.startSession(
        'HIKVISION',
        '192.168.1.100',
        80,
        554,
        credentials,
        cameraId,
        1,
        startTime,
        1
      );

      assert.strictEqual(session.status, 'PLAYING');
      assert.strictEqual(session.speed, 1);

      // Speed change to 4x
      const speedUpdated = engine.setSpeed(session.sessionId, 4);
      assert.strictEqual(speedUpdated.speed, 4);

      // Speed change to invalid speed should reject
      assert.throws(() => {
        engine.setSpeed(session.sessionId, 7.5);
      }, /Speed 7.5x is not supported/);

      // Pause and resume
      const paused = engine.pause(session.sessionId);
      assert.strictEqual(paused.status, 'PAUSED');

      const resumed = engine.resume(session.sessionId);
      assert.strictEqual(resumed.status, 'PLAYING');

      // Seek to new timestamp
      const seekTime = new Date('2026-11-14T14:30:00Z');
      const seeked = await engine.seek(session.sessionId, seekTime);
      assert.strictEqual(seeked.startTime, seekTime.toISOString());
      assert.ok(seeked.playbackRtspUrl.includes('20261114T143000Z'));

      // Stop session
      const stopped = engine.stopSession(session.sessionId);
      assert.strictEqual(stopped, true);
      assert.strictEqual(engine.getSession(session.sessionId), undefined);
    });

    engine.dispose();
  });

  describe('6. Local API Loopback Recording IPC Endpoints', () => {
    const localApi = new LocalApiServer();

    it('should handle /recordings/search and /recordings/playback-session over loopback', async () => {
      await localApi.start(0);
      const testPort = localApi.getPort();

      // 1. Search recordings
      const searchRes = await fetch(`http://127.0.0.1:${testPort}/recordings/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: 'HIKVISION',
          ipAddress: '192.168.1.50',
          cameraId,
          channelNumber: 1,
          from: '2026-11-14T09:00:00Z',
          to: '2026-11-14T11:00:00Z',
        }),
      });

      assert.strictEqual(searchRes.status, 200);
      const searchData = await searchRes.json();
      assert.strictEqual(searchData.success, true);
      assert.strictEqual(searchData.segments.length, 2);

      // 2. Start playback session
      const pbRes = await fetch(`http://127.0.0.1:${testPort}/recordings/playback-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: 'HIKVISION',
          ipAddress: '192.168.1.50',
          cameraId,
          channelNumber: 1,
          startTime: '2026-11-14T09:30:00Z',
          speed: 1,
        }),
      });

      assert.strictEqual(pbRes.status, 201);
      const pbData = await pbRes.json();
      assert.strictEqual(pbData.success, true);
      const sessionId = pbData.session.sessionId;

      // 3. Control speed
      const speedRes = await fetch(`http://127.0.0.1:${testPort}/recordings/playback-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'SPEED',
          speed: 2,
        }),
      });
      assert.strictEqual(speedRes.status, 200);
      const speedData = await speedRes.json();
      assert.strictEqual(speedData.session.speed, 2);

      // 4. Teardown session
      const delRes = await fetch(`http://127.0.0.1:${testPort}/recordings/playback-session/${sessionId}`, {
        method: 'DELETE',
      });
      assert.strictEqual(delRes.status, 200);

      await localApi.stop();
    });
  });
});
