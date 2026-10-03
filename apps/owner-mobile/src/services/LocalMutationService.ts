/**
 * GymDeck Owner Mobile - Local Mutation Service
 *
 * Orchestrates offline-first domain mutations across repositories.
 * Guarantees that business mutations and canonical outbox events are committed
 * atomically within the same SQLite transaction using native op-sqlite APIs.
 *
 * Zero HTTP requests during mutation execution.
 */

import { LocalDatabaseManager } from '../database/LocalDatabaseManager';
import {
  MemberRepository,
  MemberMembershipRepository,
  MembershipPlanRepository,
  AttendanceRepository,
  PaymentRepository,
  TrainerRepository,
  PTPackageRepository,
  OutboxRepository,
} from '../database/repositories';
import {
  GymMemberRecord,
  MemberMembershipRecord,
  AttendanceLogRecord,
  PaymentRecord,
  MembershipPlanRecord,
  TrainerRecord,
  TrainerAssignmentRecord,
  PTPackageRecord,
  PTSessionRecord,
  IDatabaseExecutor,
} from '../database/types';
import { generateUUID } from '../database/utils';
import { DatabaseError } from '../database/errors';
import { MinorUnits } from '../types/money';

export interface AdmitMemberInput {
  gymId?: string;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  notes?: string;
  planId?: string;
  initialPaymentAmount?: number; // In Rupees (will be converted to paise)
  initialPaymentMethod?: string;
}

export interface AdmitMemberResult {
  member: GymMemberRecord;
  membership?: MemberMembershipRecord;
  payment?: PaymentRecord;
  isLocalOnly: boolean;
}

export class LocalMutationService {
  private static instance: LocalMutationService | null = null;

  private dbManager: LocalDatabaseManager;
  private memberRepo: MemberRepository;
  private membershipRepo: MemberMembershipRepository;
  private planRepo: MembershipPlanRepository;
  private attendanceRepo: AttendanceRepository;
  private paymentRepo: PaymentRepository;
  private trainerRepo: TrainerRepository;
  private ptRepo: PTPackageRepository;
  private outboxRepo: OutboxRepository;

  private constructor() {
    this.dbManager = LocalDatabaseManager.getInstance();
    this.outboxRepo = new OutboxRepository(this.dbManager);
    this.memberRepo = new MemberRepository(this.dbManager, this.outboxRepo);
    this.membershipRepo = new MemberMembershipRepository(this.dbManager, this.outboxRepo);
    this.planRepo = new MembershipPlanRepository(this.dbManager, this.outboxRepo);
    this.attendanceRepo = new AttendanceRepository(this.dbManager, this.outboxRepo);
    this.paymentRepo = new PaymentRepository(this.dbManager, this.outboxRepo);
    this.trainerRepo = new TrainerRepository(this.dbManager, this.outboxRepo);
    this.ptRepo = new PTPackageRepository(this.dbManager, this.outboxRepo);
  }

  public static getInstance(): LocalMutationService {
    if (!LocalMutationService.instance) {
      LocalMutationService.instance = new LocalMutationService();
    }
    return LocalMutationService.instance;
  }

  private resolveGymId(explicitGymId?: string): string {
    if (explicitGymId) return explicitGymId;
    const active = this.dbManager.getActiveGymId();
    if (!active) {
      throw new DatabaseError('No active gym tenant context found for local mutation', 'NO_TENANT_CONTEXT');
    }
    return active;
  }

