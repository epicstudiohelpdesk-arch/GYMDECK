/**
 * GymDeck Cloud Backend - Express Application Bootstrap
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config, isDevelopment } from '../../shared/config';
import { requestIdMiddleware } from './middleware/requestId';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';
import { logger } from '../../shared/logging';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS Configuration
  const corsOrigins = config.CORS_ORIGINS === '*'
    ? '*'
    : config.CORS_ORIGINS.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'Idempotency-Key'],
    })
  );

  // 3. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Correlation & Request Tracking
  app.use(requestIdMiddleware);

  // 5. Request Logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path !== '/health') {
        logger.info(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, {
          requestId: req.id,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: duration,
          ip: req.ip,
        });
      }
    });
    next();
  });

  // 6. Root Routing
  app.use('/', routes);

  // 7. 404 Handler
  app.use(notFoundHandler);

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
