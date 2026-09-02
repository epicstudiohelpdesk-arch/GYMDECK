/**
 * GymDeck Cloud Backend - Owner Mobile Operations & Member Lifecycle API Routes (/v1/owner)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ownerService } from '../../../services/owner/ownerService';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole, requirePermission } from '../middleware/rbacMiddleware';
import { validateQuery, validateBody } from '../../../shared/validation';
import { AppError } from '../../../shared/errors';
import { db } from '../../../shared/database';
import { membershipPlans } from '../../../shared/database/schema';
import { eq, and, isNull } from 'drizzle-orm';

const router: Router = Router();

// All owner routes require authenticated owner/staff token
router.use(requireAuth);
router.use(requireRole(['OWNER', 'MANAGER', 'STAFF', 'ADMIN', 'RECEPTIONIST', 'TRAINER']));

// ==============================================================================
// Validation Schemas
// ==============================================================================

const GetMembersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  query: z.string().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'FROZEN', 'INACTIVE']).default('ALL'),
});

const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const CreateMemberBodySchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(7, 'Valid phone number is required'),
  alternatePhone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gender: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  memberCode: z.string().optional(),
  notes: z.string().optional(),
  planId: z.string().uuid().optional(),
  initialPaymentAmount: z.number().min(0).optional(),
  initialPaymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER']).optional(),
});

const UpdateMemberBodySchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gender: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  membershipStatus: z.enum(['ACTIVE', 'EXPIRED', 'FROZEN', 'INACTIVE']).optional(),
  notes: z.string().optional(),
});

// ==============================================================================
// 1. Dashboard Metrics
// ==============================================================================

router.get(
  '/dashboard',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const result = await ownerService.getDashboard(gymId);

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 2. Member Plans Lookup (For Admission)
// ==============================================================================

router.get(
  '/plans',
  requirePermission('memberships.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const plans = await db
        .select()
        .from(membershipPlans)
        .where(
          and(
            eq(membershipPlans.gymId, gymId),
            eq(membershipPlans.isActive, true),
            isNull(membershipPlans.deletedAt)
          )
        );

      res.status(200).json({
        success: true,
        data: { plans },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 3. Member Directory (List with Search & Filters)
// ==============================================================================

router.get(
  '/members',
  requirePermission('members.read'),
  validateQuery(GetMembersQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const { limit, offset, query, status } = req.query as any;
      const result = await ownerService.getMembers(
        gymId,
        Number(limit) || 50,
        Number(offset) || 0,
        query,
        status
      );

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 4. Create New Member
// ==============================================================================

router.post(
  '/members',
  requirePermission('members.write'),
  validateBody(CreateMemberBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorUserId = req.user!.userId || req.user!.sub;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const result = await ownerService.createMember(gymId, req.body, actorUserId);

      res.status(201).json({
        success: true,
        data: { member: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 5. Get Detailed Member Profile
// ==============================================================================

router.get(
  '/members/:id',
  requirePermission('members.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.getMemberById(gymId, memberId);

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 6. Update Member Profile
// ==============================================================================

router.patch(
  '/members/:id',
  requirePermission('members.write'),
  validateBody(UpdateMemberBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.updateMember(gymId, memberId, req.body, actorUserId);

      res.status(200).json({
        success: true,
        data: { member: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 7. Delete / Deactivate Member
// ==============================================================================

router.delete(
  '/members/:id',
  requirePermission('members.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.deleteMember(gymId, memberId, actorUserId);

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 8. Member Attendance History
// ==============================================================================

router.get(
  '/members/:id/attendance',
  requirePermission('attendance.read'),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const { limit, offset } = req.query as any;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.getMemberAttendance(
        gymId,
        memberId,
        Number(limit) || 50,
        Number(offset) || 0
      );

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 9. Member Payment History
// ==============================================================================

router.get(
  '/members/:id/payments',
  requirePermission('payments.read'),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const { limit, offset } = req.query as any;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.getMemberPayments(
        gymId,
        memberId,
        Number(limit) || 50,
        Number(offset) || 0
      );

      res.status(200).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 10. Member Memberships History
// ==============================================================================

router.get(
  '/members/:id/memberships',
  requirePermission('memberships.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.getMemberMemberships(gymId, memberId);

      res.status(200).json({
        success: true,
        data: { memberships: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 11. Generate / Regenerate Member Activation Invite
// ==============================================================================

router.post(
  '/members/:id/invite',
  requirePermission('members.write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!memberId) {
        throw AppError.validation('Member ID is required.');
      }

      const result = await ownerService.createMemberInvite(gymId, memberId, actorUserId);

      res.status(201).json({
        success: true,
        data: result,
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
