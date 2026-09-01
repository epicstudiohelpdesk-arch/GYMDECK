# GYMDECK: Unified Offline-First + Cloud-Synchronized Architecture Specification

> **Official System Architecture Specification — Version 1.0 (Frozen)**
> **Status:** APPROVED & FROZEN
> **Date:** September 1, 2026

---

## 1. Core Architectural Principles

### The Primary Tenet
> **"The gym creates the member. The member creates the digital account. GymDeck Cloud securely links the two."**

### Platform-Wide Invariant
> **"Local-first. Cloud-synchronized. Server-authorized."**

* **GymDeck Desktop** remains 100% operational without internet connectivity.
* **GymDeck Cloud** serves as the authoritative shared synchronization, identity linking, and authorization layer.
* **Owner Mobile** and **Member Mobile** communicate exclusively with GymDeck Cloud.
* **Desktop** communicates with Cloud exclusively through the transactional synchronization engine.
* **Zero Direct Database Bridging**: No mobile application directly connects to another device's local database.

---

## 2. Global System Topology

```
                         ┌──────────────────────────────────┐
                         │          GYMDECK CLOUD           │
                         │                                  │
                         │  API Gateway                     │
                         │  Authentication & AuthZ          │
                         │  PostgreSQL (Multi-Tenant)       │
                         │  Sync Engine (Push/Pull)         │
                         │  Notification Service            │
                         │  Audit Service                   │
                         │  Private Object Vault            │
                         │  Rate Limiting & Anti-IDOR       │
                         └───────────────┬──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    │ HTTPS/mTLS         │ HTTPS / JWT        │ HTTPS / JWT
                    ▼                    ▼                    ▼
          ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
          │ GYMDECK DESKTOP │   │ OWNER MOBILE    │   │ MEMBER MOBILE   │
          │                 │   │                 │   │                 │
          │ Tauri v2 + Rust │   │ React Native    │   │ React Native    │
          │ React 19 UI     │   │ Secure Storage  │   │ Secure Storage  │
          │ Sync Engine     │   │ Query Cache     │   │ Query Cache     │
          └────────┬────────┘   └─────────────────┘   └─────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ LOCAL DATABASE  │
          │                 │
          │ SQLite (AES-256)│
          │ SQLCipher Engine│
          │ Sync Outbox     │
          │ Sync Metadata   │
          └─────────────────┘
```

---

## 3. The Three Applications

### A. GymDeck Desktop (Primary Operational Workstation)
* **Users**: Gym Owner, Receptionist, Managers, Staff, Personal Trainers.
* **Capabilities**: Member admission, billing & invoices, subscription plans, RFID/barcode attendance, workout assignments, PT scheduling, financial reports, hardware integration (turnstiles, barcode scanners, thermal printers).
* **Offline Guarantee**: Fully autonomous local execution during network outages.

### B. GymDeck Owner Mobile (Remote Management Client)
* **Users**: Gym Owners, General Managers.
* **Capabilities**: Executive dashboard, real-time revenue radar, active floor headcount, subscription status, operational push alerts, staff oversight.
* **Communication**: Pure Cloud REST APIs (never connects directly to Desktop SQLite).

### C. GymDeck Member Mobile (Authenticated Member Portal)
* **Users**: Admitted Gym Members.
* **Capabilities**: Digital check-in pass (dynamic HMAC barcode), workout routine tracker, trainer communication, PT session logs, body measurements, invoices & agreements.
* **Communication**: Pure Cloud REST APIs (never connects directly to Desktop SQLite).

---

## 4. The Three Storage Layers

| Storage Layer | Technology | Primary Role | Invariant |
| :--- | :--- | :--- | :--- |
| **Layer 1: Desktop Local** | SQLite + SQLCipher (AES-256) | Complete operational dataset for gym facility. | Authoritative locally when offline. |
| **Layer 2: Cloud Database** | PostgreSQL 16 + Drizzle ORM | Master multi-tenant synchronized business records. | Authoritative across all clients when synchronized. |
| **Layer 3: Mobile Cache** | TanStack Query + FastAppStorage | Ephemeral UI cache and optimistic mutations. | Non-authoritative; derived strictly from Cloud. |

---

## 5. Synchronization & Outbox Subsystem

```
[ Local Mutation (e.g. Add Member) ]
                │
                ▼
      ┌──────────────────┐
      │ BEGIN TX (Local) │
      ├──────────────────┤
      │ 1. INSERT member │
      │ 2. INSERT outbox │
      ├──────────────────┤
      │    COMMIT TX     │
      └─────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │  sync_outbox  │
        └───────┬───────┘
                │
    [ When Online (Push) ]
                │
                ▼
      POST /v1/sync/push ──► GymDeck Cloud ──► PostgreSQL
                ▲
    [ Incremental Pull ]
                │
      GET /v1/sync/pull?cursor=<last_seq>
```

### Outbox Table Schema (`sync_outbox`)
```sql
CREATE TABLE sync_outbox (
    id TEXT PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- CREATE, UPDATE, DELETE
    payload TEXT NOT NULL,   -- JSON serialization
    created_at TIMESTAMP NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, IN_FLIGHT, SYNCED, FAILED
    error_code TEXT
);
```

