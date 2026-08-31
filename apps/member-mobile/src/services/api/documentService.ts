/**
 * GymDeck Member Mobile - Document Vault API Service
 */

import { apiClient, normalizeAxiosError } from './client';
import { ApiResponse } from './types';
import { MemberDocument } from '../../types';
import { Logger } from '../../observability';

const DEV_DOCUMENTS_FIXTURES: MemberDocument[] = [
  {
    id: 'doc_agmt_2026',
    title: 'Membership & Facility Liability Waiver',
    documentType: 'AGREEMENT',
    fileSizeText: '245 KB (PDF)',
    createdAt: '2026-01-15T08:00:00Z',
    status: 'VERIFIED',
    downloadUrl: 'https://docs.gymdeck.com/sample/agreement.pdf',
  },
  {
    id: 'doc_inv_annual',
    title: 'Tax Invoice - 12-Month Elite Plan',
    documentType: 'INVOICE',
    fileSizeText: '112 KB (PDF)',
    createdAt: '2026-01-15T08:05:00Z',
    status: 'VERIFIED',
    downloadUrl: 'https://docs.gymdeck.com/sample/invoice-899.pdf',
  },
  {
    id: 'doc_rcpt_pt',
    title: 'Official Receipt - 20 PT Sessions Package',
    documentType: 'RECEIPT',
    fileSizeText: '98 KB (PDF)',
    createdAt: '2026-06-01T10:15:00Z',
    status: 'VERIFIED',
    downloadUrl: 'https://docs.gymdeck.com/sample/receipt-pt.pdf',
  },
];

class DocumentService {
  /**
   * Fetch all authorized member documents.
   */
  public async getDocuments(): Promise<MemberDocument[]> {
    try {
      Logger.info('[DocumentService] Fetching member documents...');
      const response = await apiClient.get<ApiResponse<any>>('/member/documents');
      const data = response.data.data;
      if (Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.displayName || d.title || 'Document',
          documentType: d.documentType || 'AGREEMENT',
          fileSizeText: d.fileSizeBytes ? `${Math.round(d.fileSizeBytes / 1024)} KB (PDF)` : '250 KB (PDF)',
          createdAt: d.createdAt,
          status: 'VERIFIED',
          downloadUrl: d.downloadUrl || '',
        }));
      }
      return [];
    } catch (err) {
      if (__DEV__) {
        return DEV_DOCUMENTS_FIXTURES;
      }
      throw normalizeAxiosError(err);
    }
  }

  /**
   * Request a secure, short-lived signed URL for viewing a document.
   */
  public async getDocumentSecureUrl(documentId: string): Promise<{ signedUrl: string }> {
    try {
      Logger.info('[DocumentService] Requesting short-lived signed URL for document...', { documentId });
      const response = await apiClient.get<ApiResponse<any>>(
        `/member/documents/${documentId}/secure-url`
      );
      const data = response.data.data;
      return {
        signedUrl: data?.signedUrl || data?.downloadUrl || '',
      };
    } catch (err) {
      if (__DEV__) {
        return { signedUrl: `https://vault.gymdeck.cloud/secure-view/${documentId}?expires=${Date.now() + 600000}` };
      }
      throw normalizeAxiosError(err);
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
