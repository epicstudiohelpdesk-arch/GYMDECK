# GymDeck Payments V2 — Gate 0 Audit

Scope: `Gym_Software_Desktop` (desktop Tauri/React, owner-mobile, member-mobile, cloud gateway).
No code changed before this document.

## Current architecture (as found)

- Cloud: Express gateway + domain services + Drizzle schema. DDL is applied idempotently by `backend/shared/database/bootstrap.ts`.
- Ledger: one `payments` table (numeric(10,2), `status` default `COMPLETED`, type PAYMENT/REFUND, random receipt number, unique `(gym_id,idempotency_key)`).
- Billing: no `invoices` table. Dues = sum(`member_memberships.price_at_purchase`) - sum(COMPLETED payments), in `billingService.getMemberBillingSummary`.
- Receiving account: single-row `payment_configurations` per gym, masked account number only, `is_verified` default `true`.
- Desktop banking UI: `GymProfile.jsx` keeps `bankAccounts` in React state only and sets `verificationStatus: "VERIFIED"` client-side. It never persists.
- Desktop collection: `CollectFees.jsx` `handleProcessPayment` is `setTimeout(1100)` fake success + soundbox beep. The UTR is only used in the success message. No ledger write.
- Member app: client-built `upi://pay` URI with no `tr`; amount comes from the client; `/member/dashboard` omits `outstandingDues`.
- Owner app: op-sqlite with outbox; refund rows use `REF-<timestamp>` and no original-payment link.
- Sync: outbox/inbox + idempotency log exist; payment events are last-write upserts.

## Audit matrix

| Module | Existing implementation | Identified risk | Required change | Regression risk |
|---|---|---|---|---|
| `frontend/GymProfile.jsx` banking | Local React state, fabricated VERIFIED, full account number in memory | No persistence, false verification, full account exposure, no audit | Persist via tenant-scoped accounts API; real statuses; mask | Medium (UI only) |
| `payment_configurations` table | One row/gym, masked number, `is_verified=true` default, fake "Indian's Gym" fallback | Fake verification, no encryption, no multi-account, silent fixture data | Add `gym_payment_accounts` + settings; encrypt; explicit UNVERIFIED | Low (additive) |
| `gateway/src/routes/paymentConfig.ts` | No auth; client `gymId`/first gym; OTP `984201` accepted forever; marks verified | Cross-tenant read/write, unauthenticated config change, fake bank verification | Require auth + permission; derive gym from token; remove OTP shortcut | High (route rewrite) |
| `billingService.getPaymentConfig/savePaymentConfig` | Raw SQL, defaults verified=true | Trusts caller, no validation, no audit | Validate + normalise + encrypt + audit | Low |
| `/member/payment-config` | Authenticated, tenant-scoped | Exposes holder/IFSC/branch that member does not need | Return only method, VPAs, masked number | Low |
| `memberService.payFeeViaUPI` | Client amount, no `tr`, hardcoded fallback VPA | Amount tampering, no reconciliation reference, wrong beneficiary fallback | Server payment request + `tr` + proper encoding | Medium |
| Member dues | Dashboard omits `outstandingDues`; dev fixture | Member pays arbitrary amount, no invoice authority | Add invoices + summary API | Low (additive) |
| `CollectFees.jsx` | Fake `setTimeout` success; UTR unused | False settlement, no ledger, no verification | Create attempt + submission; no client success | High (behaviour change) |
| `payments` ledger | No invoice/allocation; status default COMPLETED; refunds via `LIKE 'REFUND-OF-%'` | No partial/installment tracking; fragile refund linkage; verified edits possible | Keep table; add allocations/refunds v2 | Medium |
| `purchaseMembership`/`renewMembership` | Activates membership before/without full payment | Free access on unpaid or pending payment | Gate activation by policy; idempotent | High (business rule) |
| Owner mobile payments | Outbox works; refund `REF-<ts>`, no original link | Unlinked refunds; local rows marked SYNCED | Link refunds; add reconciliation client | Medium |
| Sync payment events | Tenant check + upsert | Last-write-wins can overwrite verified amounts | Reject amount/status changes on verified rows | Medium |
| Tests | Billing suite (script asserts) covers idempotency/refunds/tenant | No auth, concurrency or state-machine tests for direct UPI | Add v2 domain/database tests | Low |

## Confirmed working (preserve)

- Tenant scoping on `/v1/owner/*` via token `gymId`; `requirePermission('payments.read|write')`.
- `recordPayment` idempotency via unique `(gym_id, idempotency_key)`.
- Refund cumulative limit arithmetic in minor units.
- Owner-mobile transactional outbox and sync idempotency log.
- Existing cash collection, invoices-as-memberships summary, receipts, dashboards.
- Existing billing test suite (must keep passing).

## Gap summary

1. No authenticated, persisted, multi-account receiving configuration.
2. Verification status is fabricated (UI) or defaulted true (DB).
3. No invoice entity, so nothing authoritative can be paid against.
4. No payment attempt / UTR submission / owner verification state machine.
5. No concurrency guard or idempotency for verification (two staff = two entries).
6. No allocation of a payment to an invoice; partial payments unmodelled.
7. Refunds are negative `payments` rows linked by string prefix.
8. Membership activates on purchase, not on verified payment.
9. No reconciliation UI in Desktop, Owner Mobile or Member Mobile.
10. `paymentConfig.ts` is unauthenticated and accepts a permanent demo OTP.

## Target architecture (V2)

- Keep `payments` as the immutable verified ledger (COMPLETED rows) for backward compatibility.
- Add tenant-scoped: `gym_payment_accounts`, `gym_payment_settings`, `invoices`, `payment_attempts`, `payment_submissions`, `payment_allocations`, `payment_verifications`, `payment_refunds`, `payment_receipts`, `payment_audit_events`.
- Amounts in integer minor units (`BIGINT`) in V2 tables; convert at the API boundary.
- State machine: `INITIATED -> SUBMITTED -> PENDING_VERIFICATION -> VERIFIED | REJECTED`, plus `CANCELLED`, `FAILED`, `EXPIRED`; refunds `PARTIALLY_REFUNDED`/`REFUNDED`.
- Verification is transaction + `SELECT ... FOR UPDATE`, idempotent, permission-gated, audited.
- Provider abstraction: `DIRECT_UPI`, `DIRECT_BANK_TRANSFER`, `CASH`, `PAYMENT_GATEWAY`.
- No gateway integration in V2.

## Implementation gates

| Gate | Deliverable |
|---|---|
| 0 | This audit |
| 1 | Migration `0002_payments_v2.sql` + bootstrap DDL + schema modules |
| 2 | Accounts/settings service + routes (encryption, validation, statuses, audit) |
| 3 | Invoice + payment request + UPI intent generation (server amount, unique `tr`) |
| 4 | Submission + reconciliation (verify/reject, locking, idempotency) |
| 5 | Allocations, partial payments, refunds |
| 6 | Receipts, GST settings, membership activation policy |
| 7 | Desktop reconciliation UI + member/owner mobile clients |
| 8 | Sync/permission hardening + audit |
| 9 | Tests + report |

V1 security debt is fixed in Gate 2: `paymentConfig.ts` must no longer accept unauthenticated writes or the demo OTP.
