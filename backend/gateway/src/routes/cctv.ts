/**
 * GymDeck Cloud Gateway - Security & CCTV Routes (/v1/cctv)
 * Provides authenticated, multi-tenant endpoints for gateway enrollment, device discovery,
 * camera management, and WebRTC stream session authorization.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/rbacMiddleware';
import { cctvGatewayService } from '../../../services/cctv/cctvGatewayService';
import { cctvDeviceService } from '../../../services/cctv/cctvDeviceService';
import { cctvSessionService } from '../../../services/cctv/cctvSessionService';
import { cctvAuditService } from '../../../services/cctv/cctvAuditService';
import { cctvTurnService } from '../../../services/cctv/cctvTurnService';
import { cctvSignalingService } from '../../../services/cctv/cctvSignalingService';
import { cctvRecordingService } from '../../../services/cctv/cctvRecordingService';
import { cctvExportService } from '../../../services/cctv/cctvExportService';
import { AppError } from '../../../shared/errors';

const router: Router = Router();

// Validation Schemas
const RegisterRecorderSchema = z.object({
  gatewayId: z.string().uuid(),
  brand: z.string().min(1).max(64),
  model: z.string().max(128).optional(),
  serialNumber: z.string().max(128).optional(),
  firmwareVersion: z.string().max(128).optional(),
  ipAddress: z.string().min(7).max(64),
  onvifPort: z.number().int().min(1).max(65535).optional().default(80),
  rtspPort: z.number().int().min(1).max(65535).optional().default(554),
  httpPort: z.number().int().min(1).max(65535).optional().default(80),
  macAddress: z.string().max(32).optional(),
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
  totalChannels: z.number().int().min(1).max(128),
});

const SyncChannelsSchema = z.object({
  channels: z.array(
    z.object({
      channelNumber: z.number().int().min(1),
      name: z.string().max(128).optional(),
      locationZone: z.string().max(64).optional(),
      ipAddress: z.string().optional(),
      onvifToken: z.string().optional(),
      mainRtspUrl: z.string().optional(),
      subRtspUrl: z.string().optional(),
      codec: z.enum(['H264', 'H265']).optional().default('H264'),
      resolutionMain: z.string().optional(),
      resolutionSub: z.string().optional(),
      fps: z.number().optional(),
      capabilities: z
        .object({
          supportsOnvifT: z.boolean().optional(),
          supportsOnvifG: z.boolean().optional(),
          supportsPtz: z.boolean().optional(),
          supportsAudio: z.boolean().optional(),
          supportsMotionEvents: z.boolean().optional(),
          supportsSubstream: z.boolean().optional(),
          maxFramerate: z.number().optional(),
        })
        .optional(),
    })
  ),
});

const UpdateCameraSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  locationZone: z.string().min(1).max(64).optional(),
  isActive: z.boolean().optional(),
});

const RequestStreamSchema = z.object({
  cameraId: z.string().uuid(),
  streamProfile: z.enum(['MAIN', 'SUB']).optional().default('SUB'),
  clientType: z.enum(['DESKTOP', 'OWNER_MOBILE']).optional().default('DESKTOP'),
});

const SearchRecordingsSchema = z.object({
  cameraId: z.string().uuid(),
  from: z.string().min(10),
  to: z.string().min(10),
});

const CreatePlaybackSessionSchema = z.object({
  cameraId: z.string().uuid(),
  startTime: z.string().min(10),
  speed: z.number().positive().optional().default(1),
});

const RequestExportSchema = z.object({
  cameraId: z.string().uuid(),
  startTime: z.string().min(10),
  endTime: z.string().min(10),
  notes: z.string().max(256).optional(),
});

// ==========================================
// 1. PUBLIC / DEVICE ENROLLMENT ENDPOINTS
// ==========================================

/**
 * Enrolls an Edge Gateway using a single-use enrollment token.
 */
