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

