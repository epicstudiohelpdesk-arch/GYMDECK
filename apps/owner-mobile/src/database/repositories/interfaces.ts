/**
 * GymDeck Owner Mobile - Repository Contracts (Gate 4 Offline Mutations + Transactional Outbox)
 *
 * Establishes the persistence boundary for offline-first operations across all core domains:
 * 1. Membership Plans
 * 2. Member Memberships / Subscriptions
 * 3. Trainers
 * 4. Attendance (Event semantics: Check-In, Check-Out, Void)
 * 5. Payments (Immutable ledger: Cash/Manual payment, Discrete linked Refund)
 * 6. PT Packages
 * 7. PT Sessions
 *
 * Strict Financial Precision:
 * All monetary amounts are handled strictly as integer minor units (paise: 1 INR = 100 paise).
 */

import { MinorUnits } from '../../types/money';
import { MemberProfileData } from '../../types';
import {
  VaultMetadataRecord,
  GymMemberRecord,
  MembershipStatusType,
  MembershipPlanRecord,
  MemberMembershipRecord,
  AttendanceLogRecord,
  PaymentRecord,
  TrainerRecord,
  PTPackageRecord,
  PTSessionRecord,
  IDatabaseExecutor,
} from '../types';

export interface IVaultRepository {
  getMetadata(): Promise<VaultMetadataRecord | null>;
  setMetadata(gymId: string, vaultVersion?: number, deviceId?: string): Promise<void>;
}

