/**
 * GymDeck Cloud Backend - Owner Analytics & Business Intelligence Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { analyticsService } from '../../../services/analytics/analyticsService';
import { requirePermission } from '../middleware/rbacMiddleware';
import { AppError } from '../../../shared/errors';
import { ExportReportType } from '../../../services/analytics/types';

const router: Router = Router();

const AnalyticsQuerySchema = z.object({
  range: z.enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'custom']).default('this_month'),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().default('UTC'),
});

const ExportQuerySchema = AnalyticsQuerySchema.extend({
  type: z.enum(['MEMBERS', 'ATTENDANCE', 'REVENUE', 'MEMBERSHIPS', 'TRAINERS']).default('MEMBERS'),
});

/**
 * 1. Executive Overview Analytics Dashboard
 * GET /v1/owner/analytics/overview
 */
router.get(
  '/overview',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const parsedQuery = AnalyticsQuerySchema.parse(req.query);
      const overview = await analyticsService.getOverview(gymId, parsedQuery);

      res.status(200).json({
        success: true,
        data: overview,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 2. Revenue & Financial Ledger Analytics
 * GET /v1/owner/analytics/revenue
 */
router.get(
  '/revenue',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const parsedQuery = AnalyticsQuerySchema.parse(req.query);
      const revenueData = await analyticsService.getRevenueAnalytics(gymId, parsedQuery);

      res.status(200).json({
        success: true,
        data: revenueData,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 3. Membership & Subscription Lifecycle Analytics
 * GET /v1/owner/analytics/memberships
 */
router.get(
  '/memberships',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const parsedQuery = AnalyticsQuerySchema.parse(req.query);
      const membershipData = await analyticsService.getMembershipAnalytics(gymId, parsedQuery);

      res.status(200).json({
        success: true,
        data: membershipData,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 4. Attendance & Foot-Traffic Pattern Analytics
 * GET /v1/owner/analytics/attendance
 */
router.get(
  '/attendance',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const parsedQuery = AnalyticsQuerySchema.parse(req.query);
      const attendanceData = await analyticsService.getAttendanceAnalytics(gymId, parsedQuery);

      res.status(200).json({
        success: true,
        data: attendanceData,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 5. Trainer & Personal Training Analytics
 * GET /v1/owner/analytics/trainers
 */
router.get(
  '/trainers',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const parsedQuery = AnalyticsQuerySchema.parse(req.query);
      const trainerData = await analyticsService.getTrainerAnalytics(gymId, parsedQuery);

      res.status(200).json({
        success: true,
        data: trainerData,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * 6. Export Analytics Report to CSV
 * GET /v1/owner/analytics/export
 */
router.get(
  '/export',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorUserId = req.user!.userId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const parsedQuery = ExportQuerySchema.parse(req.query);
      const exportResult = await analyticsService.exportReport(
        gymId,
        parsedQuery.type as ExportReportType,
        parsedQuery,
        actorUserId
      );

      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.status(200).send(exportResult.data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
