/**
 * GymDeck Cloud Backend - Server Bootstrap & Graceful Lifecycle Manager
 */

import { Server, createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createApp } from './app';
import { config } from '../../shared/config';
import { logger } from '../../shared/logging';
import { closeDatabasePool } from '../../shared/database';
import { communicationRetentionWorker } from '../../services/communications/retentionWorker';
import { cctvSignalingService } from '../../services/cctv/cctvSignalingService';

let server: Server | null = null;
let wss: WebSocketServer | null = null;

export function startServer(): Server {
  const app = createApp();
  server = createServer(app);

  // Initialize CCTV WebRTC Signaling WebSocket server
  wss = new WebSocketServer({ noServer: true });
  cctvSignalingService.init(wss);

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    if (pathname === '/v1/cctv/signaling') {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(config.PORT, config.HOST, () => {
    logger.info(`🚀 GymDeck Cloud Gateway listening at http://${config.HOST}:${config.PORT}`, {
      environment: config.NODE_ENV,
      port: config.PORT,
      nodeVersion: process.version,
      pid: process.pid,
    });
    if (config.NODE_ENV !== 'test') {
      communicationRetentionWorker.start();
    }
  });

  return server;
}

// Graceful Shutdown Logic
async function handleShutdown(signal: string): Promise<void> {
  logger.info(`[Lifecycle] Received ${signal}. Commencing graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('[Lifecycle] HTTP server closed.');
      try {
        await closeDatabasePool();
        logger.info('[Lifecycle] Graceful shutdown complete. Exiting.');
        process.exit(0);
      } catch (err) {
        logger.error('[Lifecycle] Error during database shutdown', err);
        process.exit(1);
      }
    });

    // Force exit after timeout if hanging
    setTimeout(() => {
      logger.warn('[Lifecycle] Forced shutdown due to 10-second timeout');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('[Fatal] Uncaught Exception', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Fatal] Unhandled Promise Rejection', reason);
});

// Auto-start server when run directly
if (require.main === module || process.env.NODE_ENV !== 'test') {
  startServer();
}

export default startServer;
