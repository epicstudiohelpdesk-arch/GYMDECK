/**
 * GymDeck Owner Mobile - WhatsApp Communication Hub API Service
 * Interacts with /v1/owner/whatsapp endpoints on the GymDeck Gateway.
 * Complete parity with desktop frontend/whatsappApi.js
 */

import { apiClient } from './client';
import { ApiResponse } from '../../types';

export interface WhatsAppConnectionState {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'FAILED' | 'UNKNOWN';
  phoneNumber?: string;
  pushname?: string;
  platform?: string;
  battery?: number;
  plugged?: boolean;
  qrCode?: string;
  lastConnectedAt?: string;
  error?: string;
}

export interface WhatsAppTemplate {
  id: string;
  intent: string;
  title: string;
  body: string;
  isUsable: boolean;
}

export interface WhatsAppOverview {
  connection: WhatsAppConnectionState;
  stats?: {
    totalSent?: number;
    delivered?: number;
    read?: number;
    failed?: number;
    queued?: number;
  };
  consentCount?: number;
  totalMembers?: number;
}

export interface WhatsAppAudienceMember {
  id: string;
  fullName: string;
  phone: string;
  memberCode?: string;
  membershipStatus?: string;
  planName?: string;
  expiresAt?: string;
  trainerName?: string;
  whatsappConsent?: boolean;
  photoUrl?: string | null;
  gender?: string | null;
}

export interface WhatsAppMessageJob {
  id: string;
  title?: string;
  body: string;
  intent?: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount?: number;
  createdAt: string;
}

export interface WhatsAppAutomationRule {
  id: string;
  triggerEvent: string;
  title: string;
  description: string;
  enabled: boolean;
  templateId?: string;
  delayMinutes?: number;
}

export const ownerWhatsAppService = {
  getConnection: async (): Promise<WhatsAppConnectionState> => {
    const res = await apiClient.get<ApiResponse<WhatsAppConnectionState>>('/owner/whatsapp/connection');
    return (res.data as any).data || (res.data as any);
  },

  getPrerequisites: async (): Promise<any> => {
    const res = await apiClient.get<ApiResponse<any>>('/owner/whatsapp/prerequisites');
    return (res.data as any).data || (res.data as any);
  },

  connect: async (): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/owner/whatsapp/connection/connect', {});
    return (res.data as any).data || (res.data as any);
  },

  verifyConnection: async (): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/owner/whatsapp/connection/verify', {});
    return (res.data as any).data || (res.data as any);
  },

  disconnect: async (): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/owner/whatsapp/connection/disconnect', {});
    return (res.data as any).data || (res.data as any);
  },

  getOverview: async (): Promise<WhatsAppOverview> => {
    const res = await apiClient.get<ApiResponse<WhatsAppOverview>>('/owner/whatsapp/overview');
    return (res.data as any).data || (res.data as any);
  },

  getTemplates: async (): Promise<WhatsAppTemplate[]> => {
    const res = await apiClient.get<ApiResponse<WhatsAppTemplate[]>>('/owner/whatsapp/templates');
    return (res.data as any).data || (res.data as any) || [];
  },

  getAudience: async (params?: { mode?: string; status?: string; limit?: number; search?: string }): Promise<{ members: WhatsAppAudienceMember[]; total: number }> => {
    const res = await apiClient.get<ApiResponse<any>>('/owner/whatsapp/audience', { params });
    const d = (res.data as any).data || (res.data as any);
    return {
      members: d?.members || [],
      total: d?.total || 0,
    };
  },

  preview: async (payload: { templateId?: string; intent: string; body: string; memberId?: string }): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/owner/whatsapp/messages/preview', payload);
    return (res.data as any).data || (res.data as any);
  },

  send: async (payload: {
    templateId?: string;
    intent: string;
    body: string;
    memberIds: string[];
    title?: string;
  }): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/owner/whatsapp/messages/send', payload);
    return (res.data as any).data || (res.data as any);
  },

  getMessages: async (params?: { limit?: number; offset?: number; status?: string }): Promise<{ items: WhatsAppMessageJob[]; total: number }> => {
    const res = await apiClient.get<ApiResponse<any>>('/owner/whatsapp/messages', { params });
    const d = (res.data as any).data || (res.data as any);
    return {
      items: d?.items || d?.messages || [],
      total: d?.total || 0,
    };
  },

  cancelMessage: async (id: string): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>(`/owner/whatsapp/messages/${id}/cancel`, {});
    return (res.data as any).data || (res.data as any);
  },

  deleteMessage: async (id: string): Promise<any> => {
    const res = await apiClient.delete<ApiResponse<any>>(`/owner/whatsapp/messages/${id}`);
    return (res.data as any).data || (res.data as any);
  },

  getConsents: async (search?: string): Promise<any> => {
    const res = await apiClient.get<ApiResponse<any>>('/owner/whatsapp/consents', { params: { search } });
    return (res.data as any).data || (res.data as any);
  },

  setConsent: async (memberId: string, status: string, source: string): Promise<any> => {
    const res = await apiClient.put<ApiResponse<any>>(`/owner/whatsapp/consents/${memberId}`, { status, source });
    return (res.data as any).data || (res.data as any);
  },

  getAutomation: async (): Promise<{ rules: WhatsAppAutomationRule[] }> => {
    const res = await apiClient.get<ApiResponse<any>>('/owner/whatsapp/automation');
    const d = (res.data as any).data || (res.data as any);
    return { rules: d?.rules || [] };
  },

  saveAutomation: async (rules: WhatsAppAutomationRule[]): Promise<any> => {
    const res = await apiClient.put<ApiResponse<any>>('/owner/whatsapp/automation', { rules });
    return (res.data as any).data || (res.data as any);
  },
};