  /**
   * Complete member admission use case.
   * Atomically executes member creation, membership enrollment, and initial payment
   * within a SINGLE native database transaction.
   * All corresponding outbox events are committed together.
   */
  public async admitMember(input: AdmitMemberInput): Promise<AdmitMemberResult> {
    const gymId = this.resolveGymId(input.gymId);

    return this.dbManager.runInTransaction(async (tx: IDatabaseExecutor) => {
      const now = new Date();
      const nowIso = now.toISOString();

      // Generate a member code for offline display
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const memberCode = `GD-OFF-${randomCode}`;
      const memberId = generateUUID();

      // 1. Create Member
      const member = await this.memberRepo.create(
        {
          id: memberId,
          gymId,
          memberCode,
          fullName: input.fullName.trim(),
          phone: input.phone.trim(),
          alternatePhone: input.alternatePhone?.trim() || null,
          email: input.email?.trim() || null,
          gender: input.gender || null,
          dob: input.dob?.trim() || null,
          address: input.address?.trim() || null,
          membershipStatus: 'ACTIVE',
          joinedAt: nowIso,
          notes: input.notes?.trim() || null,
        },
        tx
      );

      let membership: MemberMembershipRecord | undefined;
      let payment: PaymentRecord | undefined;

      // 2. If plan is selected, create membership enrollment
      if (input.planId) {
        const plan = await this.planRepo.findById(input.planId, gymId, tx);
        const durationDays = plan ? plan.duration_days : 30;
        const planPrice = plan ? plan.price_minor_units : 0;

        const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const membershipId = generateUUID();

        membership = await this.membershipRepo.create(
          {
            id: membershipId,
            gymId,
            memberId: member.id,
            planId: input.planId,
            status: 'ACTIVE',
            startDate: nowIso,
            endDate,
            priceAtPurchaseMinorUnits: planPrice,
            autoRenew: false,
          },
          tx
        );

        // 3. If initial payment provided, record financial ledger payment
        if (input.initialPaymentAmount && input.initialPaymentAmount > 0) {
          const amountMinorUnits = Math.round(input.initialPaymentAmount * 100);
          const paymentId = generateUUID();
          const receiptNumber = `RCP-OFF-${Date.now().toString().slice(-6)}`;

          payment = await this.paymentRepo.recordPayment(
            {
              id: paymentId,
              gymId,
              memberId: member.id,
              membershipId: membership.id,
              amountMinorUnits,
              paymentMethod: input.initialPaymentMethod || 'CASH',
              receiptNumber,
              status: 'COMPLETED',
              notes: 'Initial admission payment',
              paidAt: nowIso,
            },
            tx
          );
        }
      }

      return {
        member,
        membership,
        payment,
        isLocalOnly: true,
      };
    });
  }

  /**
   * Update member profile locally with transactional outbox.
   */
  public async updateMember(
    id: string,
    updates: {
      fullName?: string;
      phone?: string;
      alternatePhone?: string | null;
      email?: string | null;
      gender?: string | null;
      dob?: string | null;
      address?: string | null;
      membershipStatus?: any;
      notes?: string | null;
    },
    gymId?: string
  ): Promise<GymMemberRecord> {
    return this.memberRepo.update(id, updates, gymId);
  }

  /**
   * Soft delete member locally with transactional outbox.
   */
  public async deleteMember(id: string, gymId?: string): Promise<boolean> {
    return this.memberRepo.softDelete(id, gymId);
  }

