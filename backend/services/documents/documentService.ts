/**
 * GymDeck Cloud Backend - Private Document Vault Service
 */

import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../shared/database';
import { memberDocuments, auditLogs } from '../../shared/database/schema';
import { getStorageProvider, IObjectStorageProvider } from './storageProvider';
import { AppError } from '../../shared/errors';

export interface DocumentItemResponse {
  id: string;
  documentType: 'LIABILITY_WAIVER' | 'MEMBERSHIP_AGREEMENT' | 'TAX_INVOICE' | 'MEDICAL_CLEARANCE';
  displayName: string;
  fileSizeBytes: number;
  mimeType: string;
  createdAt: string;
}

export interface SecureDocumentUrlResponse {
  documentId: string;
  displayName: string;
  downloadUrl: string;
  expiresInSeconds: number;
  expiresAt: string;
}

export class DocumentService {
  private readonly storageProvider: IObjectStorageProvider;

  constructor(provider?: IObjectStorageProvider) {
    this.storageProvider = provider || getStorageProvider();
  }

  /**
   * 1. Get all documents for the authenticated member with tenant isolation
   */
  public async getMemberDocuments(gymId: string, memberId: string): Promise<DocumentItemResponse[]> {
    const docs = await db
      .select()
      .from(memberDocuments)
      .where(and(eq(memberDocuments.gymId, gymId), eq(memberDocuments.memberId, memberId)))
      .orderBy(desc(memberDocuments.createdAt));

    return docs.map((d) => ({
      id: d.id,
      documentType: d.documentType as any,
      displayName: d.displayName,
      fileSizeBytes: d.fileSizeBytes ?? 0,
      mimeType: d.mimeType,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  /**
   * 2. Generate a short-lived (10-min) signed download URL
   */
  public async getDocumentSecureUrl(
    gymId: string,
    memberId: string,
    documentId: string
  ): Promise<SecureDocumentUrlResponse> {
    const docs = await db
      .select()
      .from(memberDocuments)
      .where(
        and(
          eq(memberDocuments.id, documentId),
          eq(memberDocuments.gymId, gymId),
          eq(memberDocuments.memberId, memberId)
        )
      )
      .limit(1);

    if (docs.length === 0) {
      throw AppError.notFound('Document not found or access unauthorized.');
    }

    const doc = docs[0]!;
    const expiresInSeconds = 600; // 10 minutes
    const downloadUrl = await this.storageProvider.createSignedDownloadUrl(doc.objectKey, expiresInSeconds);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // Audit log document access
    await db.insert(auditLogs).values({
      gymId,
      memberId,
      actorType: 'MEMBER',
      action: 'DOCUMENT_ACCESSED',
      resource: 'member_documents',
      resourceId: doc.id,
    });

    return {
      documentId: doc.id,
      displayName: doc.displayName,
      downloadUrl,
      expiresInSeconds,
      expiresAt,
    };
  }
}

export const documentService = new DocumentService();
export default documentService;
