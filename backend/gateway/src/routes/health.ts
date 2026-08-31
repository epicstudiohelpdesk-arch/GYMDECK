/**
 * GymDeck Cloud Backend - Health & Readiness Check Routes (/health, /ready)
 */

import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../../shared/database';
import { config } from '../../../shared/config';

const router: Router = Router();
const startTime = Date.now();

/**
 * Liveness Probe: GET /health
 * Validates that the Node.js event loop and HTTP server are responsive.
 */
router.get('/health', (req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'gymdeck-cloud-gateway',
      version: '1.0.0',
      environment: config.NODE_ENV,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Readiness Probe: GET /ready
 * Validates that downstream dependencies (PostgreSQL database pool) are connected and responsive.
 */
router.get('/ready', async (req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  const isReady = dbHealth.status === 'up' || config.NODE_ENV === 'development';

  const readinessData = {
    status: isReady ? 'ready' : 'not_ready',
    service: 'gymdeck-cloud-gateway',
    version: '1.0.0',
    environment: config.NODE_ENV,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    database: {
      status: dbHealth.status,
      latencyMs: dbHealth.latencyMs,
    },
    memory: {
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  };

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    data: readinessData,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