  /**
   * Renew membership use case.
   * Atomically extends/creates member subscription and records payment if provided.
   */
  public async renewMembership(input: {
    memberId: string;
    planId: string;
    paymentAmount?: number; // In Rupees
    paymentMethod?: string;
    notes?: string;
    gymId?: string;
  }): Promise<{
    membership: MemberMembershipRecord;
    payment?: PaymentRecord;
  }> {
    const gymId = this.resolveGymId(input.gymId);

    return this.dbManager.runInTransaction(async (tx: IDatabaseExecutor) => {
      const now = new Date();
      const nowIso = now.toISOString();

      const plan = await this.planRepo.findById(input.planId, gymId, tx);
      const durationDays = plan ? plan.duration_days : 30;
      const planPrice = plan ? plan.price_minor_units : 0;

      // Check for current active membership to calculate contiguous start date
      const activeMem = await this.membershipRepo.findActiveByMemberId(input.memberId, gymId);
      let startDate = nowIso;
      if (activeMem && new Date(activeMem.end_date).getTime() > now.getTime()) {
        startDate = activeMem.end_date;
      }

      const startDateTime = new Date(startDate);
      const endDate = new Date(startDateTime.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      const membershipId = generateUUID();

      const membership = await this.membershipRepo.create(
        {
          id: membershipId,
          gymId,
          memberId: input.memberId,
          planId: input.planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          priceAtPurchaseMinorUnits: planPrice,
          autoRenew: false,
        },
        tx
      );

      let payment: PaymentRecord | undefined;
      if (input.paymentAmount && input.paymentAmount > 0) {
        const amountMinorUnits = Math.round(input.paymentAmount * 100);
        const paymentId = generateUUID();
        const receiptNumber = `RCP-OFF-${Date.now().toString().slice(-6)}`;

        payment = await this.paymentRepo.recordPayment(
          {
            id: paymentId,
            gymId,
            memberId: input.memberId,
            membershipId: membership.id,
            amountMinorUnits,
            paymentMethod: input.paymentMethod || 'CASH',
            receiptNumber,
            status: 'COMPLETED',
            notes: input.notes || 'Membership renewal payment',
            paidAt: nowIso,
          },
          tx
        );
      }

      return {
        membership,
        payment,
      };
    });
  }

  /**
   * Check in member locally with transactional outbox.
   */
  public async checkInMember(params: {
    memberId?: string;
    memberCode?: string;
    entryMethod?: string;
    gymId?: string;
    notes?: string;
    checkInTime?: string;
  }): Promise<AttendanceLogRecord> {
    const gymId = this.resolveGymId(params.gymId);

    let memberId = params.memberId;
    if (!memberId && params.memberCode) {
      const member = await this.memberRepo.findByMemberCode(params.memberCode, gymId);
      if (!member) {
        throw new DatabaseError(`Member with code '${params.memberCode}' not found`, 'MEMBER_NOT_FOUND');
      }
      memberId = member.id;
    }

    if (!memberId) {
      throw new DatabaseError('Member identification required for check-in', 'INVALID_PARAMS');
    }

    return this.attendanceRepo.recordCheckIn({
      gymId,
      memberId,
      entryMethod: params.entryMethod || 'MANUAL',
      notes: params.notes ?? null,
      checkInTime: params.checkInTime,
    });
  }

  /**
   * Check out member locally with transactional outbox.
   */
  public async checkOutMember(
    attendanceId: string,
    checkOutTime?: string,
    gymId?: string
  ): Promise<boolean> {
    return this.attendanceRepo.recordCheckOut(attendanceId, checkOutTime, gymId);
  }

  /**
   * Void attendance record locally with transactional outbox.
   */
  public async voidAttendance(
    attendanceId: string,
    reason?: string,
    gymId?: string
  ): Promise<boolean> {
    return this.attendanceRepo.voidAttendance(attendanceId, reason, gymId);
  }

  /**
   * Record payment locally with transactional outbox.
   */
  public async recordPayment(params: {
    gymId?: string;
    memberId: string;
    membershipId?: string | null;
    amountMinorUnits: MinorUnits;
    paymentMethod: string;
    transactionReference?: string | null;
    receiptNumber?: string | null;
    notes?: string | null;
  }): Promise<PaymentRecord> {
    const gymId = this.resolveGymId(params.gymId);
    return this.paymentRepo.recordPayment({
      gymId,
      memberId: params.memberId,
      membershipId: params.membershipId ?? null,
      amountMinorUnits: params.amountMinorUnits,
      paymentMethod: params.paymentMethod,
      transactionReference: params.transactionReference ?? null,
      receiptNumber: params.receiptNumber ?? `RCP-OFF-${Date.now().toString().slice(-6)}`,
      status: 'COMPLETED',
      notes: params.notes ?? null,
    });
  }

  /**
   * Record refund locally with transactional outbox.
   */
  public async recordRefund(
    originalPaymentId: string,
    reason?: string,
    gymId?: string
  ): Promise<PaymentRecord> {
    return this.paymentRepo.recordRefund(originalPaymentId, reason, gymId);
  }

  /**
   * Create membership plan locally with transactional outbox.
   */
  public async createPlan(params: {
    gymId?: string;
    planName: string;
    durationDays: number;
    priceMinorUnits: MinorUnits;
    description?: string | null;
    benefits?: string | null;
    isActive?: boolean;
  }): Promise<MembershipPlanRecord> {
    const gymId = this.resolveGymId(params.gymId);
    return this.planRepo.create({
      gymId,
      ...params,
    });
  }

  /**
   * Update membership plan locally with transactional outbox.
   */
  public async updatePlan(
    id: string,
    updates: {
      planName?: string;
      durationDays?: number;
      priceMinorUnits?: MinorUnits;
      description?: string | null;
      benefits?: string | null;
      isActive?: boolean;
    },
    gymId?: string
  ): Promise<MembershipPlanRecord> {
    return this.planRepo.update(id, updates, gymId);
  }

  /**
   * Soft-delete membership plan locally with transactional outbox.
   */
  public async deletePlan(id: string, gymId?: string): Promise<boolean> {
    return this.planRepo.softDelete(id, gymId);
  }

  /**
   * Create trainer locally with transactional outbox.
   */
  public async createTrainer(params: {
    gymId?: string;
    fullName: string;
    phone: string;
    email?: string | null;
    specialization?: string | null;
    experienceYears?: number | null;
    bio?: string | null;
    isActive?: boolean;
  }): Promise<TrainerRecord> {
    const gymId = this.resolveGymId(params.gymId);
    return this.trainerRepo.create({
      gymId,
      ...params,
    });
  }

  /**
   * Update trainer locally with transactional outbox.
   */
  public async updateTrainer(
    id: string,
    updates: {
      fullName?: string;
      phone?: string;
      email?: string | null;
      specialization?: string | null;
      experienceYears?: number | null;
      bio?: string | null;
      isActive?: boolean;
    },
    gymId?: string
  ): Promise<TrainerRecord> {
    return this.trainerRepo.update(id, updates, gymId);
  }

  /**
   * Soft-delete trainer locally with transactional outbox.
   */
  public async deleteTrainer(id: string, gymId?: string): Promise<boolean> {
    return this.trainerRepo.softDelete(id, gymId);
  }

  /**
   * Assign trainer to member locally with transactional outbox.
   */
  public async assignTrainer(params: {
    memberId: string;
    trainerId: string;
    notes?: string;
    gymId?: string;
  }): Promise<TrainerAssignmentRecord> {
    const gymId = this.resolveGymId(params.gymId);
    return this.trainerRepo.assignTrainer({
      gymId,
      memberId: params.memberId,
      trainerId: params.trainerId,
      notes: params.notes,
    });
  }

  /**
   * Create PT package locally with transactional outbox.
   */
  public async createPTPackage(params: {
    gymId?: string;
    memberId: string;
    trainerId: string;
    packageName: string;
    totalSessions: number;
    remainingSessions: number;
    priceMinorUnits: MinorUnits;
    expiryDate: string;
  }): Promise<PTPackageRecord> {
    const gymId = this.resolveGymId(params.gymId);
    return this.ptRepo.createPackage({
      gymId,
      ...params,
    });
  }

  /**
   * Purchase PT package with optional financial ledger transaction in a single native transaction.
   */
  public async purchasePTPackage(input: {
    memberId: string;
    trainerId: string;
    packageName: string;
    totalSessions: number;
    price: number; // in Rupees
    expiryDays?: number;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;
    gymId?: string;
  }): Promise<{
    package: PTPackageRecord;
    payment?: PaymentRecord;
  }> {
    const gymId = this.resolveGymId(input.gymId);

    return this.dbManager.runInTransaction(async (tx: IDatabaseExecutor) => {
      const now = new Date();
      const nowIso = now.toISOString();
      const expiryDays = input.expiryDays || 90;
      const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      const priceMinorUnits = Math.round(input.price * 100);
      const packageId = generateUUID();

      // 1. Create PT Package row
      const ptPackage = await this.ptRepo.createPackage(
        {
          id: packageId,
          gymId,
          memberId: input.memberId,
          trainerId: input.trainerId,
          packageName: input.packageName,
          totalSessions: input.totalSessions,
          usedSessions: 0,
          remainingSessions: input.totalSessions,
          priceMinorUnits,
          expiryDate,
          status: 'ACTIVE',
        },
        tx
      );

      // 2. If payment method provided and price > 0, record financial payment
      let payment: PaymentRecord | undefined;
      if (input.paymentMethod && priceMinorUnits > 0) {
        const paymentId = generateUUID();
        const receiptNumber = `RCP-OFF-${Date.now().toString().slice(-6)}`;

        payment = await this.paymentRepo.recordPayment(
          {
            id: paymentId,
            gymId,
            memberId: input.memberId,
            amountMinorUnits: priceMinorUnits,
            paymentMethod: input.paymentMethod,
            transactionReference: input.transactionReference ?? null,
            receiptNumber,
            status: 'COMPLETED',
            notes: input.notes || `PT Package Purchase: ${input.packageName}`,
            paidAt: nowIso,
          },
          tx
        );
      }

      return {
        package: ptPackage,
        payment,
      };
    });
  }

  /**
   * Record PT session locally with transactional outbox.
   * Auto-resolves memberId/trainerId from package if not explicitly provided.
   */
  public async recordPTSession(params: {
    gymId?: string;
    packageId: string;
    memberId?: string;
    trainerId?: string;
    sessionDate?: string;
    durationMinutes?: number;
    focusArea?: string | null;
    trainerNotes?: string | null;
  }): Promise<PTSessionRecord> {
    const gymId = this.resolveGymId(params.gymId);

    let memberId = params.memberId;
    let trainerId = params.trainerId;

    if (!memberId || !trainerId) {
      const pkg = await this.ptRepo.findPackageById(params.packageId, gymId);
      if (!pkg) {
        throw new DatabaseError(`PT package '${params.packageId}' not found`, 'PACKAGE_NOT_FOUND');
      }
      memberId = memberId || pkg.member_id;
      trainerId = trainerId || pkg.trainer_id;
    }

    return this.ptRepo.createSession({
      gymId,
      packageId: params.packageId,
      memberId,
      trainerId,
      sessionDate: params.sessionDate || new Date().toISOString(),
      durationMinutes: params.durationMinutes ?? 60,
      focusArea: params.focusArea ?? null,
      trainerNotes: params.trainerNotes ?? null,
    });
  }
}

export const localMutationService = LocalMutationService.getInstance();
