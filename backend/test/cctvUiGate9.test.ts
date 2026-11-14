/**
 * GymDeck CCTV Subsystem - Gate 9 UI & Zero-Complexity Wizard Verification
 * Tests static analysis, bundle outputs, route registration, and stage mounting.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

describe('CCTV Gate 9 - Desktop UI & Zero-Complexity Wizard', () => {
  const rootDir = fs.existsSync(path.join(process.cwd(), 'frontend'))
    ? process.cwd()
    : path.resolve(process.cwd(), '..');
  const cctvJsxPath = path.join(rootDir, 'frontend', 'CCTV.jsx');
  const indexHtmlPath = path.join(rootDir, 'frontend', 'index.html');
  const scriptJsPath = path.join(rootDir, 'frontend', 'script.js');

  it('1. should verify frontend/CCTV.jsx exists with required components and exports', () => {
    assert.strictEqual(fs.existsSync(cctvJsxPath), true);
    const content = fs.readFileSync(cctvJsxPath, 'utf8');

    // Verify main exports
    assert.ok(content.includes('export const CCTV = () =>'));
    assert.ok(content.includes('export const mountCctv ='));
    assert.ok(content.includes('export default CCTV'));

    // Verify formal Setup Guidance steps
    assert.ok(content.includes('CCTV Surveillance Subsystem — Complete Setup Guidance'));
    assert.ok(content.includes('Local Network Topology & Switch Infrastructure'));
    assert.ok(content.includes('NVR & Camera ONVIF / RTSP Protocol Calibration'));
    assert.ok(content.includes('GymDeck CCTV Edge Gateway Service Daemon'));
    assert.ok(content.includes('Camera Registration & RTSP URL Validation'));

    // Verify Live CCTV features
    assert.ok(content.includes('Single'));
    assert.ok(content.includes('2x2 (4)'));
    assert.ok(content.includes('3x3 (9)'));
    assert.ok(content.includes('HD (Main)'));
    assert.ok(content.includes('SD (Sub)'));

    // Verify Recordings & Controls
    assert.ok(content.includes('searchRecordings'));
    assert.ok(content.includes('playbackSpeed'));
    assert.ok(content.includes('0.5x'));
    assert.ok(content.includes('16.0x'));

    // Verify Clip Export Drawer
    assert.ok(content.includes('Export Video Clip'));
    assert.ok(content.includes('Download'));
  });

  it('2. should verify stage registration in frontend/script.js', () => {
    const content = fs.readFileSync(scriptJsPath, 'utf8');
    assert.ok(content.includes('stages: ["cctv", "security-cctv"]'));
    assert.ok(content.includes('load: () => import("./CCTV.jsx")'));
    assert.ok(content.includes('mount: "mountCctv"'));
  });

  it('3. should verify navigation and container elements in frontend/index.html', () => {
    const content = fs.readFileSync(indexHtmlPath, 'utf8');
    assert.ok(content.includes('data-view="cctv"'));
    assert.ok(content.includes('Security &amp; CCTV'));
    assert.ok(content.includes('class="cctv-stage" data-stage="cctv"'));
  });

  it('4. should verify frontend bundle readiness or production build artifact', () => {
    const distAssetsDir = path.join(rootDir, 'dist', 'assets');
    if (fs.existsSync(distAssetsDir)) {
      const files = fs.readdirSync(distAssetsDir);
      const cctvChunk = files.find((f) => f.startsWith('CCTV-') && f.endsWith('.js'));
      assert.ok(cctvChunk, `CCTV production chunk found: ${cctvChunk}`);
    } else {
      assert.strictEqual(fs.existsSync(cctvJsxPath), true);
      const stat = fs.statSync(cctvJsxPath);
      assert.ok(stat.size > 1000, 'CCTV.jsx source is present and populated');
    }
  });
});
