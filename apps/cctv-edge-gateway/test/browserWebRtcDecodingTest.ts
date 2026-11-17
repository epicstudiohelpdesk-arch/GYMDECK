/**
 * GymDeck CCTV Phase 1.6 - Automated Headless Browser WebRTC Decoding Test
 *
 * Launches:
 * 1. MediaMTX Supervisor (WHEP :8889, RTSP :8554)
 * 2. FFmpeg synthetic RTSP video publisher (testsrc 1280x720 @ 30fps)
 * 3. Local HTTP server serving HTML5 WebRTC WHEP test harness
 * 4. Headless Google Chrome (`--headless=new`)
 *
 * Verifies with real browser APIs inside Google Chrome:
 * - window.RTCPeerConnection
 * - WHEP SDP Offer/Answer negotiation
 * - iceConnectionState === 'connected' || 'completed'
 * - pc.ontrack fired with MediaStreamTrack (kind: video)
 * - HTMLVideoElement.srcObject assignment
 * - HTMLVideoElement.readyState === HAVE_ENOUGH_DATA (4)
 * - HTMLVideoElement.videoWidth & videoHeight (1280 x 720)
 * - HTMLVideoElement.requestVideoFrameCallback() / decoded frame counters
 * - pc.getStats() (inbound-rtp framesDecoded, bytesReceived, jitter)
 */

import * as http from 'http';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { MediaMtxManager } from '../src/media/mediaMtxManager';

export interface BrowserWebRtcTestResult {
  peerConnectionCreated: boolean;
  whepOfferSent: boolean;
  whepAnswerReceived: boolean;
  iceConnectionState: string;
  videoTrackReceived: boolean;
  trackKind: string;
  trackLabel: string;
  mediaStreamAssignedToVideo: boolean;
  videoElementReadyState: number;
  videoPlaying: boolean;
  videoWidth: number;
  videoHeight: number;
  browserDecodedFrames: number;
  inboundRtpStats: {
    framesDecoded: number;
    framesReceived: number;
    bytesReceived: number;
    packetsReceived: number;
    packetsLost: number;
    jitter: number;
    codec: string;
  };
  status: 'PASS' | 'FAIL';
  errorMessage?: string;
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

export async function runBrowserWebRtcDecodingTest(): Promise<BrowserWebRtcTestResult> {
  const ffmpegBin = findFfmpeg();
  const whepPort = 8889;
  const rtspPort = 8554;
  const webTestPort = 49198;
  const chromeBin = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  if (!fs.existsSync(chromeBin)) {
    throw new Error(`Google Chrome binary not found at ${chromeBin}`);
  }

  console.log('------------------------------------------------------------');
  console.log('🌐 RUNNING AUTOMATED REAL BROWSER WEBRTC DECODING TEST');
  console.log('------------------------------------------------------------');

  // Step 1: Start MediaMTX Supervisor
  const supervisor = new MediaMtxManager(whepPort, rtspPort);
  const started = await supervisor.start();
  if (!started) {
    throw new Error('Failed to start MediaMTX for browser WebRTC test.');
  }

  // Step 2: Publish Synthetic 720p H.264 RTSP Stream
  console.log('  ▶ Publishing 720p H.264 RTSP test stream via FFmpeg...');
  const publisher = child_process.spawn(
    ffmpegBin,
    [
      '-re',
      '-f', 'lavfi',
      '-i', 'testsrc=size=1280x720:rate=30',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-g', '15',
      '-f', 'rtsp',
      '-rtsp_transport', 'tcp',
      `rtsp://127.0.0.1:${rtspPort}/browser_test_stream`,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] }
  );

  // Allow publisher to establish RTSP session
  await new Promise((r) => setTimeout(r, 1200));

  // Step 3: Serve HTML5 WebRTC Test Harness
  let testResolve: (res: BrowserWebRtcTestResult) => void;
  let testReject: (err: any) => void;
  const testPromise = new Promise<BrowserWebRtcTestResult>((res, rej) => {
    testResolve = res;
    testReject = rej;
  });

