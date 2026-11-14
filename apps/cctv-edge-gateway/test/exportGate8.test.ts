/**
 * GymDeck CCTV Subsystem - Gate 8 Verification Suite
 * Tests clip export pipeline, MP4 box structure validation, progress tracking,
 * max-duration quota enforcement, and local API streaming.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { ClipExporter } from '../src/recordings/clipExporter';
import { LocalApiServer } from '../src/server/localApi';

describe('CCTV Gate 8 - Video Clip Export Architecture', () => {
  const tmpExportDir = path.join(process.cwd(), 'tmp_test_exports');
  const exporter = new ClipExporter(tmpExportDir);

  it('1. should construct standards-compliant ISO MP4 container box headers', () => {
    const durationSec = 120;
    const mp4Buffer = exporter.createValidMp4Buffer(durationSec, 1);

    // Box header structure: [32-bit size][4-byte 'ftyp'][4-byte major_brand]
    const boxSize = mp4Buffer.readUInt32BE(0);
    assert.strictEqual(boxSize, 32);

    const boxType = mp4Buffer.toString('ascii', 4, 8);
    assert.strictEqual(boxType, 'ftyp');

    const majorBrand = mp4Buffer.toString('ascii', 8, 12);
    assert.strictEqual(majorBrand, 'isom');

    // Verify 'moov' atom presence
    const moovType = mp4Buffer.toString('ascii', 36, 40);
    assert.strictEqual(moovType, 'moov');

    // Verify 'mdat' atom presence
    const mdatType = mp4Buffer.toString('ascii', 44, 48);
    assert.strictEqual(mdatType, 'mdat');
  });

  it('2. should reject export when start time is after end time', async () => {
    await assert.rejects(async () => {
      await exporter.createExportJob({
        gymId: 'gym-1',
        cameraId: 'cam-1',
        channelNumber: 1,
        brand: 'HIKVISION',
        ipAddress: '192.168.1.100',
        startTime: '2026-11-14T12:00:00Z',
        endTime: '2026-11-14T11:00:00Z',
      });
    }, /Export start time must be strictly before end time/);
  });

  it('3. should reject export exceeding 1-hour maximum duration limit', async () => {
    await assert.rejects(async () => {
      await exporter.createExportJob({
        gymId: 'gym-1',
        cameraId: 'cam-1',
        channelNumber: 1,
        brand: 'HIKVISION',
        ipAddress: '192.168.1.100',
        startTime: '2026-11-14T10:00:00Z',
        endTime: '2026-11-14T12:00:00Z', // 2 hours
      });
    }, /exceeds maximum allowed limit of 3600s/);
  });

  it('4. should process job to COMPLETED state and generate playable MP4 file on disk', async () => {
    const job = await exporter.createExportJob({
      gymId: 'gym-1',
      cameraId: 'cam-1',
      channelNumber: 1,
      brand: 'HIKVISION',
      ipAddress: '192.168.1.100',
      startTime: '2026-11-14T10:00:00Z',
      endTime: '2026-11-14T10:15:00Z', // 15 mins
    });

    assert.strictEqual(job.durationSeconds, 900);
    assert.ok(job.downloadToken.length >= 32);

    // Wait for remuxing execution
    await new Promise((r) => setTimeout(r, 120));

    const completedJob = exporter.getJob(job.jobId);
    assert.ok(completedJob);
    assert.strictEqual(completedJob.status, 'COMPLETED');
    assert.strictEqual(completedJob.progressPercent, 100);
    assert.ok(completedJob.fileSizeBytes > 1024);
    assert.ok(completedJob.outputFilePath);
    assert.strictEqual(fs.existsSync(completedJob.outputFilePath), true);
  });

  it('5. should expose loopback export endpoints and stream MP4 file via HTTP', async () => {
    const localApi = new LocalApiServer();
    await localApi.start(0);
    const testPort = localApi.getPort();

    // 1. Enqueue job
    const createRes = await fetch(`http://127.0.0.1:${testPort}/exports/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gymId: 'gym-test',
        cameraId: 'cam-test',
        channelNumber: 1,
        startTime: '2026-11-14T08:00:00Z',
        endTime: '2026-11-14T08:10:00Z',
      }),
    });

    assert.strictEqual(createRes.status, 202);
    const createData = await createRes.json();
    const jobId = createData.job.jobId;

    // 2. Poll until completed
    await new Promise((r) => setTimeout(r, 120));

    const statusRes = await fetch(`http://127.0.0.1:${testPort}/exports/status/${jobId}`);
    assert.strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.job.status, 'COMPLETED');

    // 3. Download MP4 stream
    const fileRes = await fetch(`http://127.0.0.1:${testPort}/exports/file/${jobId}`);
    assert.strictEqual(fileRes.status, 200);
    assert.strictEqual(fileRes.headers.get('content-type'), 'video/mp4');
    assert.strictEqual(fileRes.headers.get('accept-ranges'), 'bytes');

    const fileBuf = Buffer.from(await fileRes.arrayBuffer());
    assert.strictEqual(fileBuf.toString('ascii', 4, 8), 'ftyp');

    await localApi.stop();
  });

  it('6. should clean up temporary test exports directory', () => {
    exporter.cleanupExpired();
    if (fs.existsSync(tmpExportDir)) {
      fs.rmSync(tmpExportDir, { recursive: true, force: true });
    }
  });
});
