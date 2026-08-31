import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import { trainers, ptPackages, ptSessions } from '../../shared/database/schema';

export interface TrainerProfileResponse {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  bio: string | null;
  certifications: string[];
  rating: string;
  photoUrl: string | null;
}

export interface PtPackageResponse {
  id: string;
  trainerId: string;
  trainerName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
  expiresAt: string | null;
}

export interface PtSessionItem {
  id: string;
  sessionDate: string;
  durationMinutes: number;
  focusArea: string;
  trainerNotes: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export class PtService {
  /**
   * 1. Get member's assigned trainer profile
   */
  public async getTrainerProfile(gymId: string, memberId: string): Promise<TrainerProfileResponse | null> {
    // Check if member has a trainer assigned through active package
    const packages = await db
      .select({
        package: ptPackages,
        trainer: trainers,
      })
      .from(ptPackages)
      .innerJoin(trainers, eq(ptPackages.trainerId, trainers.id))
      .where(and(eq(ptPackages.gymId, gymId), eq(ptPackages.memberId, memberId), eq(ptPackages.status, 'ACTIVE')))
      .limit(1);

    let targetTrainer: typeof trainers.$inferSelect | null = null;

    if (packages.length > 0) {
      targetTrainer = packages[0]!.trainer;
    } else {
      // Fall back to head trainer for this gym
      const gymTrainers = await db
        .select()
        .from(trainers)
        .where(eq(trainers.gymId, gymId))
        .limit(1);

      if (gymTrainers.length > 0) {
        targetTrainer = gymTrainers[0]!;
      }
    }

    if (!targetTrainer) {
      return null;
    }

    let parsedCerts: string[] = [];
    if (targetTrainer.certifications) {
      try {
        parsedCerts = JSON.parse(targetTrainer.certifications);
      } catch {
        parsedCerts = [targetTrainer.certifications];
      }
    }

    return {
      id: targetTrainer.id,
      fullName: targetTrainer.fullName,
      email: targetTrainer.email,
      phone: targetTrainer.phone,
      specialization: targetTrainer.specialization,
      bio: targetTrainer.bio,
      certifications: parsedCerts,
      rating: targetTrainer.rating ?? '5.00',
      photoUrl: targetTrainer.photoUrl,
    };
  }

  /**
   * 2. Get member's active PT package
   */
  public async getPtPackage(gymId: string, memberId: string): Promise<PtPackageResponse | null> {
    const packages = await db
      .select({
        pkg: ptPackages,
        trainer: trainers,
      })
      .from(ptPackages)
      .innerJoin(trainers, eq(ptPackages.trainerId, trainers.id))
      .where(and(eq(ptPackages.gymId, gymId), eq(ptPackages.memberId, memberId)))
      .orderBy(desc(ptPackages.createdAt))
      .limit(1);

    if (packages.length === 0) {
      return null;
    }

    const { pkg, trainer } = packages[0]!;

    return {
      id: pkg.id,
      trainerId: trainer.id,
      trainerName: trainer.fullName,
      totalSessions: pkg.totalSessions,
      usedSessions: pkg.usedSessions,
      remainingSessions: pkg.remainingSessions,
      status: pkg.status as any,
      expiresAt: pkg.expiryDate ? pkg.expiryDate.toISOString() : null,
    };
  }

  /**
   * 3. Get member's PT session history
   */
  public async getPtSessions(gymId: string, memberId: string): Promise<PtSessionItem[]> {
    const sessions = await db
      .select()
      .from(ptSessions)
      .where(and(eq(ptSessions.gymId, gymId), eq(ptSessions.memberId, memberId)))
      .orderBy(desc(ptSessions.sessionDate));

    return sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      durationMinutes: s.durationMinutes,
      focusArea: s.focusArea,
      trainerNotes: s.trainerNotes,
      status: s.status as any,
    }));
  }
}

export const ptService = new PtService();
export default ptService;
