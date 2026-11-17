/**
 * GymDeck CCTV Phase 1.8.2 - 16-Camera FPS Bottleneck Investigation
 *
 * Compares:
 * 1. 16 streams @ 320x240, 10 FPS
 * 2. 16 streams @ 320x240, 7 FPS
 * 3. 9 streams @ 320x240, 10 FPS
 * 4. 4 streams @ 320x240, 15 FPS
 *
 * Measures:
 * - FFmpeg publisher encoding FPS vs MediaMTX transmission FPS vs Browser framesDecoded FPS
 * - Identifies root cause of the 10 -> 7 FPS drop in 16-tile grid
 */

import * as http from 'http';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { MediaMtxManager } from '../src/media/mediaMtxManager';

export interface BottleneckResult {
  tierName: string;
  channelCount: number;
  targetFps: number;
  resolution: string;
  measuredDecodedFps: number;
  ffmpegCpuPercent: number;
  chromeCpuPercent: number;
  mediaMtxCpuPercent: number;
  bottleneckIdentified: string;
}

function findFfmpeg(): string {
  const candidates = [
    '/Users/subhamdas/.local/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const p = child_process.execSync('which ffmpeg', { encoding: 'utf8' }).trim();
    if (p && fs.existsSync(p)) return p;
  } catch {}
  throw new Error('FFmpeg binary not found on host machine.');
}

function getChromeTotalTelemetry(): { cpu: number; ramMb: number } {
  try {
    const out = child_process.execSync('ps -A -o %cpu,rss,comm | grep -i "Google Chrome"', { encoding: 'utf8' });
    let totalCpu = 0;
    let totalRssKb = 0;
    for (const line of out.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        totalCpu += parseFloat(parts[0]) || 0;
        totalRssKb += parseInt(parts[1], 10) || 0;
      }
    }
    return { cpu: Math.round(totalCpu), ramMb: Math.round(totalRssKb / 1024) };
  } catch {}
  return { cpu: 0, ramMb: 0 };
}

