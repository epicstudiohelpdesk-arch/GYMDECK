/**
 * GymDeck Cloud Backend - Shared Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: {
    requestId?: string;
    timestamp: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    domain: string;
    message: string;
    statusCode: number;
    details?: unknown;
    requestId?: string;
    timestamp: string;
  };
}

export interface AuthenticatedUserPayload {
  memberAccountId: string;
  memberId: string;
  gymId: string;
  email: string;
  role: 'MEMBER';
  jti: string;
}
