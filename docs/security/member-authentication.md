# GymDeck Member Authentication Threat Model & Security Architecture

## 1. Threat Analysis & Countermeasures

| Threat Vector | Potential Impact | Implemented Countermeasure |
| :--- | :--- | :--- |
| **Credential Stuffing & Brute Force** | Account takeover via automated password attempts | Multi-tier sliding window rate limiting (5 attempts / 15 mins per email/IP); memory-hard `scrypt` hashing. |
| **OTP Guessing & Flooding** | Unauthorized email verification via 6-digit collision | 10-minute expiry; maximum 5 failed verification attempts before invalidation; 60-second resend cooldown. |
| **OTP Replay & Pre-computation** | Stored OTP interception and replay | Single-use consumption flag (`consumed_at = NOW()`); plaintext OTP is **never stored** (SHA-256 hashed). |
| **Refresh Token Theft & Replay** | Persistent session hijack from compromised mobile client | **Token Rotation with Family Reuse Detection**: Replaying a previously revoked token instantly invalidates all active sessions in that family. |
| **Account Enumeration** | Attacker probes existing user emails via error responses | Identical generic responses for forgot-password and unverified signup requests; constant-time dummy password verification on non-existent accounts. |
| **Cross-Tenant Escalation** | Attacker supplies arbitrary `gym_id` or `member_id` | `gym_id` and `member_id` are derived exclusively from verified JWT server-side claims, not trusted from client payload. |
| **Secret & API Key Leakage** | Resend or database credentials exposed in mobile bundles | `RESEND_API_KEY`, database URLs, and JWT secrets are loaded exclusively server-side. |

---

## 2. Token Lifecycle & Specifications

```mermaid
graph TD
    Login["POST /v1/auth/login"] --> Success["Issue Token Pair"]
    Success --> AccessToken["Access Token (JWT, 15-min TTL)"]
    Success --> RefreshToken["Refresh Token (Random 256-bit, 7-day TTL, Stored as SHA-256 Hash)"]
    
    AccessToken -->|Expired| RefreshRoute["POST /v1/auth/refresh"]
    RefreshRoute --> CheckRevoked{"Is Token Revoked?"}
    CheckRevoked -->|No| Rotate["1. Revoke Old Token<br/>2. Issue New Token in same Family ID<br/>3. Return new Access + Refresh Token"]
    CheckRevoked -->|Yes (Compromised)| InvalidateFamily["⚠️ THREAT DETECTED: Revoke Entire Token Family"]
```

### Access Token Claims:
```json
{
  "sub": "acc_3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "memberId": "mem_28416d8e-715a-4e89-980b-93f538e1b017",
  "gymId": "gym_c518b5b2-32a1-43e5-827d-08d17b438b4d",
  "email": "member@example.com",
  "role": "MEMBER",
  "jti": "d64b2767-33d3-4ec3-85b4-d533b6ee9796",
  "iat": 1724968000,
  "exp": 1724968900
}
```

---

## 3. Password Storage Security
* **Algorithm**: `scrypt` ($N=16384, r=8, p=1, \text{keyLen}=64$) with a 16-byte CSPRNG salt.
* **Storage Format**: `scrypt$16384$8$1$<salt_hex>$<hash_hex>`
* **Verification**: Timing-safe constant time comparison (`crypto.timingSafeEqual`).
