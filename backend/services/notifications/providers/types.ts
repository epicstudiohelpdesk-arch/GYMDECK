/**
 * GymDeck Notification Core - External Communication Provider Types & Interfaces
 */

export type ProviderChannel = 'IN_APP' | 'PUSH' | 'WHATSAPP' | 'EMAIL' | 'SMS';

export type ProviderName = 'EXPO_PUSH' | 'META_WHATSAPP' | 'MOCK_PROVIDER';

export type DeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETRYING';

export type ErrorClassification =
  | 'TRANSIENT'
  | 'PERMANENT'
  | 'RATE_LIMITED'
  | 'INVALID_RECIPIENT'
  | 'INVALID_TOKEN'
  | 'INVALID_TEMPLATE'
  | 'AUTHENTICATION_FAILURE'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface DeliveryRequest {
  deliveryId: string;
  notificationId: string;
  gymId: string;
  channel: ProviderChannel;
  recipientType: 'MEMBER' | 'USER';
  recipientId: string;
  title: string;
  body: string;
  category: string;
  type: string;
  payload: Record<string, any> | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  attemptCount: number;
  idempotencyKey: string;
}

export interface DeliveryResult {
  success: boolean;
  provider: ProviderName;
  status: DeliveryStatus;
  providerMessageId?: string;
  errorClassification?: ErrorClassification;
  errorCode?: string;
  errorMessage?: string;
  retryAfterSeconds?: number;
  shouldDeactivateTokens?: string[];
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  readonly name: ProviderName;
  readonly channel: ProviderChannel;

  /**
   * Execute delivery request against external provider gateway
   */
  send(request: DeliveryRequest): Promise<DeliveryResult>;

  /**
   * Verify provider configuration and health
   */
  validateConfiguration(): { valid: boolean; reason?: string };

  /**
   * Classify provider error into standard category
   */
  classifyError(error: any): ErrorClassification;
}