export interface CreateGymMemberInput {
  id?: string;
  gymId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  membershipStatus?: MembershipStatusType;
  joinedAt?: string;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface UpdateGymMemberInput {
  fullName?: string;
  phone?: string;
  alternatePhone?: string | null;
  email?: string | null;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  membershipStatus?: MembershipStatusType;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface IMemberRepository {
  findById(id: string, gymId?: string): Promise<GymMemberRecord | null>;
  findByMemberCode(memberCode: string, gymId?: string): Promise<GymMemberRecord | null>;
  list(params?: {
    gymId?: string;
    status?: MembershipStatusType | string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<GymMemberRecord[]>;
  create(input: CreateGymMemberInput, executor?: IDatabaseExecutor): Promise<GymMemberRecord>;
  upsert(input: CreateGymMemberInput): Promise<GymMemberRecord>;
  upsertBatch(inputs: CreateGymMemberInput[]): Promise<number>;
  update(id: string, updates: UpdateGymMemberInput, gymId?: string, executor?: IDatabaseExecutor): Promise<GymMemberRecord>;
  softDelete(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean>;
  count(params?: { gymId?: string; status?: MembershipStatusType | string }): Promise<number>;
  getMemberProfile(id: string, gymId?: string): Promise<MemberProfileData | null>;
}

// ==============================================================================
// 1. Membership Plans
// ==============================================================================

export interface CreateMembershipPlanInput {
  id?: string;
  gymId: string;
  planName: string;
  durationDays: number;
  priceMinorUnits: MinorUnits; // Integer paise
  description?: string | null;
  benefits?: string | null;
  isActive?: boolean;
}

export interface UpdateMembershipPlanInput {
  planName?: string;
  durationDays?: number;
  priceMinorUnits?: MinorUnits;
  description?: string | null;
  benefits?: string | null;
  isActive?: boolean;
}

export interface IMembershipPlanRepository {
  findById(id: string, gymId?: string): Promise<MembershipPlanRecord | null>;
  list(params?: { gymId?: string; onlyActive?: boolean; search?: string }): Promise<MembershipPlanRecord[]>;
  create(input: CreateMembershipPlanInput, executor?: IDatabaseExecutor): Promise<MembershipPlanRecord>;
  upsert(input: CreateMembershipPlanInput, gymId?: string): Promise<MembershipPlanRecord>;
  upsertBatch(inputs: CreateMembershipPlanInput[], gymId?: string): Promise<number>;
  update(id: string, updates: UpdateMembershipPlanInput, gymId?: string, executor?: IDatabaseExecutor): Promise<MembershipPlanRecord>;
  softDelete(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean>;
}

// ==============================================================================
// 2. Member Memberships
// ==============================================================================

export interface CreateMemberMembershipInput {
  id?: string;
  gymId: string;
  memberId: string;
  planId: string;
  status?: string;
  startDate: string;
  endDate: string;
  priceAtPurchaseMinorUnits: MinorUnits;
  autoRenew?: boolean;
  frozenAt?: string | null;
  freezeReason?: string | null;
}

export interface IMemberMembershipRepository {
  findById(id: string, gymId?: string): Promise<MemberMembershipRecord | null>;
  findActiveByMemberId(memberId: string, gymId?: string): Promise<MemberMembershipRecord | null>;
  listByMemberId(memberId: string, gymId?: string): Promise<MemberMembershipRecord[]>;
  list(params?: { gymId?: string; status?: string; limit?: number; offset?: number }): Promise<MemberMembershipRecord[]>;
  create(input: CreateMemberMembershipInput, executor?: IDatabaseExecutor): Promise<MemberMembershipRecord>;
  upsert(input: CreateMemberMembershipInput, gymId?: string): Promise<MemberMembershipRecord>;
  upsertBatch(inputs: CreateMemberMembershipInput[], gymId?: string): Promise<number>;
  updateStatus(id: string, status: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean>;
}

// ==============================================================================
// 3. Trainers
// ==============================================================================

export interface CreateTrainerInput {
  id?: string;
  gymId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  bio?: string | null;
  isActive?: boolean;
}

export interface ITrainerRepository {
  findById(id: string, gymId?: string): Promise<TrainerRecord | null>;
  list(params?: { gymId?: string; onlyActive?: boolean; search?: string }): Promise<TrainerRecord[]>;
  create(input: CreateTrainerInput, executor?: IDatabaseExecutor): Promise<TrainerRecord>;
  upsert(input: CreateTrainerInput, gymId?: string): Promise<TrainerRecord>;
  upsertBatch(inputs: CreateTrainerInput[], gymId?: string): Promise<number>;
  update(id: string, updates: Partial<CreateTrainerInput>, gymId?: string, executor?: IDatabaseExecutor): Promise<TrainerRecord>;
  softDelete(id: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean>;
}

// ==============================================================================
// 4. Attendance
// ==============================================================================

export interface RecordCheckInInput {
  id?: string;
  gymId: string;
  memberId: string;
  checkInTime?: string;
  checkOutTime?: string | null;
  entryMethod?: string;
  deviceMetadata?: string | null;
  notes?: string | null;
  recordedByUserId?: string | null;
}

export interface AttendanceListItem {
  id: string;
  gymId: string;
  memberId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  membershipStatus: string;
  checkInTime: string;
  checkOutTime: string | null;
  entryMethod: string;
  deviceMetadata: string | null;
  notes: string | null;
  recordedByUserId: string | null;
  createdAt: string;
}

export interface AttendanceStatsSummary {
  onFloorCount: number;
  todayTotalCheckIns: number;
  todayCheckedOut: number;
}

export interface IAttendanceRepository {
  recordCheckIn(input: RecordCheckInInput, executor?: IDatabaseExecutor): Promise<AttendanceLogRecord>;
  recordCheckOut(id: string, checkOutTime?: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean>;
  voidAttendance(id: string, reason?: string, gymId?: string, executor?: IDatabaseExecutor): Promise<boolean>;
  listByMember(memberId: string, limit?: number, gymId?: string): Promise<AttendanceLogRecord[]>;
  listRecent(limit?: number, gymId?: string): Promise<AttendanceLogRecord[]>;
  listDaily(params?: { date?: string; query?: string; limit?: number; offset?: number; gymId?: string }): Promise<{ items: AttendanceListItem[]; totalCount: number }>;
  countToday(gymId?: string): Promise<number>;
  getStats(date?: string, gymId?: string): Promise<AttendanceStatsSummary>;
  upsert(input: RecordCheckInInput, gymId?: string): Promise<AttendanceLogRecord>;
  upsertBatch(inputs: RecordCheckInInput[], gymId?: string): Promise<number>;
}

// ==============================================================================
// 5. Payments & Ledger
// ==============================================================================

export interface RecordPaymentInput {
  id?: string;
  gymId: string;
  memberId: string;
  membershipId?: string | null;
  amountMinorUnits: MinorUnits; // Integer paise
  paymentMethod: string;
  transactionReference?: string | null;
  receiptNumber?: string | null;
  status?: 'COMPLETED' | 'PENDING' | 'REFUNDED';
  notes?: string | null;
  paidAt?: string;
  linkedPaymentId?: string | null;
}

export interface TransactionListItem {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  amount: number; // in Rupees for UI display (amountMinorUnits / 100)
  amountMinorUnits: MinorUnits; // integer paise
  paymentMethod: string;
  type: 'PAYMENT' | 'REFUND';
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED';
  paidAt: string;
  receiptNumber: string | null;
  transactionReference: string | null;
  notes: string | null;
  linkedPaymentId?: string | null;
}

export interface IPaymentRepository {
  recordPayment(input: RecordPaymentInput, executor?: IDatabaseExecutor): Promise<PaymentRecord>;
  recordRefund(originalPaymentId: string, reason?: string, gymId?: string, executor?: IDatabaseExecutor): Promise<PaymentRecord>;
  findById(id: string, gymId?: string): Promise<PaymentRecord | null>;
  listByMember(memberId: string, limit?: number, gymId?: string): Promise<PaymentRecord[]>;
  listRecent(limit?: number, offset?: number, gymId?: string): Promise<PaymentRecord[]>;
  listTransactions(params?: {
    gymId?: string;
    period?: 'today' | 'this_week' | 'this_month' | 'all';
    status?: 'ALL' | 'COMPLETED' | 'REFUNDED';
    limit?: number;
    offset?: number;
  }): Promise<TransactionListItem[]>;
  calculateTotalRevenueMinorUnits(startDate?: string, endDate?: string, gymId?: string): Promise<MinorUnits>;
  upsert(input: RecordPaymentInput, gymId?: string): Promise<PaymentRecord>;
  upsertBatch(inputs: RecordPaymentInput[], gymId?: string): Promise<number>;
}

// ==============================================================================
// 6 & 7. PT Packages & Sessions
// ==============================================================================

export interface CreatePTPackageInput {
  id?: string;
  gymId: string;
  memberId: string;
  trainerId: string;
  packageName: string;
  totalSessions: number;
  usedSessions?: number;
  remainingSessions: number;
  priceMinorUnits: MinorUnits;
  expiryDate: string;
  status?: string;
}

export interface CreatePTSessionInput {
  id?: string;
  packageId: string;
  gymId: string;
  memberId: string;
  trainerId: string;
  sessionDate: string;
  durationMinutes?: number;
  focusArea?: string | null;
  trainerNotes?: string | null;
  status?: string;
}

export interface IPTPackageRepository {
  createPackage(input: CreatePTPackageInput, executor?: IDatabaseExecutor): Promise<PTPackageRecord>;
  findPackageById(id: string, gymId?: string): Promise<PTPackageRecord | null>;
  listPackages(params?: {
    gymId?: string;
    memberId?: string;
    trainerId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PTPackageRecord[]>;
  upsertPackage(input: CreatePTPackageInput, gymId?: string): Promise<PTPackageRecord>;
  upsertPackageBatch(inputs: CreatePTPackageInput[], gymId?: string): Promise<number>;

  createSession(input: CreatePTSessionInput, executor?: IDatabaseExecutor): Promise<PTSessionRecord>;
  findSessionById(id: string, gymId?: string): Promise<PTSessionRecord | null>;
  listSessions(params?: {
    gymId?: string;
    packageId?: string;
    memberId?: string;
    trainerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PTSessionRecord[]>;
  upsertSession(input: CreatePTSessionInput, gymId?: string): Promise<PTSessionRecord>;
  upsertSessionBatch(inputs: CreatePTSessionInput[], gymId?: string): Promise<number>;
}
