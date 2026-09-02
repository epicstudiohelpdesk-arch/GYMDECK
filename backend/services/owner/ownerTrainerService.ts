/**
 * GymDeck Cloud Backend - Trainer, Staff & Personal Training Management Service
 */

import * as crypto from 'crypto';
import { eq, and, isNull, desc, count, sql, or, ilike } from 'drizzle-orm';
import { db } from '../../shared/database';
import {
  gymMembers,
  trainers,
  trainerAssignments,
  ptPackages,
  ptSessions,
  trainerEarnings,
  payments,
  auditLogs,
  syncChangeLog,
  syncIdempotencyLog,
} from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface CreateTrainerDto {
  fullName: string;
  phone: string;
  email?: string;
  specialization?: string;
  experienceYears?: number;
  certifications?: string[];
  bio?: string;
  photoUrl?: string;
  commissionType?: 'FIXED_PER_SESSION' | 'PERCENTAGE';
  commissionRate?: number;
}

export interface UpdateTrainerDto {
  fullName?: string;
  phone?: string;
  email?: string;
  specialization?: string;
  experienceYears?: number;
  certifications?: string[];
  bio?: string;
  photoUrl?: string;
  commissionType?: 'FIXED_PER_SESSION' | 'PERCENTAGE';
  commissionRate?: number;
  rating?: number;
  isActive?: boolean;
}

export interface AssignTrainerDto {
  trainerId: string;
  notes?: string;
}

export interface PurchasePTPackageDto {
  trainerId: string;
  packageName: string;
  totalSessions: number;
  price: number;
  expiryDays?: number;
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  transactionReference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface SchedulePTSessionDto {
  packageId: string;
  trainerId: string;
  sessionDate: string;
  durationMinutes?: number;
  focusArea: string;
  notes?: string;
}

export interface CompletePTSessionDto {
  durationMinutes?: number;
  focusArea?: string;
  trainerNotes?: string;
}

export class OwnerTrainerService {
  /**
   * 1. Get All Trainers in Gym Tenant
   */
  public async getTrainers(
    gymId: string,
    includeInactive = false,
    query?: string
  ): Promise<any[]> {
    const conditions = [
      eq(trainers.gymId, gymId),
      isNull(trainers.deletedAt),
    ];

    if (!includeInactive) {
      conditions.push(eq(trainers.isActive, true));
    }

    if (query && query.trim().length > 0) {
      const term = `%${query.trim()}%`;
      conditions.push(
        or(
          ilike(trainers.fullName, term),
          ilike(trainers.phone, term),
          ilike(trainers.specialization, term)
        )!
      );
    }

    const rows = await db
      .select()
      .from(trainers)
      .where(and(...conditions))
      .orderBy(desc(trainers.createdAt));

    // Get active client counts for each trainer
    const result = await Promise.all(
      rows.map(async (t) => {
        const clientCountRes = await db
          .select({ count: count() })
          .from(trainerAssignments)
          .where(and(eq(trainerAssignments.gymId, gymId), eq(trainerAssignments.trainerId, t.id), eq(trainerAssignments.status, 'ACTIVE')));

        const activePackagesRes = await db
          .select({ count: count() })
          .from(ptPackages)
          .where(and(eq(ptPackages.gymId, gymId), eq(ptPackages.trainerId, t.id), eq(ptPackages.status, 'ACTIVE')));

        return {
          ...t,
          activeClientsCount: clientCountRes[0]?.count || 0,
          activePackagesCount: activePackagesRes[0]?.count || 0,
          certifications: t.certifications ? JSON.parse(t.certifications) : [],
        };
      })
    );

    return result;
  }

