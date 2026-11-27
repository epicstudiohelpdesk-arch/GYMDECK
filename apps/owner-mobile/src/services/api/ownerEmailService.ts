/**
 * GymDeck Owner Mobile - Email Communication API Service
 * Interacts with /v1/owner/email endpoints on the GymDeck Gateway.
 * Complete parity with desktop frontend/emailApi.js
 */

import { apiClient } from './client';
import { ApiResponse } from '../../types';

export interface EmailQuota {
  allocatedQuota: number;
  consumedCount: number;
  reservedCount: number;
  remainingQuota: number;
  billingPeriod: string;
}

export interface EmailMetrics {
  totalSentThisMonth: number;
  deliveredCount: number;
  bouncedCount: number;
  openedCount?: number;
  clickedCount?: number;
  successRate: number;
}

export interface EmailRelayInfo {
  provider?: string;
  senderEmail?: string;
  senderDisplayName?: string;
  domain?: string;
  spfValid?: boolean;
  dkimValid?: boolean;
  status?: string;
}

export interface EmailRecentMessage {
  id: string;
  subject: string;
  senderDisplayName?: string;
  fromAddress?: string;
  replyToAddress?: string;
  recipientCount: number;
  status: 'PENDING' | 'SENDING' | 'COMPLETED' | 'FAILED' | string;
  createdAt: string;
}

export interface EmailOverview {
  quota: EmailQuota;
  metrics: EmailMetrics;
  relayInfo: EmailRelayInfo;
  recentMessages: EmailRecentMessage[];
}

export interface EmailRecipient {
  id: string;
  memberCode?: string;
  fullName: string;
  email: string;
  phone?: string;
  membershipStatus?: 'ACTIVE' | 'EXPIRED' | 'TRIAL' | string;
  planName?: string;
  expiresAt?: string;
  profilePhotoUrl?: string | null;
  gender?: string | null;
}

export interface EmailRecipientsResponse {
  members: EmailRecipient[];
  totalCount: number;
}

export interface ComposeEmailDto {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  senderDisplayName?: string;
  replyToAddress?: string;
  recipients: Array<{
    memberId?: string;
    email: string;
    name?: string;
  }>;
  idempotencyKey?: string;
}

export interface EmailDraft {
  id: string;
  subject: string;
  bodyHtml: string;
  senderDisplayName?: string;
  replyToAddress?: string;
  recipients?: Array<{
    memberId?: string;
    email?: string;
    name?: string;
  }>;
  createdAt?: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id?: string;
  title: string;
  subject: string;
  body: string;
  tag?: string;
}

export interface EmailRecipientDetail {
  id: string;
  memberId?: string;
  recipientEmail: string;
  recipientName?: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' | string;
  sentAt?: string;
  deliveredAt?: string;
  bouncedAt?: string;
  bounceReason?: string;
}

export interface EmailMessageDetails {
  message: {
    id: string;
    subject: string;
    bodyHtml: string;
    senderDisplayName?: string;
    fromAddress: string;
    replyToAddress?: string;
    recipientCount: number;
    deliveredCount: number;
    bouncedCount: number;
    status: string;
    createdAt: string;
  };
  recipients: EmailRecipientDetail[];
}

export interface EmailHistoryResponse {
  messages: EmailRecentMessage[];
  totalCount: number;
}

export const ownerEmailService = {
  /**
   * Get quota, metrics, relay status, and recent transmissions
   */
  async getOverview(): Promise<EmailOverview> {
    const res = await apiClient.get<ApiResponse<EmailOverview>>('/owner/email/overview');
    return res.data.data;
  },

  /**
   * Get filtered recipients from gym members directory
   */
  async getRecipients(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<EmailRecipientsResponse> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const qs = query.toString();
    const url = `/owner/email/recipients${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<ApiResponse<EmailRecipientsResponse>>(url);
    return res.data.data;
  },

  /**
   * Send / queue broadcast email
   */
  async sendEmail(payload: ComposeEmailDto): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/owner/email/send', payload);
    return res.data.data;
  },

  /**
   * Get saved drafts
   */
  async getDrafts(): Promise<EmailDraft[]> {
    const res = await apiClient.get<ApiResponse<EmailDraft[]>>('/owner/email/drafts');
    return res.data.data || [];
  },

  /**
   * Save or update draft
   */
  async saveDraft(payload: Partial<EmailDraft>): Promise<EmailDraft> {
    const res = await apiClient.post<ApiResponse<EmailDraft>>('/owner/email/drafts', payload);
    return res.data.data;
  },

  /**
   * Delete draft by ID
   */
  async deleteDraft(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<ApiResponse<{ success: boolean }>>(
      `/owner/email/drafts/${encodeURIComponent(id)}`
    );
    return res.data.data;
  },

  /**
   * Get transmission history log
   */
  async getHistory(params?: { limit?: number; offset?: number; search?: string }): Promise<EmailHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));
    if (params?.search) query.append('search', params.search);

    const qs = query.toString();
    const url = `/owner/email/history${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<ApiResponse<EmailHistoryResponse>>(url);
    return res.data.data || { messages: [], totalCount: 0 };
  },

  /**
   * Inspect individual message delivery breakdown
   */
  async getMessageDetails(id: string): Promise<EmailMessageDetails> {
    const res = await apiClient.get<ApiResponse<EmailMessageDetails>>(
      `/owner/email/messages/${encodeURIComponent(id)}`
    );
    return res.data.data;
  },

  /**
   * Get email templates
   */
  async getTemplates(): Promise<EmailTemplate[]> {
    const res = await apiClient.get<ApiResponse<EmailTemplate[]>>('/owner/email/templates');
    return res.data.data || [];
  },

  /**
   * Create template
   */
  async createTemplate(payload: EmailTemplate): Promise<EmailTemplate> {
    const res = await apiClient.post<ApiResponse<EmailTemplate>>('/owner/email/templates', payload);
    return res.data.data;
  },
};