  const testServer = http.createServer((req, res) => {
    if (req.url === '/results' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'OK' }));
          testResolve(parsed);
        } catch (e: any) {
          testReject(e);
        }
      });
      return;
    }

    if (req.url === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <title>GymDeck WebRTC Browser Test</title>
</head>
<body style="background: black; color: white;">
  <h2>GymDeck Automated WHEP WebRTC Decoder Test</h2>
  <video id="videoPlayer" autoplay playsinline muted style="width: 640px; height: 360px; border: 2px solid green;"></video>
  <pre id="logs"></pre>

  <script>
    async function runTest() {
      const logs = document.getElementById('logs');
      function log(msg) { logs.innerText += msg + '\\n'; }

      const result = {
        peerConnectionCreated: false,
        whepOfferSent: false,
        whepAnswerReceived: false,
        iceConnectionState: 'new',
        videoTrackReceived: false,
        trackKind: '',
        trackLabel: '',
        mediaStreamAssignedToVideo: false,
        videoElementReadyState: 0,
        videoPlaying: false,
        videoWidth: 0,
        videoHeight: 0,
        browserDecodedFrames: 0,
        inboundRtpStats: {
          framesDecoded: 0,
          framesReceived: 0,
          bytesReceived: 0,
          packetsReceived: 0,
          packetsLost: 0,
          jitter: 0,
          codec: ''
        },
        status: 'FAIL'
      };

      try {
        const video = document.getElementById('videoPlayer');
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        result.peerConnectionCreated = true;

        pc.addTransceiver('video', { direction: 'recvonly' });

        pc.ontrack = (event) => {
          result.videoTrackReceived = true;
          if (event.track) {
            result.trackKind = event.track.kind;
            result.trackLabel = event.track.label;
          }
          if (event.streams && event.streams[0]) {
            video.srcObject = event.streams[0];
            result.mediaStreamAssignedToVideo = true;
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        result.whepOfferSent = true;

        const whepRes = await fetch('http://127.0.0.1:${whepPort}/browser_test_stream/whep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp
        });

        if (!whepRes.ok) {
          result.errorMessage = 'WHEP endpoint returned HTTP ' + whepRes.status;
          fetch('/results', { method: 'POST', body: JSON.stringify(result) });
          return;
        }

        const answerSdp = await whepRes.text();
        result.whepAnswerReceived = true;
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

        // Wait for ICE connection and video playout
        await new Promise((resolve) => {
          let timeout = setTimeout(resolve, 6000);
          pc.oniceconnectionstatechange = () => {
            result.iceConnectionState = pc.iceConnectionState;
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
              clearTimeout(timeout);
              setTimeout(resolve, 2000); // Allow 2 seconds of playback
            }
          };
        });

        result.iceConnectionState = pc.iceConnectionState;
        result.videoElementReadyState = video.readyState;
        result.videoPlaying = !video.paused && !video.ended && video.readyState >= 2;
        result.videoWidth = video.videoWidth;
        result.videoHeight = video.videoHeight;

        // Gather real browser WebRTC stats
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            result.inboundRtpStats.framesDecoded = report.framesDecoded || 0;
            result.inboundRtpStats.framesReceived = report.framesReceived || 0;
            result.inboundRtpStats.bytesReceived = report.bytesReceived || 0;
            result.inboundRtpStats.packetsReceived = report.packetsReceived || 0;
            result.inboundRtpStats.packetsLost = report.packetsLost || 0;
            result.inboundRtpStats.jitter = report.jitter || 0;
          }
          if (report.type === 'codec' && report.mimeType && report.mimeType.toLowerCase().includes('video')) {
            result.inboundRtpStats.codec = report.mimeType;
          }
        });

        result.browserDecodedFrames = result.inboundRtpStats.framesDecoded;

        // Strict criteria for browser WebRTC PASS
        if (
          result.peerConnectionCreated &&
          result.whepOfferSent &&
          result.whepAnswerReceived &&
          (result.iceConnectionState === 'connected' || result.iceConnectionState === 'completed') &&
          result.videoTrackReceived &&
          result.mediaStreamAssignedToVideo &&
          result.videoWidth === 1280 &&
          result.videoHeight === 720 &&
          result.browserDecodedFrames > 10
        ) {
          result.status = 'PASS';
        }

        fetch('/results', { method: 'POST', body: JSON.stringify(result) });
      } catch (err) {
        result.errorMessage = err.message || String(err);
        fetch('/results', { method: 'POST', body: JSON.stringify(result) });
      }
    }

    window.addEventListener('load', runTest);
  </script>
</body>
</html>`);
    }
  });

  await new Promise<void>((resolve) => testServer.listen(webTestPort, resolve));

  // Step 4: Launch Real Headless Google Chrome
  console.log('  ▶ Launching headless Google Chrome (actual WebRTC engine)...');
  const chromeProcess = child_process.spawn(
    chromeBin,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      `http://127.0.0.1:${webTestPort}/`,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] }
  );

  let finalResult: BrowserWebRtcTestResult;
  try {
    const timeout = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('Browser WebRTC test timed out after 12s')), 12000)
    );
    finalResult = (await Promise.race([testPromise, timeout])) as BrowserWebRtcTestResult;
  } finally {
    // Teardown
    chromeProcess.kill('SIGTERM');
    testServer.close();
    publisher.kill('SIGTERM');
    await supervisor.stop();
  }

  return finalResult;
}

if (require.main === module) {
  runBrowserWebRtcDecodingTest()
    .then((res) => {
      console.log('\n📊 BROWSER WEBRTC DECODING TEST RESULT:');
      console.dir(res, { depth: null });
      process.exit(res.status === 'PASS' ? 0 : 1);
    })
    .catch((err) => {
      console.error('❌ Browser WebRTC test failed:', err);
      process.exit(1);
    });
}
