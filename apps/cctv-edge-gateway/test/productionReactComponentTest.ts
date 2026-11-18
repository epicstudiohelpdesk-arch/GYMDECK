/**
 * GymDeck CCTV Phase 1.8.3 - Production React Component Test Runner
 *
 * Verifies:
 * 1. Imports actual exported `CctvLivePlayer` from `frontend/CCTV.jsx`
 * 2. Mounts into real React DOM (`ReactDOM.createRoot()`)
 * 3. Connects to real MediaMTX WHEP port :8889 publishing synthetic RTSP H.264
 * 4. Verifies actual frame decoding via `HTMLVideoElement` in Chrome
 * 5. Exercises React re-render cycle (confirms no duplicate sessions)
 * 6. Exercises unmount teardown (confirms WHEP session DELETE)
 */

import * as http from 'http';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { mediaMtxManager } from '../src/media/mediaMtxManager';
import { LocalApiServer } from '../src/server/localApi';
import { secureStore } from '../src/config/secureStore';

export async function runProductionReactComponentTest(): Promise<any> {
  console.log('------------------------------------------------------------');
  console.log('⚛️ 1. PRODUCTION REACT COMPONENT INTEGRATION TEST');
  console.log('------------------------------------------------------------');

  const localApi = new LocalApiServer();
  const activeToken = secureStore.getOrGenerateIpcSecret();
  let ffmpegProc: child_process.ChildProcess | null = null;
  let chromeProc: child_process.ChildProcess | null = null;
  let testServer: http.Server | null = null;

  try {
    // 1. Start MediaMTX Singleton
    console.log('▶ [1/6] Starting MediaMTX Supervisor...');
    await mediaMtxManager.start();
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Start Local Edge Gateway Daemon on Loopback :49152
    console.log('▶ [2/6] Starting Edge Gateway Loopback Server on port 49152...');
    await localApi.start(49152);

    // 3. Start Synthetic RTSP Stream on 'cam_prod_test_1_main'
    console.log('▶ [3/6] Starting Synthetic RTSP Publisher (testsrc 1280x720 @ 15fps)...');
    ffmpegProc = child_process.spawn(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel', 'error',
        '-re',
        '-f', 'lavfi',
        '-i', 'testsrc=size=1280x720:rate=15',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-pix_fmt', 'yuv420p',
        '-g', '15',
        '-f', 'rtsp',
        '-rtsp_transport', 'tcp',
        'rtsp://127.0.0.1:8554/cam_prod_test_1_main',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    await new Promise((r) => setTimeout(r, 2000));

    // 4. Coordinate Test via Lightweight Results Receiver Server
    let testResolve: (res: any) => void;
    let testReject: (err: any) => void;
    const testPromise = new Promise<any>((resolve, reject) => {
      testResolve = resolve;
      testReject = reject;
    });

    testServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GymDeck-IPC-Token');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/get-token' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: activeToken }));
        return;
      }

      if (req.url === '/log' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            console.log(`   [BrowserConsole] ${data.msg}`);
          } catch (_) {}
          res.writeHead(200);
          res.end();
        });
        return;
      }

      if (req.url === '/test-results' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ACK' }));
            testResolve(data);
          } catch (e) {
            testReject(e);
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    const coordinatorPort = 9876;
    await new Promise<void>((r) => testServer!.listen(coordinatorPort, '127.0.0.1', () => r()));
    console.log(`▶ [3/5] Test coordinator listening on port ${coordinatorPort}...`);

    // 4. Launch Headless Google Chrome to load Vite-hosted production component page
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const targetUrl = 'http://localhost:3000/frontend/test_cctv_component.html';
    const userDir = path.join(os.tmpdir(), `gymdeck_react_test_${Date.now()}`);

    console.log(`▶ [4/5] Launching Chrome against Vite harness: ${targetUrl}...`);
    chromeProc = child_process.spawn(
      chromePath,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        `--user-data-dir=${userDir}`,
        targetUrl,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    // Set 25-second timeout
    const timeout = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out waiting for React component test completion (25s)')), 25000)
    );

    console.log('▶ [5/5] Waiting for React test execution & assertions...');
    const result = await Promise.race([testPromise, timeout]);

    console.log('\n📊 PRODUCTION REACT COMPONENT TEST RESULTS:');
    console.log('------------------------------------------------------------');
    console.log(`• Component Export Imported:     ${result.componentImported ? '✅ YES' : '❌ NO'}`);
    console.log(`• React ReactDOM.createRoot:     ${result.mountedSuccessfully ? '✅ YES' : '❌ NO'}`);
    console.log(`• HTMLVideoElement Discovered:   ${result.videoElementFound ? '✅ YES' : '❌ NO'}`);
    console.log(`• WHEP WebRTC Negotiated:        ${result.whepNegotiated ? '✅ YES' : '❌ NO'}`);
    console.log(`• Stream State Reached LIVE:     ${result.streamReachedLive ? '✅ YES' : '❌ NO'}`);
    console.log(`• Browser Decoded Frames:        ${result.framesDecodedCount} frames`);
    console.log(`• Video Display Resolution:      ${result.videoWidth} x ${result.videoHeight}`);
    console.log(`• Re-render Idempotency:         ${result.noDuplicateSessionsOnRerender ? '✅ VERIFIED (No duplicate sessions)' : '❌ FAILED'}`);
    console.log(`• Unmount Teardown & DELETE:     ${result.unmountCleansSession ? '✅ CLEAN' : '❌ FAILED'}`);
    console.log(`• Overall Status:                ${result.passed ? '🎉 PASSED' : '❌ FAILED'}`);
    console.log('------------------------------------------------------------\n');

    return result;

  } finally {
    if (chromeProc) {
      try { chromeProc.kill('SIGKILL'); } catch (_) {}
    }
    if (testServer) {
      testServer.close();
    }
    if (ffmpegProc) {
      try { ffmpegProc.kill('SIGKILL'); } catch (_) {}
    }
    await localApi.stop();
    await mediaMtxManager.stop();
  }
}

if (require.main === module) {
  runProductionReactComponentTest()
    .then((r) => {
      process.exit(r.passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal Test Runner Error:', err);
      process.exit(1);
    });
}
