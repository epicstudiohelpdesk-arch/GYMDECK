/**
 * GymDeck Cloud Backend - Server Bootstrap & Graceful Lifecycle Manager
 */

import { Server } from 'http';
import { createApp } from './app';
import { config } from '../../shared/config';
import { logger } from '../../shared/logging';
import { closeDatabasePool } from '../../shared/database';

let server: Server | null = null;

export function startServer(): Server {
  const app = createApp();

  server = app.listen(config.PORT, config.HOST, () => {
    logger.info(`🚀 GymDeck Cloud Gateway listening at http://${config.HOST}:${config.PORT}`, {
      environment: config.NODE_ENV,
      port: config.PORT,
      nodeVersion: process.version,
      pid: process.pid,
    });
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
