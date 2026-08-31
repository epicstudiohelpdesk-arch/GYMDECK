# GymDeck Private Document Vault Architecture

## 1. Overview
The Document Vault stores member agreements, liability waivers, tax invoices, and medical clearance certificates in private object storage (AWS S3 or Cloudflare R2).

```mermaid
graph LR
    Member["📱 Member Mobile"]
    Backend["🔒 Backend DocumentService"]
    S3["📦 Private S3/R2 Bucket"]

    Member -->|1. GET /v1/member/documents/:id/secure-url| Backend
    Backend -->|2. Verify Member & Gym Ownership| Backend
    Backend -->|3. Sign 10-Minute URL with Server Secret| Backend
    Backend -->|4. Return Short-Lived Signed URL| Member
    Member -->|5. Direct Download| S3
```

---

## 2. Security & Zero-Leakage Policy
1. **Private Bucket**: Buckets allow zero public read access.
2. **Short-Lived Signed URLs**: Download URLs expire in **600 seconds (10 minutes)**.
3. **No Credential Exposure**: Storage access keys and bucket secrets are never sent to mobile or web clients.
4. **Audit Logging**: Every document URL generation event is recorded in `audit_logs` without logging the signed URL itself.
