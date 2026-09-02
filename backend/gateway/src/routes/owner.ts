/**
 * GymDeck Cloud Backend - Owner Mobile Operations, Member Lifecycle, Financial Ledger, Attendance & Trainer/PT Routes (/v1/owner)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ownerService } from '../../../services/owner/ownerService';
import { billingService } from '../../../services/billing/billingService';
import { ownerAttendanceService } from '../../../services/owner/ownerAttendanceService';
import { ownerMembershipService } from '../../../services/owner/ownerMembershipService';
import { ownerTrainerService } from '../../../services/owner/ownerTrainerService';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole, requirePermission } from '../middleware/rbacMiddleware';
import { validateQuery, validateBody } from '../../../shared/validation';
import { AppError } from '../../../shared/errors';

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

const CreatePlanBodySchema = z.object({
  planName: z.string().min(2, 'Plan name must be at least 2 characters'),
  durationDays: z.number().int().min(1, 'Duration must be at least 1 day'),
  price: z.number().min(0, 'Price cannot be negative'),
  description: z.string().optional(),
  benefits: z.array(z.string()).optional(),
});

const UpdatePlanBodySchema = z.object({
  planName: z.string().min(2).optional(),
  durationDays: z.number().int().min(1).optional(),
  price: z.number().min(0).optional(),
  description: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const PurchaseMembershipBodySchema = z.object({
  planId: z.string().uuid('Valid Plan ID is required'),
  startDate: z.string().optional(),
  paymentAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER']).optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const FreezeMembershipBodySchema = z.object({
  reason: z.string().min(3, 'A valid reason (minimum 3 characters) is required to freeze membership'),
});

const GetExpiringMembershipsQuerySchema = z.object({
  daysAhead: z.coerce.number().int().min(1).max(90).default(7),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const RecordPaymentBodySchema = z.object({
  membershipId: z.string().uuid().optional(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER']),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const RefundPaymentBodySchema = z.object({
  reason: z.string().min(3, 'A reason is required for refund / reversal'),
  refundAmount: z.number().positive('Refund amount must be greater than 0').optional(),
});

const CheckInBodySchema = z.object({
  memberId: z.string().uuid().optional(),
  memberCode: z.string().optional(),
  entryMethod: z.enum(['CODE_LOOKUP', 'QR_DYNAMIC', 'MANUAL', 'RFID', 'BIOMETRIC']).optional(),
  deviceMetadata: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const ManualAttendanceBodySchema = z.object({
  memberId: z.string().uuid().optional(),
  memberCode: z.string().optional(),
  checkInTime: z.string().min(1, 'Check-in time is required'),
  checkOutTime: z.string().optional(),
  notes: z.string().min(3, 'Reason / notes (minimum 3 characters) is required for manual attendance'),
});

const CheckOutBodySchema = z.object({
  checkOutTime: z.string().optional(),
});

const GetAttendanceQuerySchema = z.object({
  date: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  query: z.string().optional(),
});

const CreateTrainerBodySchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  specialization: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  certifications: z.array(z.string()).optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  commissionType: z.enum(['FIXED_PER_SESSION', 'PERCENTAGE']).optional(),
  commissionRate: z.number().min(0).optional(),
});

const UpdateTrainerBodySchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional().or(z.literal('')),
  specialization: z.string().optional(),
  experienceYears: z.number().int().min(0).optional(),
  certifications: z.array(z.string()).optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  commissionType: z.enum(['FIXED_PER_SESSION', 'PERCENTAGE']).optional(),
  commissionRate: z.number().min(0).optional(),
  rating: z.number().min(1).max(5).optional(),
  isActive: z.boolean().optional(),
});

const AssignTrainerBodySchema = z.object({
  trainerId: z.string().uuid('Valid Trainer ID is required'),
  notes: z.string().optional(),
});

const PurchasePTPackageBodySchema = z.object({
  trainerId: z.string().uuid('Valid Trainer ID is required'),
  packageName: z.string().min(2, 'Package name must be at least 2 characters'),
  totalSessions: z.number().int().min(1, 'Total sessions must be at least 1'),
  price: z.number().min(0, 'Price cannot be negative'),
  expiryDays: z.number().int().min(1).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER']).optional(),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const CompletePTSessionBodySchema = z.object({
  durationMinutes: z.number().int().min(1).optional(),
  focusArea: z.string().optional(),
  trainerNotes: z.string().optional(),
});

const CancelPTSessionBodySchema = z.object({
  reason: z.string().min(3, 'A reason is required to cancel a PT session'),
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

router.get(
  '/billing/dashboard',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const result = await billingService.getFinancialDashboard(gymId);

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
// 2. Membership Plans Management
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

      const plans = await billingService.getPlans(gymId, req.query.includeInactive === 'true');

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

router.post(
  '/plans',
  requirePermission('memberships.write'),
  validateBody(CreatePlanBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorUserId = req.user!.userId || req.user!.sub;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }

      const plan = await billingService.createPlan(gymId, req.body, actorUserId);

      res.status(201).json({
        success: true,
        data: { plan },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/plans/:id',
  requirePermission('memberships.write'),
  validateBody(UpdatePlanBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const planId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;
      if (!gymId) {
        throw AppError.forbidden('Tenant gym context is missing from token.');
      }
      if (!planId) {
        throw AppError.validation('Plan ID is required.');
      }

      const plan = await billingService.updatePlan(gymId, planId, req.body, actorUserId);

      res.status(200).json({
        success: true,
        data: { plan },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==============================================================================
// 3. Member Directory
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
// 4. Membership Lifecycle & Operations
// ==============================================================================

router.get(
  '/memberships/stats',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const result = await ownerMembershipService.getMembershipLifecycleStats(gymId);

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

router.get(
  '/memberships/expiring',
  requirePermission('memberships.read'),
  validateQuery(GetExpiringMembershipsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const { daysAhead, limit, offset } = req.query as any;
      const result = await ownerMembershipService.getExpiringMemberships(
        gymId,
        Number(daysAhead) || 7,
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

router.get(
  '/members/:id/memberships/current',
  requirePermission('memberships.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerMembershipService.getCurrentMembership(gymId, memberId);

      res.status(200).json({
        success: true,
        data: { membership: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/members/:id/memberships',
  requirePermission('memberships.write'),
  validateBody(PurchaseMembershipBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await billingService.purchaseMembership(gymId, memberId, req.body, actorUserId);

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

router.post(
  '/members/:id/memberships/renew',
  requirePermission('memberships.write'),
  validateBody(PurchaseMembershipBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await billingService.renewMembership(gymId, memberId, req.body, actorUserId);

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

router.post(
  '/members/:id/memberships/:membershipId/freeze',
  requirePermission('memberships.write'),
  validateBody(FreezeMembershipBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const membershipId = req.params.membershipId;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId || !membershipId) throw AppError.validation('Member ID and Membership ID are required.');

      const result = await ownerMembershipService.freezeMembership(gymId, memberId, membershipId, req.body, actorUserId);

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

router.post(
  '/members/:id/memberships/:membershipId/unfreeze',
  requirePermission('memberships.write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const membershipId = req.params.membershipId;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId || !membershipId) throw AppError.validation('Member ID and Membership ID are required.');

      const result = await ownerMembershipService.unfreezeMembership(gymId, memberId, membershipId, actorUserId);

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

router.get(
  '/members/:id/memberships',
  requirePermission('memberships.read'),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const { limit, offset } = req.query as any;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerMembershipService.getMembershipHistory(
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
// 5. Billing, Ledger & Payments
// ==============================================================================

router.get(
  '/members/:id/billing',
  requirePermission('payments.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await billingService.getMemberBillingSummary(gymId, memberId);

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

router.get(
  '/members/:id/payments',
  requirePermission('payments.read'),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const { limit, offset } = req.query as any;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

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

router.post(
  '/members/:id/payments',
  requirePermission('payments.write'),
  validateBody(RecordPaymentBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await billingService.recordPayment(gymId, memberId, req.body, actorUserId);

      res.status(201).json({
        success: true,
        data: { payment: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/payments/:id/refund',
  requirePermission('payments.write'),
  validateBody(RefundPaymentBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const paymentId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!paymentId) throw AppError.validation('Payment ID is required.');

      const result = await billingService.refundPayment(gymId, paymentId, req.body, actorUserId);

      res.status(200).json({
        success: true,
        data: { refund: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/payments/:id/receipt',
  requirePermission('payments.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const paymentId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!paymentId) throw AppError.validation('Payment ID is required.');

      const result = await billingService.getReceipt(gymId, paymentId);

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
// 6. Attendance & Check-In Management
// ==============================================================================

router.get(
  '/attendance',
  requirePermission('attendance.read'),
  validateQuery(GetAttendanceQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const { date, limit, offset, query } = req.query as any;
      const result = await ownerAttendanceService.getDailyAttendance(
        gymId,
        date,
        Number(limit) || 50,
        Number(offset) || 0,
        query
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

router.post(
  '/attendance/check-in',
  requirePermission('attendance.write'),
  validateBody(CheckInBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorUserId = req.user!.userId || req.user!.sub;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const result = await ownerAttendanceService.checkInMember(gymId, req.body, actorUserId);

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

router.post(
  '/attendance/manual',
  requirePermission('attendance.write'),
  validateBody(ManualAttendanceBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorUserId = req.user!.userId || req.user!.sub;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const result = await ownerAttendanceService.recordManualAttendance(gymId, req.body, actorUserId);

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

router.patch(
  '/attendance/:id/checkout',
  requirePermission('attendance.write'),
  validateBody(CheckOutBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const attendanceId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!attendanceId) throw AppError.validation('Attendance ID is required.');

      const result = await ownerAttendanceService.checkOutMember(gymId, attendanceId, req.body, actorUserId);

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

router.get(
  '/attendance/stats',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const result = await ownerAttendanceService.getAttendanceStats(gymId, req.query.date as string);

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

router.get(
  '/members/:id/attendance',
  requirePermission('attendance.read'),
  validateQuery(PaginationQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const { limit, offset } = req.query as any;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerAttendanceService.getMemberAttendanceHistory(
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
// 7. Trainer & Personal Training Management
// ==============================================================================

router.get(
  '/trainers',
  requirePermission('trainers.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const result = await ownerTrainerService.getTrainers(
        gymId,
        req.query.includeInactive === 'true',
        req.query.query as string
      );

      res.status(200).json({
        success: true,
        data: { trainers: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/trainers',
  requirePermission('trainers.write'),
  validateBody(CreateTrainerBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const actorUserId = req.user!.userId || req.user!.sub;
      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');

      const result = await ownerTrainerService.createTrainer(gymId, req.body, actorUserId);

      res.status(201).json({
        success: true,
        data: { trainer: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/trainers/:id',
  requirePermission('trainers.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const trainerId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!trainerId) throw AppError.validation('Trainer ID is required.');

      const result = await ownerTrainerService.getTrainerById(gymId, trainerId);

      res.status(200).json({
        success: true,
        data: { trainer: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/trainers/:id',
  requirePermission('trainers.write'),
  validateBody(UpdateTrainerBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const trainerId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!trainerId) throw AppError.validation('Trainer ID is required.');

      const result = await ownerTrainerService.updateTrainer(gymId, trainerId, req.body, actorUserId);

      res.status(200).json({
        success: true,
        data: { trainer: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/trainers/:id',
  requirePermission('trainers.write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const trainerId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!trainerId) throw AppError.validation('Trainer ID is required.');

      const result = await ownerTrainerService.archiveTrainer(gymId, trainerId, actorUserId);

      res.status(200).json({
        success: true,
        data: { trainer: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/members/:id/trainer-assignment',
  requirePermission('pt.write'),
  validateBody(AssignTrainerBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerTrainerService.assignTrainer(gymId, memberId, req.body, actorUserId);

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

router.patch(
  '/members/:id/trainer-assignment/:assignmentId/end',
  requirePermission('pt.write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const assignmentId = req.params.assignmentId;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId || !assignmentId) throw AppError.validation('Member ID and Assignment ID are required.');

      const result = await ownerTrainerService.endTrainerAssignment(gymId, memberId, assignmentId, actorUserId);

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

router.get(
  '/members/:id/trainer-history',
  requirePermission('trainers.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerTrainerService.getMemberTrainerHistory(gymId, memberId);

      res.status(200).json({
        success: true,
        data: { history: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/members/:id/pt-packages',
  requirePermission('pt.write'),
  validateBody(PurchasePTPackageBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerTrainerService.purchasePTPackage(gymId, memberId, req.body, actorUserId);

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

router.get(
  '/members/:id/pt-packages',
  requirePermission('pt.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

      const result = await ownerTrainerService.getMemberPTPackages(gymId, memberId);

      res.status(200).json({
        success: true,
        data: { packages: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/pt-packages/:packageId/complete-session',
  requirePermission('pt.write'),
  validateBody(CompletePTSessionBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const packageId = req.params.packageId;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!packageId) throw AppError.validation('Package ID is required.');

      const result = await ownerTrainerService.completePTSession(gymId, packageId, req.body, actorUserId);

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

router.post(
  '/pt-sessions/:sessionId/cancel',
  requirePermission('pt.write'),
  validateBody(CancelPTSessionBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const sessionId = req.params.sessionId;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!sessionId) throw AppError.validation('Session ID is required.');

      const result = await ownerTrainerService.cancelPTSession(gymId, sessionId, req.body.reason, actorUserId);

      res.status(200).json({
        success: true,
        data: { session: result },
        meta: { requestId: req.id, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/trainers/:id/earnings',
  requirePermission('reports.read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const trainerId = req.params.id;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!trainerId) throw AppError.validation('Trainer ID is required.');

      const result = await ownerTrainerService.getTrainerEarnings(gymId, trainerId, req.query.period as string);

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
// 8. Digital Invitations
// ==============================================================================

router.post(
  '/members/:id/invite',
  requirePermission('members.write'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gymId = req.user!.gymId;
      const memberId = req.params.id;
      const actorUserId = req.user!.userId || req.user!.sub;

      if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
      if (!memberId) throw AppError.validation('Member ID is required.');

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
