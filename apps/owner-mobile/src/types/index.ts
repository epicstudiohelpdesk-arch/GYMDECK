/**
 * GymDeck Owner Mobile - Domain Types & API Contracts
 */

export type OwnerRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ADMIN' | 'RECEPTIONIST' | 'TRAINER';

export interface OwnerUser {
  id: string;
  gymId: string;
  gymName: string;
  gymCode: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: OwnerRole;
  permissions: string[];
  accountStatus: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OwnerAuthResponse {
  user: OwnerUser;
  tokens: AuthTokens;
}

export interface DashboardMetrics {
  activeMembersCount: number;
  todayAttendanceCount: number;
  activePlansCount: number;
  todayRevenue: number;
  activeTrainersCount: number;
}

export interface OwnerDashboardData {
  gym: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  metrics: DashboardMetrics;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsOverviewData {
  period: {
    from: string;
    to: string;
    preset: string;
    timezone: string;
    daysCount: number;
  };
  generatedAt: string;
  gym: {
    id: string;
    name: string;
    code: string;
  };
  metrics: {
    members: {
      total: number;
      active: number;
      frozen: number;
      expired: number;
      newInPeriod: number;
    };
    financial: {
      grossPaid: number;
      refunds: number;
      netPaid: number;
      transactionCount: number;
      averageTransaction: number;
    };
    attendance: {
      totalCheckins: number;
      uniqueAttendees: number;
      dailyAverage: number;
      todayCheckins: number;
    };
    memberships: {
      activeSubscriptions: number;
      expiringSoon: number;
      renewalsInPeriod: number;
    };
    trainers: {
      activeTrainers: number;
      activePtPackages: number;
      completedSessions: number;
      accruedEarnings: number;
    };
  };
  trends: {
    revenue: TrendDataPoint[];
    attendance: TrendDataPoint[];
    memberRegistrations: TrendDataPoint[];
  };
}

export interface GymMemberSummary {
  id: string;
  memberCode: string;
  fullName: string;
  phone: string;
  alternatePhone?: string | null;
  email: string | null;
  gender?: string | null;
  dob?: string | null;
  address?: string | null;
  membershipStatus: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE';
  joinedAt: string;
  expiresAt: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface MembershipPlanSummary {
  id: string;
  planName: string;
  durationDays: number;
  price: string;
  description?: string | null;
  benefits?: string | null;
  isActive: boolean;
}

export interface MemberActiveMembership {
  id: string;
  planId: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  price: string;
  priceAtPurchase?: string;
  durationDays: number;
  daysRemaining?: number;
  frozenAt?: string | null;
  freezeReason?: string | null;
  frozenDaysRemaining?: number | null;
  unfrozenAt?: string | null;
}

export interface MembershipLifecycleItem {
  id: string;
  gymId: string;
  memberId: string;
  planId: string;
  planName: string;
  price?: string;
  durationDays?: number;
  status: string;
  startDate: string;
  endDate: string;
  priceAtPurchase: string;
  daysRemaining: number;
  isExpiringSoon: boolean;
  frozenAt: string | null;
  freezeReason: string | null;
  frozenDaysRemaining: number | null;
  unfrozenAt: string | null;
  createdAt: string;
}

export interface ExpiringMembershipItem {
  membershipId: string;
  memberId: string;
  memberCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  planName: string;
  endDate: string;
  daysRemaining: number;
}

export interface MembershipLifecycleStats {
  activeCount: number;
  frozenCount: number;
  expiredCount: number;
  expiringIn7DaysCount: number;
  expiringIn30DaysCount: number;
}

export interface FreezeMembershipInput {
  reason: string;
}

export interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime?: string | null;
  entryMethod: string;
}

export interface AttendanceItem {
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

export interface DailyAttendanceResponse {
  items: AttendanceItem[];
  totalCount: number;
  uniqueMembersCount: number;
  date: string;
}

export interface AttendanceStatsResponse {
  todayCheckIns: number;
  todayUniqueMembers: number;
  weekCheckIns: number;
  monthCheckIns: number;
}

export interface CheckInInput {
  memberId?: string;
  memberCode?: string;
  entryMethod?: 'CODE_LOOKUP' | 'QR_DYNAMIC' | 'MANUAL' | 'RFID' | 'BIOMETRIC';
  deviceMetadata?: string;
  idempotencyKey?: string;
}

export interface ManualAttendanceInput {
  memberId?: string;
  memberCode?: string;
  checkInTime: string;
  checkOutTime?: string;
  notes: string;
}

export interface PaymentRecord {
  id: string;
  membershipId?: string | null;
  amount: string;
  paymentMethod: string;
  transactionReference?: string | null;
  receiptNumber?: string | null;
  type?: string;
  status: string;
  notes?: string | null;
  paidAt: string;
}

export interface TrainerSummary {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  specialization?: string | null;
  experienceYears?: number;
  certifications?: string[];
  bio?: string | null;
  photoUrl?: string | null;
  rating?: string;
  commissionType: string;
  commissionRate: string;
  isActive: boolean;
  activeClientsCount?: number;
  activePackagesCount?: number;
}

export interface TrainerAssignmentItem {
  id: string;
  trainerId: string;
  trainerName: string;
  trainerPhone: string;
  specialization?: string | null;
  status: string;
  assignedAt: string;
  endedAt?: string | null;
  notes?: string | null;
}

export interface PTPackageSummary {
  id: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  price: string;
  startDate: string;
  expiryDate: string;
  status: string;
  notes?: string | null;
  trainerId: string;
  trainerName: string;
  trainerPhone: string;
  specialization?: string | null;
}

export interface PTSessionSummary {
  id: string;
  packageId: string;
  sessionDate: string;
  durationMinutes: number;
  focusArea: string;
  trainerNotes?: string | null;
  status: string;
  trainerName?: string;
}

export interface TrainerAssignment {
  packageId: string;
  packageName: string;
  remainingSessions: number;
  totalSessions: number;
  trainerId: string;
  trainerName: string;
  trainerPhone: string;
  specialization?: string | null;
}

export interface MemberProfileData {
  member: GymMemberSummary;
  membership: MemberActiveMembership | null;
  attendanceSummary: {
    totalCheckIns: number;
    recentCheckIns: AttendanceRecord[];
  };
  paymentSummary: {
    totalPaid: number;
    recentPayments: PaymentRecord[];
  };
  trainer: TrainerAssignment | null;
  invite: {
    displayCode: string;
    expiresAt: string;
    consumedAt?: string | null;
  } | null;
}

export interface CreateTrainerInput {
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

export interface AssignTrainerInput {
  trainerId: string;
  notes?: string;
}

export interface PurchasePTPackageInput {
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

export interface CreateMemberInput {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  memberCode?: string;
  notes?: string;
  planId?: string;
  initialPaymentAmount?: number;
  initialPaymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';
}

export interface UpdateMemberInput {
  fullName?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE';
  notes?: string;
}

export interface MemberInvitationResult {
  activationTicket: string;
  displayCode: string;
  memberId: string;
  gymId: string;
  expiresAt: string;
}

export interface PurchaseMembershipInput {
  planId: string;
  startDate?: string;
  paymentAmount?: number;
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  transactionReference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface RecordPaymentInput {
  membershipId?: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  transactionReference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface MemberBillingSummary {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  activeMembership: MemberActiveMembership | null;
  recentPayments: PaymentRecord[];
}

export interface ReceiptData {
  receiptNumber: string;
  issuedAt: string;
  gym: {
    name: string;
    code: string;
  };
  member: {
    id: string;
    fullName: string;
    memberCode: string;
    phone: string;
    email: string | null;
  };
  membership: {
    planName: string;
    durationDays: number;
    startDate: string;
    endDate: string;
  } | null;
  payment: {
    id: string;
    amount: string;
    paymentMethod: string;
    transactionReference: string | null;
    status: string;
    type: string;
    paidAt: string;
  };
  notes: string | null;
}

export interface NotificationItem {
  id: string;
  gymId: string;
  recipientType: 'MEMBER' | 'USER' | 'STAFF' | 'OWNER';
  recipientId: string;
  type: string;
  category: 'ALL' | 'MEMBERSHIP' | 'BILLING' | 'ATTENDANCE' | 'TRAINING' | 'ANNOUNCEMENT' | 'SECURITY' | 'SYSTEM';
  title: string;
  body: string;
  payload?: Record<string, any> | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPageResponse {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  totalPages: number;
}

export interface NotificationPreferenceItem {
  category: string;
  channel: string;
  isEnabled: boolean;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
