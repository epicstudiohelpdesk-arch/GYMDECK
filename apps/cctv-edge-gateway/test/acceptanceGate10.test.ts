/**
 * GymDeck CCTV Subsystem - Gate 10 Edge Gateway Acceptance & Performance Audit
 * Validates discovery auto-config, stream capacity limits, clip extraction, and service descriptors.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

import { StreamManager } from '../src/media/streamManager';
import { ClipExporter } from '../src/recordings/clipExporter';
import { RecordingAdapterFactory } from '../src/recordings/recordingAdapterFactory';
import { AutoConfigEngine } from '../src/engine/autoConfigEngine';

describe('CCTV Gate 10 - Edge Gateway Acceptance & Performance Audit', () => {
  it('Criterion 1 & 2: Automatic multi-brand discovery & auto-configuration', () => {
    const mockHikvisionInfo = {
      brand: 'HIKVISION',
      model: 'DS-7608NI-I2/8P',
      serialNumber: 'DS7608NI12345',
      firmwareVersion: 'V4.61.025',
      totalChannels: 8,
      supportsOnvifT: true,
      supportsOnvifG: true,
      supportsPtz: false,
    };

    const mockChannels = [
      {
        channelNumber: 1,
        name: 'Camera 1',
        locationZone: 'GENERAL',
        codec: 'H264' as const,
        capabilities: {
          supportsOnvifT: true,
          supportsOnvifG: true,
          supportsPtz: false,
          supportsAudio: true,
          supportsMotionEvents: true,
          supportsSubstream: true,
          maxFramerate: 25,
        },
      },
      {
        channelNumber: 2,
        name: 'Camera 2',
        locationZone: 'GENERAL',
        codec: 'H264' as const,
        capabilities: {
          supportsOnvifT: true,
          supportsOnvifG: true,
          supportsPtz: false,
          supportsAudio: true,
          supportsMotionEvents: true,
          supportsSubstream: true,
          maxFramerate: 25,
        },
      },
    ];

    const config = AutoConfigEngine.configure(mockHikvisionInfo, mockChannels);
    assert.strictEqual(config.deviceType, 'NVR');
    assert.strictEqual(config.defaults.gridStreamProfile, 'SUB');
    assert.strictEqual(config.defaults.fullscreenStreamProfile, 'MAIN');
    assert.strictEqual(config.channels[0]?.name, 'Reception & Entrance');
  });

  it('Criterion 3 & 4: Multi-grid layouts, stream limits, and adaptive substream profiles', () => {
    const streamMgr = new StreamManager({ maxConcurrentStreams: 16, idleTimeoutSeconds: 30 });

    for (let ch = 1; ch <= 16; ch++) {
      const stream = streamMgr.requestStream(
        `cam-${ch}`,
        ch,
        'SUB',
        `rtsp://192.168.1.100:554/Streaming/tracks/${ch}02`,
        '640x360',
        15
      );
      assert.strictEqual(stream.profile, 'SUB');
      assert.strictEqual(stream.resolution, '640x360');
      assert.strictEqual(stream.fps, 15);
      assert.strictEqual(stream.status, 'STREAMING');
    }

    assert.strictEqual(streamMgr.getAllActiveStreams().length, 16);

    assert.throws(() => {
      streamMgr.requestStream('cam-overflow', 17, 'SUB', 'rtsp://192.168.1.100:554/overflow');
    }, /CCTV Stream Capacity Reached/);

    streamMgr.stop();
  });

  it('Criterion 7 & 8: Historical recording indexing and MP4 clip container extraction', async () => {
    const adapter = RecordingAdapterFactory.getAdapter('HIKVISION', '192.168.1.100');
    const from = new Date('2026-11-14T00:00:00Z');
    const to = new Date('2026-11-14T04:00:00Z');

    const segments = await adapter.searchRecordings('cam-1', 1, from, to);
    assert.strictEqual(segments.length, 4);

    const exporter = new ClipExporter();
    const mp4 = exporter.createValidMp4Buffer(60, 1);
    assert.strictEqual(mp4.toString('ascii', 4, 8), 'ftyp');
    assert.strictEqual(mp4.toString('ascii', 8, 12), 'isom');
  });

  it('Criterion 10: Standalone edge gateway service descriptors for Linux (systemd) and macOS (launchd)', () => {
    const serviceDir = path.join(process.cwd(), 'service');
    const systemdFile = path.join(serviceDir, 'gymdeck-cctv-gateway.service');
    const launchdFile = path.join(serviceDir, 'com.gymdeck.cctv.gateway.plist');

    // Handle path whether running from root or apps/cctv-edge-gateway
    const sFile = fs.existsSync(systemdFile)
      ? systemdFile
      : path.join(process.cwd(), 'apps', 'cctv-edge-gateway', 'service', 'gymdeck-cctv-gateway.service');
    const lFile = fs.existsSync(launchdFile)
      ? launchdFile
      : path.join(process.cwd(), 'apps', 'cctv-edge-gateway', 'service', 'com.gymdeck.cctv.gateway.plist');

    assert.strictEqual(fs.existsSync(sFile), true);
    assert.strictEqual(fs.existsSync(lFile), true);

    const systemdContent = fs.readFileSync(sFile, 'utf8');
    assert.ok(systemdContent.includes('Restart=always'));
    assert.ok(systemdContent.includes('RestartSec=5s'));

    const launchdContent = fs.readFileSync(lFile, 'utf8');
    assert.ok(launchdContent.includes('<key>KeepAlive</key>'));
  });
});
