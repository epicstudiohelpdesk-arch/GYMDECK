/**
 * GymDeck CCTV Edge Gateway - Local Loopback IPC & Status Server
 * Binds exclusively to 127.0.0.1 (Loopback). Never exposed to external network.
 * Allows local GymDeck Desktop instances to probe gateway presence and health.
 */

import * as http from 'http';
import { secureStore } from '../config/secureStore';
import { gatewayIdentity } from '../identity/gatewayIdentity';
import { heartbeatAgent } from '../telemetry/heartbeatAgent';
import { enrollmentClient } from '../enrollment/enrollmentClient';
import { wsDiscoveryEngine } from '../discovery/wsDiscovery';
import { AdapterFactory } from '../adapters/adapterFactory';
import { AutoConfigEngine } from '../engine/autoConfigEngine';
import { streamManager } from '../media/streamManager';
import { whepGateway } from '../media/whepGateway';
import { playbackEngine } from '../recordings/playbackEngine';
import { clipExporter } from '../recordings/clipExporter';
import * as fs from 'fs';

export const GATEWAY_LOOPBACK_PORT = 49152;

export class LocalApiServer {
  private server: http.Server | null = null;
  private startTime = Date.now();

  start(port = GATEWAY_LOOPBACK_PORT): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Enforce strict loopback origin
        const remoteIp = req.socket.remoteAddress;
        if (remoteIp !== '127.0.0.1' && remoteIp !== '::1' && remoteIp !== '::ffff:127.0.0.1') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access restricted to loopback interface' }));
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

