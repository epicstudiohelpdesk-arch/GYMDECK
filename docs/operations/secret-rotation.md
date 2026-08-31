# GymDeck Secrets & Cryptographic Key Rotation Protocol

## 1. Secrets Inventory & Classification

| Secret Key | Storage Layer | Rotation Cadence | Zero-Client Impact? |
| :--- | :--- | :--- | :---: |
| **`JWT_SECRET`** | Server Environment / Secret Vault | Every 90 Days / On Suspected Breach | ✅ Yes (Mobile auto-refreshes) |
| **`RESEND_API_KEY`** | Server Environment / Secret Vault | Every 180 Days | ✅ Yes (Server-side only) |
| **`DATABASE_URL`** (Password) | Server Environment / Secret Vault | Every 90 Days | ✅ Yes (Internal connection) |
| **`STORAGE_SECRET_KEY`** | Server Environment / Secret Vault | Every 180 Days | ✅ Yes (Signed URLs only) |

---

## 2. Step-by-Step Rotation Procedures

### A. Rotating JWT Signing Key
1. Generate new 256-bit cryptographically secure key:
   ```bash
   openssl rand -hex 32
   ```
2. Update deployment environment variable `JWT_SECRET`.
3. Restart backend service containers with zero-downtime rolling restart.
4. Active mobile sessions will encounter `401 Unauthorized` and automatically trigger single-flight token refresh or prompt re-login.

### B. Rotating Resend API Key
1. Navigate to **Resend Dashboard** $\rightarrow$ **API Keys** $\rightarrow$ **Create API Key** with name `gymdeck-prod-YYYY-MM`.
2. Update `RESEND_API_KEY` in server secret manager.
3. Verify test email dispatch via `/v1/auth/resend-verification`.
4. Delete previous API key in Resend dashboard.

### C. Rotating PostgreSQL Database Password
1. Connect as database superuser:
   ```sql
   ALTER USER gymdeck_prod_user WITH PASSWORD 'NEW_STRONG_CSPRNG_PASSWORD';
   ```
2. Update `DATABASE_URL` in server secret manager.
3. Restart backend application pool.
4. Validate `GET /ready` returns 200 OK.
