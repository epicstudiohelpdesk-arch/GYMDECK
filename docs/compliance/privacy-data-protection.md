# GymDeck Data Privacy & PII Protection Policy

## 1. Member Data Inventory & Classification

| Data Category | Specific Attributes | Processing Purpose | Retention Schedule |
| :--- | :--- | :--- | :--- |
| **Account Identity** | Full Name, Email, Phone (optional) | Authentication, account recovery, check-in verification | Duration of active membership $+ 2$ years |
| **Financial / Billing** | Plan ID, Invoices, Payment Receipts | Tax compliance, membership verification | 7 Years (Statutory tax requirement) |
| **Attendance Logs** | Check-in timestamp, method (`QR`), location | Facility security, capacity management | 2 Years |
| **Fitness & Health Data** | Body weight (kg), circumference (cm), workout volume | Personal progress tracking, trainer analytics | Retained until member account deletion request |
| **Document Vault** | Liability waivers, membership agreements | Legal compliance and facility liability | 7 Years |

---

## 2. Security & Access Control Safeguards
* **Zero Credential Exposure**: Passwords hashed with Scrypt; OTPs and Refresh Tokens stored strictly as SHA-256 hashes.
* **Tenant Isolation**: Multi-tenant database queries enforce compound filtering (`gym_id + member_id`).
* **Short-Lived Document Access**: Documents are never publicly accessible; signed download URLs expire after 10 minutes.
* **Right to Erasure (GDPR / CCPA)**:
  * Member account deletion triggers a soft-delete and PII anonymization in `member_accounts` and `gym_members`.
  * Tax invoices and signed liability waivers are archived in cold storage in compliance with statutory liability periods.