        // Set permissive CORS for local desktop UI
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.method === 'GET' && url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'OK',
              service: 'GymDeck CCTV Edge Gateway',
              version: '1.0.0',
              uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
            })
          );
          return;
        }

        if (req.method === 'GET' && url.pathname === '/status') {
          const config = secureStore.loadConfig();
          const fingerprint = gatewayIdentity.getFingerprint();
          const metrics = heartbeatAgent.collectMetrics();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              isEnrolled: secureStore.isEnrolled(),
              gatewayId: config?.gatewayId || null,
              gymId: config?.gymId || null,
              name: config?.name || null,
              cloudApiUrl: config?.cloudApiUrl || null,
              enrolledAt: config?.enrolledAt || null,
              consecutiveHeartbeatFailures: heartbeatAgent.getConsecutiveFailures(),
              host: {
                platform: fingerprint.platform,
                hostname: fingerprint.hostname,
                localIp: fingerprint.localIp,
                totalMemoryMb: fingerprint.totalMemoryMb,
              },
              metrics,
            })
          );
          return;
        }

        if (req.method === 'POST' && url.pathname === '/enroll') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { token, cloudApiUrl } = JSON.parse(body || '{}');
              if (!token || !cloudApiUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing token or cloudApiUrl' }));
                return;
              }
              const result = await enrollmentClient.enroll(token, cloudApiUrl);
              res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/discovery/probe') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { timeoutMs } = JSON.parse(body || '{}');
              const devices = await wsDiscoveryEngine.probe(timeoutMs || 3500);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: devices.length, devices }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'POST' && url.pathname === '/discovery/inspect') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { ipAddress, brand, xaddr, username, password } = JSON.parse(body || '{}');
              if (!ipAddress || !username || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing ipAddress, username, or password' }));
                return;
              }
              const adapter = AdapterFactory.getAdapter(ipAddress, brand, xaddr);
              const isAuthOk = await adapter.testConnection({ username, password });
              if (!isAuthOk) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Authentication failed. Please verify recorder credentials.' }));
                return;
              }
              const info = await adapter.inspectDevice({ username, password });
              const channels = await adapter.discoverChannels({ username, password });
              const profile = AutoConfigEngine.configure(info, channels);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, profile }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'GET' && url.pathname === '/streams/active') {
          const streams = streamManager.getAllActiveStreams();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: streams.length, streams }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/streams/request') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              const { cameraId, channelNumber, profile, rtspUrl, resolution, fps } = JSON.parse(body || '{}');
              if (!cameraId || !rtspUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing cameraId or rtspUrl' }));
                return;
              }
              const stream = streamManager.requestStream(
                cameraId,
                channelNumber || 1,
                profile || 'SUB',
                rtspUrl,
                resolution,
                fps
              );
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, stream }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Recordings Search
        if (req.method === 'POST' && url.pathname === '/recordings/search') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { brand, ipAddress, httpPort, rtspPort, username, password, cameraId, channelNumber, from, to } = JSON.parse(body || '{}');
              if (!cameraId || !from || !to) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing cameraId, from, or to timestamp' }));
                return;
              }
              const result = await playbackEngine.search(
                brand || 'ONVIF',
                ipAddress || '127.0.0.1',
                httpPort || 80,
                rtspPort || 554,
                { username: username || '', password: password || '' },
                cameraId,
                channelNumber || 1,
                new Date(from),
                new Date(to)
              );
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, ...result }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Start Playback Session
        if (req.method === 'POST' && url.pathname === '/recordings/playback-session') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { brand, ipAddress, httpPort, rtspPort, username, password, cameraId, channelNumber, startTime, speed } = JSON.parse(body || '{}');
              if (!cameraId || !startTime) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing cameraId or startTime' }));
                return;
              }
              const session = await playbackEngine.startSession(
                brand || 'ONVIF',
                ipAddress || '127.0.0.1',
                httpPort || 80,
                rtspPort || 554,
                { username: username || '', password: password || '' },
                cameraId,
                channelNumber || 1,
                new Date(startTime),
                speed || 1
              );
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, session }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Playback Controls (Seek, Speed, Pause, Resume)
        if (req.method === 'POST' && url.pathname === '/recordings/playback-control') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const { sessionId, action, seekTime, speed } = JSON.parse(body || '{}');
              if (!sessionId || !action) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing sessionId or action' }));
                return;
              }

              let updated;
              if (action === 'SEEK') {
                if (!seekTime) throw new Error('Missing seekTime for SEEK action');
                updated = await playbackEngine.seek(sessionId, new Date(seekTime));
              } else if (action === 'SPEED') {
                if (!speed) throw new Error('Missing speed for SPEED action');
                updated = playbackEngine.setSpeed(sessionId, Number(speed));
              } else if (action === 'PAUSE') {
                updated = playbackEngine.pause(sessionId);
              } else if (action === 'RESUME') {
                updated = playbackEngine.resume(sessionId);
              } else {
                throw new Error(`Unsupported action '${action}'`);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, session: updated }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // Stop Playback Session
        if (req.method === 'DELETE' && url.pathname.startsWith('/recordings/playback-session/')) {
          const parts = url.pathname.split('/');
          const sessionId = parts[parts.length - 1];
          const stopped = playbackEngine.stopSession(sessionId);
          res.writeHead(stopped ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: stopped }));
          return;
        }

        // Create Clip Export Job
        if (req.method === 'POST' && url.pathname === '/exports/create') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', async () => {
            try {
              const opts = JSON.parse(body || '{}');
              const job = await clipExporter.createExportJob(opts);
              res.writeHead(202, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, job }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // List / Query Clip Export Jobs
        if (req.method === 'GET' && url.pathname === '/exports/jobs') {
          const gymId = url.searchParams.get('gymId') || undefined;
          const jobs = clipExporter.getAllJobs(gymId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: jobs.length, jobs }));
          return;
        }

        // Query Single Export Job Status
        if (req.method === 'GET' && url.pathname.startsWith('/exports/status/')) {
          const parts = url.pathname.split('/');
          const jobId = parts[parts.length - 1];
          const job = clipExporter.getJob(jobId);
          if (!job) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Export job not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, job }));
          return;
        }

        // Download Exported MP4 File
        if (req.method === 'GET' && url.pathname.startsWith('/exports/file/')) {
          const parts = url.pathname.split('/');
          const jobId = parts[parts.length - 1];
          const job = clipExporter.getJob(jobId);
          if (!job || !job.outputFilePath || !fs.existsSync(job.outputFilePath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Exported file not found or not completed' }));
            return;
          }

          const stat = fs.statSync(job.outputFilePath);
          res.writeHead(200, {
            'Content-Type': 'video/mp4',
            'Content-Length': stat.size,
            'Content-Disposition': `attachment; filename="gymdeck_export_${jobId}.mp4"`,
            'Accept-Ranges': 'bytes',
          });

          const stream = fs.createReadStream(job.outputFilePath);
          stream.pipe(res);
          return;
        }

        // Standard WHEP (WebRTC HTTP Egress Protocol) Playout Endpoint
        if (req.method === 'POST' && url.pathname.startsWith('/whep/')) {
          const streamId = url.pathname.replace('/whep/', '').split('/')[0];
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              const sdpOffer = body.trim();
              if (!sdpOffer.startsWith('v=0')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid SDP Offer' }));
                return;
              }

              const localIp = gatewayIdentity.getFingerprint().localIp;
              const result = whepGateway.handleOffer(streamId, sdpOffer, remoteIp || '127.0.0.1', localIp);

              res.writeHead(201, {
                'Content-Type': 'application/sdp',
                Location: result.locationHeader,
              });
              res.end(result.sdpAnswer);
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // WHEP Session Teardown
        if (req.method === 'DELETE' && url.pathname.includes('/sessions/')) {
          const parts = url.pathname.split('/');
          const sessionId = parts[parts.length - 1];
          const closed = whepGateway.closeSession(sessionId);
          res.writeHead(closed ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: closed }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  getPort(): number {
    const addr = this.server?.address();
    if (addr && typeof addr === 'object') {
      return addr.port;
    }
    return 0;
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
        this.server = null;
      } else {
        resolve();
      }
    });
  }
}

export const localApiServer = new LocalApiServer();
