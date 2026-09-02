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
}

export interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime?: string | null;
  entryMethod: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}
