/**
 * GymDeck Member Mobile - API Types & Contracts
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    validationErrors?: Record<string, string[]>;
    timestamp: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface GymPaymentConfig {
  receivingMode: string;
  bankName: string;
  accountHolder: string;
  accountNumberMasked: string;
  ifscCode: string;
  branch: string;
  upiVpa: string;
  phoneNumber?: string;
}

export interface MemberDuesSummary {
  totalDuesMinor: number;
  openInvoicesCount: number;
  overdueCount: number;
  currency: string;
  oldestDueDate: string | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    totalMinor: number;
    paidMinor: number;
    balanceMinor: number;
    status: string;
    dueDate: string | null;
    lineItems?: Array<{ description: string; amountMinor: number }>;
  }>;
}

export interface PaymentAttemptResponse {
  attempt: {
    id: string;
    invoiceId: string;
    status: string;
    currency: string;
    amountMinor: number;
    provider: string;
    expiresAt: string;
  };
  upi?: {
    uri: string;
    vpa: string;
    merchantName: string;
    amountMinor: number;
    reference: string;
  };
  bankAccount?: {
    beneficiaryName: string;
    bankName: string;
    accountType?: string;
    accountNumberMasked?: string;
    ifscCode?: string;
    branchName?: string;
  };
}

export interface PaymentSubmissionResult {
  submission: {
    id: string;
    attemptId: string;
    utr: string;
    claimedAmountMinor: number;
    status: string;
  };
  attempt: {
    id: string;
    status: string;
  };
}

