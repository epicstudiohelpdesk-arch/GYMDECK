/**
 * GymDeck Cloud Backend - Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.') || 'body';
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path]!.push(err.message);
        });

        next(AppError.validation('Request validation failed', fieldErrors));
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.') || 'query';
          if (!fieldErrors[path]) {
            fieldErrors[path] = [];
          }
          fieldErrors[path]!.push(err.message);
        });

        next(AppError.validation('Invalid query parameters', fieldErrors));
        return;
      }
      next(error);
    }
  };
}
