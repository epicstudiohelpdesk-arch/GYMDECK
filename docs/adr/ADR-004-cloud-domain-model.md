# ADR-004: Cloud Multi-Tenant Domain Schema & Member Account Architecture

## Status
**ACCEPTED** (2026-08-29)

## Context
The GymDeck Cloud Backend requires a relational schema that supports the mobile member experience while remaining compatible with future synchronization from the local desktop SQLite application.

### Key Architectural Questions:
1. **Member Identity vs Authentication Account**: Should physical gym members and mobile app accounts be merged into a single table or separated?
2. **Email Uniqueness Scope**: Should member email addresses be globally unique across all gyms or unique per tenant (`gym_id, email`)?
3. **Multi-Tenant Compound Foreign Keys**: How should tenant data be isolated to prevent Insecure Direct Object References (IDOR)?

---

## Decisions

### 1. Separation of `gym_members` and `member_accounts`
We maintain a strict separation between the physical gym member record (`gym_members`) and their digital credentials (`member_accounts`):
```
gyms (Tenant Root)
  └── gym_members (Physical Identity: name, phone, dob, membership status)
        └── member_accounts (Digital Identity: email, password_hash, email_verified, tokens)
```
* **Rationale**:
  * A physical member can exist in the gym without registering a mobile account.
  * Mobile account onboarding can be linked to an existing member record via verification codes.
  * Resetting or locking a digital account does not delete the member's legal membership history.

### 2. Global Uniqueness for `member_accounts.email`
`member_accounts.email` is enforced with a **global unique index** across the entire cloud platform.
* **Rationale**:
  * Enables seamless single sign-on (SSO) and direct email/password login in mobile apps without requiring the user to select or know their internal `gym_id` beforehand.
  * Once authenticated, the JWT payload embeds `{ gymId, memberId, memberAccountId }` to scope all subsequent API calls.

### 3. Strict Compound Foreign Keys and Indexes
All member-owned tables (`workout_sessions`, `attendance_logs`, `member_documents`, `body_weight_logs`, etc.) explicitly store `gym_id` and `member_id` with composite indexes:
$$\text{INDEX } (\text{gym\_id}, \text{member\_id})$$
* **Rationale**:
  * Eliminates cross-tenant data leaks and prevents IDOR attacks at the database query layer.
  * Facilitates partition pruning and high-performance tenant-scoped queries.

---

## Consequences
* **Positive**:
  * Secure, performant multi-tenant database access with clear boundaries.
  * Direct compatibility with desktop data synchronization in future phases.
  * Clean isolation of authentication lifecycle (OTPs, password resets, refresh tokens).
* **Negative**:
  * Requires a 2-table join (`member_accounts` $\bowtie$ `gym_members`) during authentication profile retrieval.
