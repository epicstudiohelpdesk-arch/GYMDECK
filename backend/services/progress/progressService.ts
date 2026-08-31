/**
 * GymDeck Cloud Backend - Fitness Progress Domain Service
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import { bodyWeightLogs, bodyMeasurements, fitnessMilestones, auditLogs } from '../../shared/database/schema';
import { AppError } from '../../shared/errors';

export interface WeightLogDto {
  weightKg: number;
  notes?: string;
}

export interface MeasurementLogDto {
  chestCm?: number;
  waistCm?: number;
  armsCm?: number;
  thighsCm?: number;
  hipsCm?: number;
}

export class ProgressService {
  /**
   * 1. Get body weight logs history
   */
  public async getWeightHistory(gymId: string, memberId: string) {
    const logs = await db
      .select()
      .from(bodyWeightLogs)
      .where(and(eq(bodyWeightLogs.gymId, gymId), eq(bodyWeightLogs.memberId, memberId)))
      .orderBy(desc(bodyWeightLogs.loggedDate));

    return logs.map((l) => ({
      id: l.id,
      weightKg: parseFloat(l.weightKg),
      bmi: l.bmi ? parseFloat(l.bmi) : null,
      loggedDate: typeof l.loggedDate === 'string' ? l.loggedDate : new Date(l.loggedDate).toISOString(),
      notes: l.notes,
    }));
  }

  /**
   * 2. Log body weight measurement
   */
  public async logWeight(gymId: string, memberId: string, dto: WeightLogDto) {
    if (dto.weightKg < 30 || dto.weightKg > 300) {
      throw AppError.validation('Body weight must be between 30 kg and 300 kg.');
    }

    const todayStr = new Date().toISOString().split('T')[0]!;

    const [inserted] = await db
      .insert(bodyWeightLogs)
      .values({
        gymId,
        memberId,
        weightKg: dto.weightKg.toString(),
        notes: dto.notes,
        loggedDate: todayStr,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      gymId,
      memberId,
      actorType: 'MEMBER',
      action: 'PROGRESS_WEIGHT_LOGGED',
      resource: 'body_weight_logs',
      resourceId: inserted!.id,
    });

    return {
      id: inserted!.id,
      weightKg: parseFloat(inserted!.weightKg),
      loggedDate: typeof inserted!.loggedDate === 'string' ? inserted!.loggedDate : new Date(inserted!.loggedDate).toISOString(),
      notes: inserted!.notes,
    };
  }

  /**
   * 3. Get body circumference measurements
   */
  public async getMeasurements(gymId: string, memberId: string) {
    const measurements = await db
      .select()
      .from(bodyMeasurements)
      .where(and(eq(bodyMeasurements.gymId, gymId), eq(bodyMeasurements.memberId, memberId)))
      .orderBy(desc(bodyMeasurements.measuredDate));

    return measurements.map((m) => ({
      id: m.id,
      chestCm: m.chestCm ? parseFloat(m.chestCm) : null,
      waistCm: m.waistCm ? parseFloat(m.waistCm) : null,
      armsCm: m.armsCm ? parseFloat(m.armsCm) : null,
      thighsCm: m.thighsCm ? parseFloat(m.thighsCm) : null,
      hipsCm: m.hipsCm ? parseFloat(m.hipsCm) : null,
      measuredDate: typeof m.measuredDate === 'string' ? m.measuredDate : new Date(m.measuredDate).toISOString(),
    }));
  }

  /**
   * 4. Log body circumference measurements
   */
  public async logMeasurements(gymId: string, memberId: string, dto: MeasurementLogDto) {
    const todayStr = new Date().toISOString().split('T')[0]!;

    const [inserted] = await db
      .insert(bodyMeasurements)
      .values({
        gymId,
        memberId,
        chestCm: dto.chestCm ? dto.chestCm.toString() : null,
        waistCm: dto.waistCm ? dto.waistCm.toString() : null,
        armsCm: dto.armsCm ? dto.armsCm.toString() : null,
        thighsCm: dto.thighsCm ? dto.thighsCm.toString() : null,
        hipsCm: dto.hipsCm ? dto.hipsCm.toString() : null,
        measuredDate: todayStr,
      })
      .returning();

    return {
      id: inserted!.id,
      chestCm: inserted!.chestCm ? parseFloat(inserted!.chestCm) : null,
      waistCm: inserted!.waistCm ? parseFloat(inserted!.waistCm) : null,
      armsCm: inserted!.armsCm ? parseFloat(inserted!.armsCm) : null,
      thighsCm: inserted!.thighsCm ? parseFloat(inserted!.thighsCm) : null,
      hipsCm: inserted!.hipsCm ? parseFloat(inserted!.hipsCm) : null,
      measuredDate: typeof inserted!.measuredDate === 'string' ? inserted!.measuredDate : new Date(inserted!.measuredDate).toISOString(),
    };
  }

  /**
   * 5. Get achieved fitness milestones
   */
  public async getMilestones(gymId: string, memberId: string) {
    const milestones = await db
      .select()
      .from(fitnessMilestones)
      .where(and(eq(fitnessMilestones.gymId, gymId), eq(fitnessMilestones.memberId, memberId)))
      .orderBy(desc(fitnessMilestones.achievedDate));

    return milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      badgeIcon: m.badgeIcon,
      achievedDate: typeof m.achievedDate === 'string' ? m.achievedDate : new Date(m.achievedDate).toISOString(),
    }));
  }
}

export const progressService = new ProgressService();
export default progressService;
