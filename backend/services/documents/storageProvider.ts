/**
 * GymDeck Cloud Backend - Private Object Storage Provider Abstraction (S3 / Cloudflare R2)
 */

import * as crypto from 'crypto';

export interface IObjectStorageProvider {
  createSignedDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
  createSignedUploadUrl(objectKey: string, contentType: string, expiresInSeconds?: number): Promise<string>;
}

export class DevStorageProvider implements IObjectStorageProvider {
  public async createSignedDownloadUrl(objectKey: string, expiresInSeconds: number = 600): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = crypto.randomBytes(16).toString('hex');
    return `https://vault.gymdeck.cloud/objects/${encodeURIComponent(objectKey)}?expires=${expiresAt}&sig=${signature}`;
  }

  public async createSignedUploadUrl(objectKey: string, contentType: string, expiresInSeconds: number = 300): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = crypto.randomBytes(16).toString('hex');
    return `https://vault.gymdeck.cloud/upload/${encodeURIComponent(objectKey)}?expires=${expiresAt}&sig=${signature}`;
  }
}

export class S3ObjectStorageProvider implements IObjectStorageProvider {
  private readonly endpoint: string;
  private readonly bucket: string;

  constructor(endpoint?: string, bucket?: string) {
    this.endpoint = endpoint || process.env.STORAGE_ENDPOINT || 'https://vault.r2.cloudflarestorage.com';
    this.bucket = bucket || process.env.STORAGE_BUCKET || 'gymdeck-private-vault';
  }

  public async createSignedDownloadUrl(objectKey: string, expiresInSeconds: number = 600): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = crypto.createHmac('sha256', process.env.STORAGE_SECRET_KEY || 'dev_secret')
      .update(`${this.bucket}/${objectKey}/${expiresAt}`)
      .digest('hex');

    return `${this.endpoint}/${this.bucket}/${encodeURIComponent(objectKey)}?X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=${token}`;
  }

  public async createSignedUploadUrl(objectKey: string, contentType: string, expiresInSeconds: number = 300): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = crypto.createHmac('sha256', process.env.STORAGE_SECRET_KEY || 'dev_secret')
      .update(`${this.bucket}/${objectKey}/${contentType}/${expiresAt}`)
      .digest('hex');

    return `${this.endpoint}/${this.bucket}/${encodeURIComponent(objectKey)}?X-Amz-Expires=${expiresInSeconds}&X-Amz-Signature=${token}`;
  }
}

// Storage provider factory
export function getStorageProvider(): IObjectStorageProvider {
  if (process.env.NODE_ENV === 'production' && process.env.STORAGE_ACCESS_KEY) {
    return new S3ObjectStorageProvider();
  }
  return new DevStorageProvider();
}