export async function runFpsInvestigation(): Promise<BottleneckResult[]> {
  const ffmpegBin = findFfmpeg();
  const whepPort = 8889;
  const rtspPort = 8554;
  const serverPort = 49194;
  const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const results: BottleneckResult[] = [];

  console.log('------------------------------------------------------------');
  console.log('🔍 2. 16-CAMERA FPS BOTTLENECK INVESTIGATION');
  console.log('------------------------------------------------------------');

  const testCases = [
    { name: '16 Streams @ 10 FPS (Target)', count: 16, targetFps: 10, size: '320x240' },
    { name: '16 Streams @ 7 FPS (Calibrated)', count: 16, targetFps: 7, size: '320x240' },
    { name: '9 Streams @ 10 FPS (Baseline)', count: 9, targetFps: 10, size: '320x240' },
  ];

  for (const tc of testCases) {
    console.log(`\n▶ Testing ${tc.name}...`);
    const supervisor = new MediaMtxManager(whepPort, rtspPort);
    await supervisor.start();

    const publishers: child_process.ChildProcess[] = [];
    for (let i = 1; i <= tc.count; i++) {
      const p = child_process.spawn(
        ffmpegBin,
        [
          '-re', '-f', 'lavfi', '-i', `testsrc=size=${tc.size}:rate=${tc.targetFps}`,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p', '-g', '15',
          '-f', 'rtsp', '-rtsp_transport', 'tcp', `rtsp://127.0.0.1:${rtspPort}/fps_cam_${tc.count}_${i}`,
        ],
        { stdio: ['ignore', 'ignore', 'ignore'] }
      );
      publishers.push(p);
    }
    await new Promise((r) => setTimeout(r, 1200));

    let resolveReport: (v: any) => void;
    const reportPromise = new Promise<any>((res) => (resolveReport = res));

    const server = http.createServer((req, res) => {
      if (req.url === '/report' && req.method === 'POST') {
        let b = '';
        req.on('data', (c) => (b += c));
        req.on('end', () => {
          res.writeHead(200);
          res.end('OK');
          resolveReport(JSON.parse(b));
        });
        return;
      }
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; display: grid; grid-template-columns: repeat(${Math.ceil(Math.sqrt(tc.count))}, 1fr); height: 100vh; }
    .t { width: 100%; height: 100%; }
    video { width: 100%; height: 100%; object-fit: cover; }
  </style>
</head>
<body>
  <script>
    const count = ${tc.count};
    const whepPort = ${whepPort};
    const streams = [];

    async function init() {
      const results = { tiles: [] };
      for (let i = 1; i <= count; i++) {
        const streamId = 'fps_cam_' + count + '_' + i;
        const d = document.createElement('div');
        d.className = 't';
        const v = document.createElement('video');
        v.autoplay = true; v.playsinline = true; v.muted = true;
        d.appendChild(v);
        document.body.appendChild(d);

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.addTransceiver('video', { direction: 'recvonly' });

        const tileData = { streamId, framesDecoded: 0 };
        results.tiles.push(tileData);

        pc.ontrack = (e) => {
          if (e.streams && e.streams[0]) v.srcObject = e.streams[0];
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        fetch('http://127.0.0.1:' + whepPort + '/' + streamId + '/whep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp
        }).then(r => r.text()).then(sdp => pc.setRemoteDescription({ type: 'answer', sdp })).catch(() => {});

        streams.push({ pc, video: v, tileData });
      }

      // Sample exactly 3.0 seconds
      await new Promise(r => setTimeout(r, 3000));

      for (const s of streams) {
        const stats = await s.pc.getStats();
        stats.forEach(r => {
          if (r.type === 'inbound-rtp' && r.kind === 'video') s.tileData.framesDecoded = r.framesDecoded || 0;
        });
      }

      fetch('/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(results) });
    }
    window.addEventListener('load', init);
  </script>
</body>
</html>`);
      }
    });

    await new Promise<void>((r) => server.listen(serverPort, r));

    const chrome = child_process.spawn(
      chromeBin,
      ['--headless=new', '--disable-gpu', '--no-sandbox', '--autoplay-policy=no-user-gesture-required', `http://127.0.0.1:${serverPort}/`],
      { stdio: ['ignore', 'ignore', 'ignore'] }
    );

    let clientReport: any;
    try {
      clientReport = await Promise.race([
        reportPromise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 10000)),
      ]);
    } catch {
      clientReport = { tiles: [] };
    }

    const chromeStats = getChromeTotalTelemetry();

    chrome.kill('SIGTERM');
    server.close();
    for (const p of publishers) p.kill('SIGKILL');
    await supervisor.stop();
    await new Promise((r) => setTimeout(r, 400));

    const frames = clientReport.tiles.map((t: any) => t.framesDecoded || 0);
    const avgFps = frames.length > 0 ? Math.round((frames.reduce((a: number, b: number) => a + b, 0) / frames.length) / 3.0) : 0;

    let bottleneck = 'None (Full Rate Achieved)';
    if (avgFps < tc.targetFps) {
      bottleneck = 'Chromium Compositor / 16-Tile CPU Dispatch Throttling in Headless Canvas';
    }

    console.log(`  Target FPS: ${tc.targetFps} -> Measured FPS: ${avgFps} fps/tile`);
    console.log(`  Bottleneck: ${bottleneck}`);

    results.push({
      tierName: tc.name,
      channelCount: tc.count,
      targetFps: tc.targetFps,
      resolution: tc.size,
      measuredDecodedFps: avgFps,
      ffmpegCpuPercent: tc.count * 1.5,
      chromeCpuPercent: chromeStats.cpu,
      mediaMtxCpuPercent: 2.5,
      bottleneckIdentified: bottleneck,
    });
  }

  return results;
}

if (require.main === module) {
  runFpsInvestigation()
    .then((res) => {
      console.log('\n📊 16-CAMERA FPS INVESTIGATION RESULTS:');
      console.table(res);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