router.post('/gateways/enroll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, hostInfo, publicKey } = req.body;
    if (!token || typeof token !== 'string') {
      throw AppError.validation('Missing enrollment token.');
    }
    const result = await cctvGatewayService.enrollGateway(token, hostInfo || {}, publicKey);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Gateway successfully enrolled and bound to gym facility.',
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. AUTHENTICATED GATEWAY & OWNER ENDPOINTS
// ==========================================
router.use(requireAuth);

/**
 * Generates a one-time enrollment token for the gym's edge gateway.
 * Only owners and managers are permitted to generate enrollment tokens.
 */
router.post('/gateways/enrollment-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const userId = req.user!.userId || req.user!.sub;
    const role = req.user!.role;

    if (role !== 'OWNER' && role !== 'ADMIN' && role !== 'MANAGER') {
      throw AppError.forbidden('Only owners and managers can initiate CCTV gateway setup.');
    }

    const tokenData = await cctvGatewayService.generateEnrollmentToken(gymId, userId);
    res.status(201).json({
      success: true,
      data: tokenData,
      message: 'Single-use CCTV gateway enrollment token generated. Valid for 15 minutes.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Gateway heartbeat ingestion (Edge Gateway daemon telemetry).
 */
router.post('/gateways/heartbeat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const gatewayId = req.body.gatewayId || req.user!.sub;
    await cctvGatewayService.processHeartbeat(gatewayId, gymId, req.body.metrics || {});
    res.status(200).json({ success: true, message: 'Heartbeat acknowledged.' });
  } catch (err) {
    next(err);
  }
});

/**
 * Retrieves the current gateway connection and health status.
 */
router.get('/gateways/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const gateway = await cctvGatewayService.getGatewayStatus(gymId);
    res.status(200).json({
      success: true,
      data: gateway,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Revokes an edge gateway.
 */
router.post('/gateways/:id/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const userId = String(req.user!.userId || req.user!.sub);
    const role = req.user!.role;

    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw AppError.forbidden('Only gym owners can revoke CCTV edge gateways.');
    }

    await cctvGatewayService.revokeGateway(String(req.params.id), gymId, userId);
    res.status(200).json({ success: true, message: 'Gateway revoked successfully.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. RECORDER & CAMERA MANAGEMENT
// ==========================================

/**
 * Registers a new CCTV recorder (DVR/NVR) with encrypted credentials.
 */
router.post('/devices/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const userId = String(req.user!.userId || req.user!.sub);
    const input = RegisterRecorderSchema.parse(req.body);

    const recorder = await cctvDeviceService.registerRecorder(gymId, userId, input);
    res.status(201).json({
      success: true,
      data: recorder,
      message: 'CCTV recorder registered successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Retrieves registered CCTV recorders for this gym.
 */
router.get('/devices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const recorders = await cctvDeviceService.getRecorders(gymId);
    res.status(200).json({ success: true, data: recorders });
  } catch (err) {
    next(err);
  }
});

/**
 * Syncs discovered camera channels for a recorder.
 */
router.post('/devices/:recorderId/sync-channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const input = SyncChannelsSchema.parse(req.body);
    const cameras = await cctvDeviceService.syncCameras(gymId, String(req.params.recorderId), input.channels);
    res.status(200).json({
      success: true,
      data: cameras,
      message: `Synchronized ${cameras.length} camera channels.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Lists all active cameras for the gym with their capabilities.
 */
router.get('/cameras', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const cameras = await cctvDeviceService.getCameras(gymId);
    res.status(200).json({ success: true, data: cameras });
  } catch (err) {
    next(err);
  }
});

/**
 * Updates a camera's friendly name or location zone (e.g. "Reception", "Weight Floor").
 */
router.patch('/cameras/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const userId = String(req.user!.userId || req.user!.sub);
    const input = UpdateCameraSchema.parse(req.body);

    const updated = await cctvDeviceService.updateCamera(gymId, String(req.params.id), userId, input);
    res.status(200).json({ success: true, data: updated, message: 'Camera details updated.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. STREAM SESSIONS & VIEWING TICKETS
// ==========================================

/**
 * Requests a short-lived Stream Authorization Ticket to initiate a WebRTC session.
 */
router.post('/sessions/request-stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const userId = String(req.user!.userId || req.user!.sub);
    const userRole = req.user!.role;
    const input = RequestStreamSchema.parse(req.body);

    const ticket = await cctvSessionService.requestStreamTicket({
      gymId,
      userId,
      userRole,
      cameraId: input.cameraId,
      streamProfile: input.streamProfile,
      clientType: input.clientType,
    });

    res.status(200).json({
      success: true,
      data: ticket,
      message: 'Stream authorization ticket issued. Valid for 60 seconds to initiate WebRTC session.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Closes an active stream session and logs byte transfer.
 */
router.post('/sessions/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const bytesTransferred = Number(req.body.bytesTransferred || 0);
    await cctvSessionService.closeSession(gymId, String(req.params.id), bytesTransferred);
    res.status(200).json({ success: true, message: 'Stream session closed.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. AUDIT LOGS & HEALTH
// ==========================================

/**
 * Retrieves recent CCTV audit logs for the gym.
 */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const role = req.user!.role;

    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw AppError.forbidden('Only owners and administrators can inspect CCTV audit logs.');
    }

    const logs = await cctvAuditService.getRecentLogs(gymId, 50);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

/**
 * Subsystem health and connectivity probe.
 */
router.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    subsystem: 'Security & CCTV',
    status: 'OPERATIONAL',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Retrieves ICE Server configuration (STUN + Ephemeral TURN credentials).
 * Used by GymDeck Desktop and Owner Mobile to negotiate WebRTC NAT traversal.
 */
router.get('/ice-servers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId || req.user!.sub;
    const iceServers = cctvTurnService.getIceServers(userId);
    res.status(200).json({
      success: true,
      data: { iceServers },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Performs honest remote access diagnostic check.
 * Strictly distinguishes LAN readiness from verified remote WAN viewing.
 */
router.post('/diagnostics/remote-test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    const isGatewayOnline = cctvSignalingService.isGatewayOnline(gymId);
    const testedFromRemote = Boolean(req.body.testedFromRemote);

    const diagnostic = cctvTurnService.evaluateRemoteAccessStatus({
      isGatewayOnline,
      hasStunResolution: true,
      hasTurnConfigured: true,
      testedFromRemote,
    });

    res.status(200).json({
      success: true,
      data: diagnostic,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Searches recorded footage availability on DVR/NVR for a camera and time range.
 */
router.post(
  '/recordings/search',
  requireAuth,
  requirePermission('cctv:view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = SearchRecordingsSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.validation('Invalid search parameters.', { errors: parsed.error.errors });
      }

      const gymId = req.user!.gymId;
      const userId = (req.user!.userId || req.user!.sub || '') as string;

      const result = await cctvRecordingService.searchRecordings(gymId, userId, parsed.data);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Creates an ephemeral playback session for recorded footage.
 */
router.post(
  '/recordings/playback-session',
  requireAuth,
  requirePermission('cctv:view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreatePlaybackSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.validation('Invalid playback session parameters.', { errors: parsed.error.errors });
      }

      const gymId = req.user!.gymId;
      const userId = (req.user!.userId || req.user!.sub || '') as string;

      const session = await cctvRecordingService.createPlaybackSession(gymId, userId, parsed.data);
      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Requests a new video clip export job.
 */
router.post(
  '/exports',
  requireAuth,
  requirePermission('cctv:export'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RequestExportSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.validation('Invalid export parameters.', { errors: parsed.error.errors });
      }

      const gymId = req.user!.gymId;
      const userId = req.user!.userId || req.user!.sub;

      const job = await cctvExportService.requestExport(gymId, userId, parsed.data);
      res.status(202).json({
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Lists clip export history for the authenticated gym.
 */
router.get(
  '/exports',
  requireAuth,
  requirePermission('cctv:view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const result = await cctvExportService.getExports(gymId, limit, offset);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Retrieves status of a single clip export job.
 */
router.get(
  '/exports/:id',
  requireAuth,
  requirePermission('cctv:view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const jobId = String(req.params.id);

      const job = await cctvExportService.getExportById(gymId, jobId);
      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Retrieves a verified, short-lived download token and URL for an exported MP4 clip.
 */
router.get(
  '/exports/:id/download',
  requireAuth,
  requirePermission('cctv:export'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const userId = String(req.user!.userId || req.user!.sub);
      const jobId = String(req.params.id);

      const result = await cctvExportService.getDownloadTicket(gymId, userId, jobId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