### Core Synchronization Rules
1. **Atomic Local Transactions**: The operational record and its corresponding outbox record are committed within the same database transaction.
2. **Global Idempotency**: Every sync mutation carries a unique `event_id` (UUIDv4) deduplicated server-side.
3. **Incremental Cursor**: Synchronization uses `last_applied_server_sequence` to prevent full-table re-downloads.
4. **Conflict Resolution Strategy**:
   * *Financial Transactions & Invoices*: Immutable append-only events (never overwritten).
   * *Attendance Logs*: Append-only event stream.
   * *Profile Attributes*: Version-based optimistic concurrency control.
   * *Audit Logs*: Immutable append-only audit trail.

---

## 6. The Controlled Identity-Linking Lifecycle

```
[ STAGE 1: ADMISSION ]
Receptionist on Desktop adds member
  └─► Inserts `gym_members` (Local SQLite ──► Cloud Postgres)

[ STAGE 2: ACTIVATION ]
Owner generates Invite
  └─► Cloud generates `member_activation_tokens` (SHA-256 hash, 7-day TTL)
  └─► Produces 8-char Display Code (e.g. 7K9P-42XM) + QR Link

[ STAGE 3: ACCOUNT CREATION ]
Member scans QR / enters code on Member Mobile
  └─► Calls POST /v1/auth/invite/verify
  └─► Cloud confirms active admission & issues 15-min signed `activationTicket`
  └─► Member privately creates password (Argon2id / scrypt)
  └─► Cloud inserts `member_accounts` bound to `gym_members.id` and `gym_id`

[ STAGE 4: AUTHENTICATION ]
Daily Login via Email + Password
  └─► Issues rotating JWT Access (15m) & Refresh Token (7d)
  └─► Tokens stored in hardware-backed secure storage (iOS Keychain / Android Keystore)
  └─► All queries strictly derived from JWT claims: `WHERE member_id = ? AND gym_id = ?`
```

---

## 7. Security & Governance Invariants

1. **Anti-IDOR Architecture**: Clients never supply arbitrary entity IDs in resource mutations. The server extracts `memberId` and `gymId` strictly from the cryptographically verified JWT context.
2. **Zero-Trust Multi-Tenancy**: Every database query is scoped by `gym_id`. Cross-tenant querying is structurally impossible.
3. **Password Confidentiality**: Staff never assign or know a member's digital password.
4. **Session Token Rotation & Reuse Detection**: Refresh tokens are family-tracked. If a previously consumed token is replayed, the entire session family is instantly revoked.
5. **No Secret Leakage**: Database URLs, signing secrets, and service keys are never embedded in client binaries or source repositories.

---

## 8. Official Phase Implementation Roadmap

| Phase | Milestone Name | Status |
| :---: | :--- | :---: |
| **0** | Architecture Freeze & Canonical Specification | ✅ **FROZEN** |
| **1** | Cloud Database & Identity Foundation (PostgreSQL + Drizzle) | ✅ **COMPLETE** |
| **2** | Desktop Local Database Hardening (SQLCipher AES-256) | ✅ **COMPLETE** |
| **3** | Desktop Sync Engine & Outbox Subsystem | 🔄 **ACTIVE** |
| **4** | Cloud $\leftrightarrow$ Desktop Sync API (Push/Pull Engine) | 🔄 **ACTIVE** |
| **5** | Owner/Gym Authentication & RBAC Hierarchy | ✅ **COMPLETE** |
| **6** | Member Admission Profile Processing | ✅ **COMPLETE** |
| **7** | Member Invitation & Activation (QR & Token Subsystem) | ✅ **COMPLETE** |
| **8** | Member Digital Authentication & Rotation | ✅ **COMPLETE** |
| **9** | Unified Member Domain API Gateway | ✅ **COMPLETE** |
| **10** | Member Mobile Portal UI & Offline Resilience | ✅ **COMPLETE** |
| **11** | Owner Mobile Client & Remote Cockpit | 📋 **PLANNED** |
| **12** | Real-Time Notifications & Push Dispatchers | ✅ **COMPLETE** |
| **13** | Conflict Resolution, Backoff & Disaster Recovery | ✅ **COMPLETE** |
| **14** | Security Auditing, Penetration Testing & Load Probing | ✅ **COMPLETE** |
| **15** | Production Release & Continuous Deployment | 🚀 **READY** |

---

## 9. Official Freezing Statement

> **GymDeck is an offline-first, cloud-synchronized, multi-tenant gym management ecosystem. GymDeck Desktop maintains the gym's operational dataset locally using encrypted SQLite/SQLCipher and remains fully functional during network outages. A transactional synchronization engine asynchronously pushes local mutations to GymDeck Cloud and pulls authorized remote changes back into the local database. GymDeck Cloud provides centralized authentication, authorization, tenant isolation, synchronization, auditing, notifications, and mobile APIs. Owner Mobile and Member Mobile communicate exclusively with the Cloud API and never directly access a Desktop database.**
