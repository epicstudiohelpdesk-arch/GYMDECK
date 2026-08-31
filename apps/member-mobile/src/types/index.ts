/**
 * GymDeck Member Mobile - Core Domain Models & Types
 */

export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface UserProfile {
  id: string;
  gymId: string;
  fullName: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl?: string;
  role: 'MEMBER';
  createdAt: string;
  updatedAt: string;
}

export interface GymTenant {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  supportPhone?: string;
}

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE' | 'PENDING';

export interface MemberMembership {
  id: string;
  planId: string;
  planName: string;
  status: MembershipStatus;
  startDate: string;
  expiresAt: string;
  daysRemaining: number;
  isExpiringSoon: boolean;
  price: number;
  features: string[];
  freezeDetails?: {
    isFrozen: boolean;
    freezeStartDate?: string;
    freezeEndDate?: string;
    reason?: string;
  };
}

export interface AttendanceRecord {
  id: string;
  checkInTime: string;
  checkOutTime?: string;
  method: 'QR' | 'BIOMETRIC' | 'MANUAL' | 'RFID';
  location?: string;
}

export interface AttendanceSummary {
  totalCheckinsThisMonth: number;
  currentStreak: number;
  lastCheckin?: string;
  history: AttendanceRecord[];
}

export interface ExerciseItem {
  id: string;
  name: string;
  targetMuscle: string;
  sets: number;
  reps: string;
  weightRecommendation?: string;
  thumbnailUrl?: string;
  notes?: string;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  dayOfWeek?: string;
  muscleGroups: string[];
  exerciseCount: number;
  estimatedMinutes: number;
  exercises: ExerciseItem[];
  assignedByTrainerName?: string;
}

export interface LoggedSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  isCompleted: boolean;
  completedAt?: string;
}

export type WorkoutSessionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineTitle: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  status: WorkoutSessionStatus;
  loggedExercises: {
    exerciseId: string;
    exerciseName: string;
    targetMuscle: string;
    sets: LoggedSet[];
    notes?: string;
  }[];
}

export interface WorkoutHistoryItem {
  id: string;
  routineTitle: string;
  date: string;
  durationMinutes: number;
  totalSetsCompleted: number;
  totalVolumeKg: number;
  status: 'COMPLETED';
}

export interface TrainerProfile {
  id: string;
  name: string;
  specialization: string;
  experienceYears: number;
  avatarUrl?: string;
  bio?: string;
  certifications: string[];
}

export interface PTPackage {
  id: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  startDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
  trainerName: string;
}

export interface PTSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  trainerName: string;
  focusArea: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  durationMinutes: number;
  notes?: string;
}

export type DocumentType = 'AGREEMENT' | 'INVOICE' | 'RECEIPT' | 'CERTIFICATE' | 'ID_PROOF';
export type DocumentStatus = 'VERIFIED' | 'PENDING' | 'EXPIRED';

export interface MemberDocument {
  id: string;
  title: string;
  documentType: DocumentType;
  fileSizeText: string;
  createdAt: string;
  status: DocumentStatus;
  downloadUrl?: string;
}

export type NotificationCategory =
  | 'MEMBERSHIP'
  | 'PAYMENT'
  | 'WORKOUT'
  | 'TRAINER'
  | 'ATTENDANCE'
  | 'GYM_ANNOUNCEMENT'
  | 'SYSTEM';

export interface MemberNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  createdAt: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
  bmi?: number;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  chestCm?: number;
  waistCm?: number;
  armsCm?: number;
  thighsCm?: number;
  hipsCm?: number;
}

export interface FitnessMilestone {
  id: string;
  title: string;
  description: string;
  achievedDate: string;
  category: 'STREAK' | 'VOLUME' | 'WEIGHT' | 'ATTENDANCE';
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: 'UPI' | 'CARD' | 'CASH' | 'NET_BANKING';
  transactionReference: string;
  paymentDate: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  invoicePdfUrl?: string;
  description: string;
}

export interface OutstandingDues {
  hasDues: boolean;
  amount: number;
  currency: string;
  dueDate?: string;
}

export interface MemberDashboardData {
  member: UserProfile;
  gym: GymTenant;
  membership: MemberMembership;
  attendanceSummary: AttendanceSummary;
  todayWorkout?: WorkoutRoutine;
  outstandingDues: OutstandingDues;
  unreadNotificationCount: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface SessionState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  tokens: AuthTokens | null;
  user: UserProfile | null;
  activeGymId: string | null;
}
