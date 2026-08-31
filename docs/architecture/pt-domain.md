# GymDeck Personal Training (PT) Domain Architecture

## 1. Overview
The Personal Training Domain provides authenticated members with visibility into their assigned personal coach, remaining PT package session credits, and historical 1-on-1 scheduled sessions.

---

## 2. API Endpoints
* `GET /v1/member/trainer`: Returns assigned coach profile (specialization, bio, certifications, rating, photo).
* `GET /v1/member/pt-package`: Returns active package metrics (`totalSessions`, `usedSessions`, `remainingSessions`, `expiresAt`).
* `GET /v1/member/pt-sessions`: Returns scheduled and completed 1-on-1 sessions.

---

## 3. Package Consumption & Tenant Safety
* **Strict Tenant Scoping**: Packages and trainers are strictly bound to `(gym_id, member_id)`.
* **Zero Over-Consumption**: `remaining_sessions` is derived from `total_sessions - used_sessions`, strictly enforcing non-negative session balances.
