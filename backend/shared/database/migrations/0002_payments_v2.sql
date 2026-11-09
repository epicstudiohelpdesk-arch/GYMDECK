-- GymDeck Payments V2 - additive, forward-only.
-- Amounts in integer minor units (paise). Never drop or rewrite existing rows.

CREATE TABLE IF NOT EXISTS gym_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  method VARCHAR(32) NOT NULL,
  label VARCHAR(64),
  status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  beneficiary_name VARCHAR(255) NOT NULL,
  upi_vpa VARCHAR(255),
  bank_name VARCHAR(128),
  account_type VARCHAR(64),
  account_number_enc TEXT,
  account_number_last4 VARCHAR(4),
  ifsc_code VARCHAR(16),
  branch_name VARCHAR(255),
  branch_city VARCHAR(128),
  qr_image_url TEXT,
  instructions TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gym_payment_accounts_method_chk CHECK (method IN ('UPI','BANK_TRANSFER')),
  CONSTRAINT gym_payment_accounts_status_chk CHECK (status IN ('UNVERIFIED','VERIFICATION_PENDING','VERIFIED','VERIFICATION_FAILED','DISABLED')),
  CONSTRAINT gym_payment_accounts_upi_vpa_chk CHECK (method <> 'UPI' OR upi_vpa IS NOT NULL),
  CONSTRAINT gym_payment_accounts_bank_chk CHECK (method <> 'BANK_TRANSFER' OR (account_number_enc IS NOT NULL AND ifsc_code IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gpa_one_primary_per_method
  ON gym_payment_accounts (gym_id, method)
  WHERE is_primary AND is_active;
CREATE INDEX IF NOT EXISTS idx_gpa_gym_active ON gym_payment_accounts (gym_id, is_active);

CREATE TABLE IF NOT EXISTS gym_payment_settings (
  gym_id UUID PRIMARY KEY REFERENCES gyms(id) ON DELETE CASCADE,
  allow_partial_payments BOOLEAN NOT NULL DEFAULT FALSE,
  allow_overpayment BOOLEAN NOT NULL DEFAULT FALSE,
  activate_membership_on_partial BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_prefix VARCHAR(16) NOT NULL DEFAULT 'INV',
  receipt_prefix VARCHAR(16) NOT NULL DEFAULT 'REC',
  gst_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  gstin VARCHAR(15),
  legal_business_name VARCHAR(255),
  place_of_supply VARCHAR(128),
  default_tax_rate_bps INTEGER NOT NULL DEFAULT 0,
  receipt_footer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES member_memberships(id) ON DELETE SET NULL,
  invoice_number VARCHAR(64) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  subtotal_minor BIGINT NOT NULL DEFAULT 0,
  tax_minor BIGINT NOT NULL DEFAULT 0,
  total_minor BIGINT NOT NULL,
  paid_minor BIGINT NOT NULL DEFAULT 0,
  refunded_minor BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
  description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_total_chk CHECK (total_minor >= 0 AND paid_minor >= 0 AND refunded_minor >= 0),
  CONSTRAINT invoices_status_chk CHECK (status IN ('DRAFT','OPEN','PARTIALLY_PAID','PAID','OVERPAID','VOID')),
  CONSTRAINT invoices_number_uq UNIQUE (gym_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_invoices_gym_member ON invoices (gym_id, member_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_gym_due ON invoices (gym_id, due_date);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  receiving_account_id UUID REFERENCES gym_payment_accounts(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  provider VARCHAR(24) NOT NULL DEFAULT 'DIRECT_UPI',
  transaction_reference VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'INITIATED',
  idempotency_key VARCHAR(128),
  expires_at TIMESTAMPTZ,
  created_by_type VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_attempts_amount_chk CHECK (amount_minor > 0),
  CONSTRAINT payment_attempts_provider_chk CHECK (provider IN ('DIRECT_UPI','DIRECT_BANK_TRANSFER','CASH','PAYMENT_GATEWAY')),
  CONSTRAINT payment_attempts_status_chk CHECK (status IN ('INITIATED','SUBMITTED','PENDING_VERIFICATION','VERIFIED','REJECTED','FAILED','CANCELLED','EXPIRED')),
  CONSTRAINT payment_attempts_ref_uq UNIQUE (gym_id, transaction_reference)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempts_idem
  ON payment_attempts (gym_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_attempts_gym_status ON payment_attempts (gym_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice ON payment_attempts (gym_id, invoice_id);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL REFERENCES payment_attempts(id) ON DELETE CASCADE,
  submitted_by_member_id UUID NOT NULL REFERENCES gym_members(id) ON DELETE CASCADE,
  utr VARCHAR(64) NOT NULL,
  claimed_amount_minor BIGINT NOT NULL,
  claimed_paid_at TIMESTAMPTZ,
  screenshot_document_id UUID,
  status VARCHAR(24) NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_submissions_amount_chk CHECK (claimed_amount_minor > 0),
  CONSTRAINT payment_submissions_utr_uq UNIQUE (gym_id, utr)
);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_attempt ON payment_submissions (gym_id, attempt_id);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
  attempt_id UUID REFERENCES payment_attempts(id) ON DELETE SET NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_allocations_amount_chk CHECK (amount_minor > 0),
  CONSTRAINT payment_allocations_attempt_invoice_uq UNIQUE (attempt_id, invoice_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations (gym_id, invoice_id);

CREATE TABLE IF NOT EXISTS payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL UNIQUE REFERENCES payment_attempts(id) ON DELETE CASCADE,
  decision VARCHAR(16) NOT NULL,
  verified_by UUID NOT NULL,
  verification_method VARCHAR(32) NOT NULL DEFAULT 'MANUAL_UTR',
  note TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_verifications_decision_chk CHECK (decision IN ('VERIFIED','REJECTED'))
);

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  original_payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL,
  reason TEXT NOT NULL,
  refund_method VARCHAR(32) NOT NULL DEFAULT 'DIRECT_UPI',
  refund_reference VARCHAR(128),
  status VARCHAR(24) NOT NULL DEFAULT 'RECORDED',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  CONSTRAINT payment_refunds_amount_chk CHECK (amount_minor > 0),
  CONSTRAINT payment_refunds_status_chk CHECK (status IN ('RECORDED','COMPLETED','FAILED'))
);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds (gym_id, original_payment_id);

CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  receipt_number VARCHAR(64) NOT NULL,
  receipt_type VARCHAR(24) NOT NULL DEFAULT 'PAYMENT_RECEIPT',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_receipts_number_uq UNIQUE (gym_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS payment_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  entity_type VARCHAR(32) NOT NULL,
  entity_id UUID,
  action VARCHAR(64) NOT NULL,
  actor_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_audit_gym_time ON payment_audit_events (gym_id, created_at);