  /**
   * 2. Get Single Trainer Profile with Clients and Earnings
   */
  public async getTrainerById(gymId: string, trainerId: string): Promise<any> {
    const trainer = (
      await db
        .select()
        .from(trainers)
        .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, gymId), isNull(trainers.deletedAt)))
        .limit(1)
    )[0];

    if (!trainer) {
      throw AppError.notFound('Trainer not found in authorized gym tenant.');
    }

    // Active Clients
    const clients = await db
      .select({
        assignmentId: trainerAssignments.id,
        memberId: gymMembers.id,
        memberCode: gymMembers.memberCode,
        fullName: gymMembers.fullName,
        phone: gymMembers.phone,
        assignedAt: trainerAssignments.assignedAt,
        notes: trainerAssignments.notes,
      })
      .from(trainerAssignments)
      .innerJoin(gymMembers, eq(trainerAssignments.memberId, gymMembers.id))
      .where(
        and(
          eq(trainerAssignments.gymId, gymId),
          eq(trainerAssignments.trainerId, trainerId),
          eq(trainerAssignments.status, 'ACTIVE'),
          isNull(gymMembers.deletedAt)
        )
      );

    // Earnings Summary
    const earningsRes = await db
      .select({
        totalEarned: sql<string>`COALESCE(SUM(amount), 0)`,
        sessionCount: count(),
      })
      .from(trainerEarnings)
      .where(and(eq(trainerEarnings.gymId, gymId), eq(trainerEarnings.trainerId, trainerId)));

    return {
      ...trainer,
      certifications: trainer.certifications ? JSON.parse(trainer.certifications) : [],
      clients,
      earningsSummary: {
        totalEarned: Number(earningsRes[0]?.totalEarned || 0),
        totalSessionsCompleted: earningsRes[0]?.sessionCount || 0,
      },
    };
  }

  /**
   * 3. Create New Trainer
   */
  public async createTrainer(
    gymId: string,
    dto: CreateTrainerDto,
    actorUserId?: string
  ): Promise<any> {
    if (!dto.fullName || dto.fullName.trim().length < 2) {
      throw AppError.validation('Full name must be at least 2 characters.');
    }
    if (!dto.phone || dto.phone.trim().length < 7) {
      throw AppError.validation('Valid phone number is required.');
    }

    return await db.transaction(async (tx) => {
      const [trainer] = await tx
        .insert(trainers)
        .values({
          gymId,
          fullName: dto.fullName.trim(),
          phone: dto.phone.trim(),
          email: dto.email?.trim() || null,
          specialization: dto.specialization?.trim() || 'General Fitness & Strength',
          experienceYears: dto.experienceYears || 1,
          certifications: dto.certifications ? JSON.stringify(dto.certifications) : null,
          bio: dto.bio?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
          commissionType: dto.commissionType || 'FIXED_PER_SESSION',
          commissionRate: dto.commissionRate !== undefined ? dto.commissionRate.toFixed(2) : '0.00',
          isActive: true,
        })
        .returning();

      // Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'TRAINER_CREATED',
        resource: 'trainer',
        resourceId: trainer!.id,
        metadata: JSON.stringify({
          fullName: trainer!.fullName,
          specialization: trainer!.specialization,
          actorUserId,
        }),
      });

      // Desktop Sync Stream
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'trainer',
          entityId: trainer!.id,
          operation: 'CREATE',
          payload: trainer!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'trainer',
        entityId: trainer!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated trainer creation',
      });

      return trainer;
    });
  }

  /**
   * 4. Update Trainer Profile
   */
  public async updateTrainer(
    gymId: string,
    trainerId: string,
    dto: UpdateTrainerDto,
    actorUserId?: string
  ): Promise<any> {
    const existing = (
      await db
        .select()
        .from(trainers)
        .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, gymId), isNull(trainers.deletedAt)))
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Trainer not found in authorized gym tenant.');
    }

    const updates: any = { updatedAt: new Date() };
    if (dto.fullName !== undefined) updates.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) updates.phone = dto.phone.trim();
    if (dto.email !== undefined) updates.email = dto.email.trim();
    if (dto.specialization !== undefined) updates.specialization = dto.specialization.trim();
    if (dto.experienceYears !== undefined) updates.experienceYears = dto.experienceYears;
    if (dto.certifications !== undefined) updates.certifications = JSON.stringify(dto.certifications);
    if (dto.bio !== undefined) updates.bio = dto.bio.trim();
    if (dto.photoUrl !== undefined) updates.photoUrl = dto.photoUrl.trim();
    if (dto.commissionType !== undefined) updates.commissionType = dto.commissionType;
    if (dto.commissionRate !== undefined) updates.commissionRate = dto.commissionRate.toFixed(2);
    if (dto.rating !== undefined) updates.rating = dto.rating.toFixed(2);
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trainers)
        .set(updates)
        .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, gymId)))
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'TRAINER_UPDATED',
        resource: 'trainer',
        resourceId: trainerId,
        metadata: JSON.stringify({ updates, actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'trainer',
          entityId: trainerId,
          operation: 'UPDATE',
          payload: updated!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'trainer',
        entityId: trainerId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated trainer update',
      });

      return updated;
    });
  }

  /**
   * 5. Archive / Deactivate Trainer
   */
  public async archiveTrainer(
    gymId: string,
    trainerId: string,
    actorUserId?: string
  ): Promise<any> {
    const existing = (
      await db
        .select()
        .from(trainers)
        .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, gymId), isNull(trainers.deletedAt)))
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Trainer not found in authorized gym tenant.');
    }

    const now = new Date();
    return await db.transaction(async (tx) => {
      const [archived] = await tx
        .update(trainers)
        .set({
          isActive: false,
          deletedAt: now,
          updatedAt: now,
        })
        .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, gymId)))
        .returning();

      // End all active assignments for this trainer
      await tx
        .update(trainerAssignments)
        .set({
          status: 'ENDED',
          endedAt: now,
          updatedAt: now,
        })
        .where(and(eq(trainerAssignments.gymId, gymId), eq(trainerAssignments.trainerId, trainerId), eq(trainerAssignments.status, 'ACTIVE')));

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'TRAINER_ARCHIVED',
        resource: 'trainer',
        resourceId: trainerId,
        metadata: JSON.stringify({ actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'trainer',
          entityId: trainerId,
          operation: 'UPDATE',
          payload: archived!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'trainer',
        entityId: trainerId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated trainer archive',
      });

      return archived;
    });
  }

  /**
   * 6. Member ↔ Trainer Assignment
   */
  public async assignTrainer(
    gymId: string,
    memberId: string,
    dto: AssignTrainerDto,
    actorUserId?: string
  ): Promise<any> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const trainer = (
      await db
        .select()
        .from(trainers)
        .where(and(eq(trainers.id, dto.trainerId), eq(trainers.gymId, gymId), eq(trainers.isActive, true), isNull(trainers.deletedAt)))
        .limit(1)
    )[0];

    if (!trainer) {
      throw AppError.notFound('Active trainer not found in authorized gym tenant.');
    }

    const now = new Date();
    return await db.transaction(async (tx) => {
      // End existing active assignment for this member if any
      await tx
        .update(trainerAssignments)
        .set({
          status: 'ENDED',
          endedAt: now,
          updatedAt: now,
        })
        .where(and(eq(trainerAssignments.gymId, gymId), eq(trainerAssignments.memberId, memberId), eq(trainerAssignments.status, 'ACTIVE')));

      // Insert new assignment
      const [assignment] = await tx
        .insert(trainerAssignments)
        .values({
          gymId,
          memberId,
          trainerId: dto.trainerId,
          status: 'ACTIVE',
          assignedAt: now,
          notes: dto.notes?.trim() || null,
          assignedByUserId: actorUserId || null,
        })
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'TRAINER_ASSIGNED',
        resource: 'trainer_assignment',
        resourceId: assignment!.id,
        metadata: JSON.stringify({
          memberId,
          trainerId: dto.trainerId,
          trainerName: trainer.fullName,
          actorUserId,
        }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'trainer_assignment',
          entityId: assignment!.id,
          operation: 'CREATE',
          payload: {
            ...assignment!,
            trainerName: trainer.fullName,
            memberName: member.fullName,
          },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'trainer_assignment',
        entityId: assignment!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated trainer assignment',
      });

      return {
        assignment,
        trainer,
      };
    });
  }

  /**
   * 7. End Trainer Assignment
   */
  public async endTrainerAssignment(
    gymId: string,
    memberId: string,
    assignmentId: string,
    actorUserId?: string
  ): Promise<any> {
    const existing = (
      await db
        .select()
        .from(trainerAssignments)
        .where(
          and(
            eq(trainerAssignments.id, assignmentId),
            eq(trainerAssignments.gymId, gymId),
            eq(trainerAssignments.memberId, memberId),
            eq(trainerAssignments.status, 'ACTIVE')
          )
        )
        .limit(1)
    )[0];

    if (!existing) {
      throw AppError.notFound('Active trainer assignment not found.');
    }

    const now = new Date();
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(trainerAssignments)
        .set({
          status: 'ENDED',
          endedAt: now,
          updatedAt: now,
        })
        .where(eq(trainerAssignments.id, assignmentId))
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'TRAINER_ASSIGNMENT_ENDED',
        resource: 'trainer_assignment',
        resourceId: assignmentId,
        metadata: JSON.stringify({ memberId, actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'trainer_assignment',
          entityId: assignmentId,
          operation: 'UPDATE',
          payload: updated!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'trainer_assignment',
        entityId: assignmentId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated trainer assignment end',
      });

      return updated;
    });
  }

  /**
   * 8. Member Trainer Assignment History
   */
  public async getMemberTrainerHistory(gymId: string, memberId: string): Promise<any[]> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const rows = await db
      .select({
        id: trainerAssignments.id,
        status: trainerAssignments.status,
        assignedAt: trainerAssignments.assignedAt,
        endedAt: trainerAssignments.endedAt,
        notes: trainerAssignments.notes,
        trainerId: trainers.id,
        trainerName: trainers.fullName,
        trainerPhone: trainers.phone,
        specialization: trainers.specialization,
      })
      .from(trainerAssignments)
      .innerJoin(trainers, eq(trainerAssignments.trainerId, trainers.id))
      .where(and(eq(trainerAssignments.gymId, gymId), eq(trainerAssignments.memberId, memberId)))
      .orderBy(desc(trainerAssignments.assignedAt));

    return rows.map((r) => ({
      ...r,
      assignedAt: r.assignedAt.toISOString(),
      endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    }));
  }

  /**
   * 9. Purchase PT Package (Integrated with Phase 8 Financial Ledger)
   */
  public async purchasePTPackage(
    gymId: string,
    memberId: string,
    dto: PurchasePTPackageDto,
    actorUserId?: string
  ): Promise<any> {
    if (!dto.packageName || dto.packageName.trim().length < 2) {
      throw AppError.validation('Package name must be at least 2 characters.');
    }
    if (!dto.totalSessions || dto.totalSessions < 1) {
      throw AppError.validation('Total sessions must be at least 1.');
    }
    if (dto.price === undefined || dto.price < 0) {
      throw AppError.validation('Price cannot be negative.');
    }

    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const trainer = (
      await db
        .select()
        .from(trainers)
        .where(and(eq(trainers.id, dto.trainerId), eq(trainers.gymId, gymId), eq(trainers.isActive, true), isNull(trainers.deletedAt)))
        .limit(1)
    )[0];

    if (!trainer) {
      throw AppError.notFound('Active trainer not found in authorized gym tenant.');
    }

    const now = new Date();
    const expiryDays = dto.expiryDays || 90;
    const expiryDate = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    return await db.transaction(async (tx) => {
      let paymentRecord: any = null;

      // 1. Record Financial Ledger Entry if payment amount is provided
      if (dto.price > 0 && dto.paymentMethod) {
        const receiptNumber = `REC-PT-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const [payment] = await tx
          .insert(payments)
          .values({
            gymId,
            memberId,
            amount: dto.price.toFixed(2),
            paymentMethod: dto.paymentMethod,
            transactionReference: dto.transactionReference || null,
            receiptNumber,
            type: 'PAYMENT',
            status: 'COMPLETED',
            notes: `PT Package: ${dto.packageName} (${dto.totalSessions} Sessions with ${trainer.fullName})`,
            idempotencyKey: dto.idempotencyKey || undefined,
          })
          .returning();

        paymentRecord = payment;
      }

      // 2. Insert PT Package
      const [packageRow] = await tx
        .insert(ptPackages)
        .values({
          gymId,
          memberId,
          trainerId: dto.trainerId,
          paymentId: paymentRecord?.id || null,
          packageName: dto.packageName.trim(),
          totalSessions: dto.totalSessions,
          usedSessions: 0,
          remainingSessions: dto.totalSessions,
          price: dto.price.toFixed(2),
          startDate: now,
          expiryDate,
          status: 'ACTIVE',
          notes: dto.notes?.trim() || null,
        })
        .returning();

      // 3. Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PT_PACKAGE_PURCHASED',
        resource: 'pt_package',
        resourceId: packageRow!.id,
        metadata: JSON.stringify({
          memberId,
          trainerId: dto.trainerId,
          packageName: packageRow!.packageName,
          totalSessions: packageRow!.totalSessions,
          price: packageRow!.price,
          receiptNumber: paymentRecord?.receiptNumber,
          actorUserId,
        }),
      });

      // 4. Desktop Sync Stream
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'pt_package',
          entityId: packageRow!.id,
          operation: 'CREATE',
          payload: {
            ...packageRow!,
            memberName: member.fullName,
            trainerName: trainer.fullName,
          },
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'pt_package',
        entityId: packageRow!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated PT package purchase',
      });

      return {
        package: packageRow,
        payment: paymentRecord,
      };
    });
  }

  /**
   * 10. Get Member PT Packages List
   */
  public async getMemberPTPackages(gymId: string, memberId: string): Promise<any[]> {
    const member = (
      await db
        .select()
        .from(gymMembers)
        .where(and(eq(gymMembers.id, memberId), eq(gymMembers.gymId, gymId), isNull(gymMembers.deletedAt)))
        .limit(1)
    )[0];

    if (!member) {
      throw AppError.notFound('Member not found in authorized gym tenant.');
    }

    const rows = await db
      .select({
        id: ptPackages.id,
        packageName: ptPackages.packageName,
        totalSessions: ptPackages.totalSessions,
        usedSessions: ptPackages.usedSessions,
        remainingSessions: ptPackages.remainingSessions,
        price: ptPackages.price,
        startDate: ptPackages.startDate,
        expiryDate: ptPackages.expiryDate,
        status: ptPackages.status,
        notes: ptPackages.notes,
        trainerId: trainers.id,
        trainerName: trainers.fullName,
        trainerPhone: trainers.phone,
        specialization: trainers.specialization,
      })
      .from(ptPackages)
      .innerJoin(trainers, eq(ptPackages.trainerId, trainers.id))
      .where(and(eq(ptPackages.gymId, gymId), eq(ptPackages.memberId, memberId)))
      .orderBy(desc(ptPackages.createdAt));

    return rows.map((p) => ({
      ...p,
      startDate: p.startDate.toISOString(),
      expiryDate: p.expiryDate.toISOString(),
    }));
  }

  /**
   * 11. Complete PT Session & Deduct 1 Session with Concurrency Defense
   */
  public async completePTSession(
    gymId: string,
    packageId: string,
    dto: CompletePTSessionDto,
    actorUserId?: string
  ): Promise<any> {
    return await db.transaction(async (tx) => {
      // A. Lock PT Package Row for Update
      const pkg = (
        await tx
          .select()
          .from(ptPackages)
          .where(and(eq(ptPackages.id, packageId), eq(ptPackages.gymId, gymId)))
          .for('update')
      )[0];

      if (!pkg) {
        throw AppError.notFound('PT package not found in authorized gym tenant.');
      }

      if (pkg.remainingSessions <= 0 || pkg.status === 'DEPLETED') {
        throw AppError.conflict('Cannot complete session: Package has 0 remaining sessions (DEPLETED).');
      }

      const now = new Date();
      if (new Date(pkg.expiryDate) < now) {
        throw AppError.forbidden('Cannot complete session: PT package has EXPIRED.');
      }

      const newRemaining = pkg.remainingSessions - 1;
      const newUsed = pkg.usedSessions + 1;
      const newStatus = newRemaining === 0 ? 'DEPLETED' : 'ACTIVE';

      // B. Update Package Session Balance
      await tx
        .update(ptPackages)
        .set({
          remainingSessions: newRemaining,
          usedSessions: newUsed,
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(ptPackages.id, packageId));

      // C. Insert Completed PT Session Record
      const [session] = await tx
        .insert(ptSessions)
        .values({
          gymId,
          packageId,
          memberId: pkg.memberId,
          trainerId: pkg.trainerId,
          sessionDate: now,
          completedAt: now,
          durationMinutes: dto.durationMinutes || 60,
          focusArea: dto.focusArea || 'General Strength & Conditioning',
          trainerNotes: dto.trainerNotes || null,
          status: 'COMPLETED',
          recordedByUserId: actorUserId || null,
        })
        .returning();

      // D. Lookup Trainer Commission Structure & Record Earning
      const trainer = (
        await tx
          .select()
          .from(trainers)
          .where(eq(trainers.id, pkg.trainerId))
          .limit(1)
      )[0];

      let earningAmount = 0;
      let rateApplied = 0;
      let earningBasis = 'PER_SESSION';

      if (trainer) {
        const commRate = Number(trainer.commissionRate || 0);
        rateApplied = commRate;
        if (trainer.commissionType === 'PERCENTAGE') {
          earningBasis = 'PERCENTAGE_COMMISSION';
          const perSessionPrice = Number(pkg.price) / pkg.totalSessions;
          earningAmount = (perSessionPrice * commRate) / 100;
        } else {
          earningBasis = 'PER_SESSION';
          earningAmount = commRate;
        }
      }

      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [earning] = await tx
        .insert(trainerEarnings)
        .values({
          gymId,
          trainerId: pkg.trainerId,
          sessionId: session!.id,
          packageId,
          memberId: pkg.memberId,
          earningBasis,
          rateApplied: rateApplied.toFixed(2),
          amount: earningAmount.toFixed(2),
          status: 'ACCRUED',
          period,
          notes: `Session completed for package ${pkg.packageName}`,
        })
        .returning();

      // E. Audit Log
      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PT_SESSION_COMPLETED',
        resource: 'pt_session',
        resourceId: session!.id,
        metadata: JSON.stringify({
          packageId,
          memberId: pkg.memberId,
          trainerId: pkg.trainerId,
          remainingSessions: newRemaining,
          earningAmount,
          actorUserId,
        }),
      });

      // F. Sync Stream
      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'pt_session',
          entityId: session!.id,
          operation: 'CREATE',
          payload: session!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'pt_session',
        entityId: session!.id,
        operation: 'CREATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated PT session completion',
      });

      return {
        session,
        packageRemainingSessions: newRemaining,
        packageStatus: newStatus,
        earning,
      };
    });
  }

  /**
   * 12. Cancel PT Session (Does NOT deduct package sessions)
   */
  public async cancelPTSession(
    gymId: string,
    sessionId: string,
    reason: string,
    actorUserId?: string
  ): Promise<any> {
    if (!reason || reason.trim().length < 3) {
      throw AppError.validation('A valid cancellation reason is required.');
    }

    const session = (
      await db
        .select()
        .from(ptSessions)
        .where(and(eq(ptSessions.id, sessionId), eq(ptSessions.gymId, gymId)))
        .limit(1)
    )[0];

    if (!session) {
      throw AppError.notFound('PT session not found.');
    }

    if (session.status === 'CANCELLED') {
      throw AppError.conflict('PT session is already cancelled.');
    }

    const now = new Date();
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(ptSessions)
        .set({
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason.trim(),
        })
        .where(eq(ptSessions.id, sessionId))
        .returning();

      await tx.insert(auditLogs).values({
        gymId,
        actorType: 'OWNER',
        action: 'PT_SESSION_CANCELLED',
        resource: 'pt_session',
        resourceId: sessionId,
        metadata: JSON.stringify({ reason: reason.trim(), actorUserId }),
      });

      const eventId = crypto.randomUUID();
      const [change] = await tx
        .insert(syncChangeLog)
        .values({
          gymId,
          eventId,
          entityType: 'pt_session',
          entityId: sessionId,
          operation: 'UPDATE',
          payload: updated!,
          sourceDevice: 'OWNER_MOBILE',
          actorUserId: actorUserId || undefined,
        })
        .returning();

      await tx.insert(syncIdempotencyLog).values({
        gymId,
        eventId,
        entityType: 'pt_session',
        entityId: sessionId,
        operation: 'UPDATE',
        serverSequence: change!.serverSequence,
        status: 'APPLIED',
        responseSummary: 'Mobile-originated PT session cancellation',
      });

      return updated;
    });
  }

  /**
   * 13. Get Trainer Earnings Ledger
   */
  public async getTrainerEarnings(
    gymId: string,
    trainerId: string,
    period?: string
  ): Promise<{ items: any[]; totalAccrued: number; totalPaid: number }> {
    const trainer = (
      await db
        .select()
        .from(trainers)
        .where(and(eq(trainers.id, trainerId), eq(trainers.gymId, gymId), isNull(trainers.deletedAt)))
        .limit(1)
    )[0];

    if (!trainer) {
      throw AppError.notFound('Trainer not found in authorized gym tenant.');
    }

    const conditions = [
      eq(trainerEarnings.gymId, gymId),
      eq(trainerEarnings.trainerId, trainerId),
    ];

    if (period) {
      conditions.push(eq(trainerEarnings.period, period));
    }

    const rows = await db
      .select({
        id: trainerEarnings.id,
        amount: trainerEarnings.amount,
        rateApplied: trainerEarnings.rateApplied,
        earningBasis: trainerEarnings.earningBasis,
        status: trainerEarnings.status,
        period: trainerEarnings.period,
        notes: trainerEarnings.notes,
        createdAt: trainerEarnings.createdAt,
        memberId: gymMembers.id,
        memberName: gymMembers.fullName,
        memberCode: gymMembers.memberCode,
      })
      .from(trainerEarnings)
      .innerJoin(gymMembers, eq(trainerEarnings.memberId, gymMembers.id))
      .where(and(...conditions))
      .orderBy(desc(trainerEarnings.createdAt));

    let totalAccrued = 0;
    let totalPaid = 0;

    rows.forEach((r) => {
      const amt = Number(r.amount);
      if (r.status === 'ACCRUED') totalAccrued += amt;
      if (r.status === 'PAID') totalPaid += amt;
    });

    return {
      items: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      totalAccrued,
      totalPaid,
    };
  }
}

export const ownerTrainerService = new OwnerTrainerService();
export default ownerTrainerService;
