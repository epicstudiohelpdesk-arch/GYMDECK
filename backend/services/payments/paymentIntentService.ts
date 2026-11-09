/**
 * GymDeck Payments V2 - Member payment initiation (direct UPI / bank transfer).
 * The payable amount is always derived from the invoice on the server.
 */

import * as crypto from 'crypto';
import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { fromMinorUnits } from '../../shared/utils/money';
import { getGymPaymentSettings, toInvoiceDto } from './invoiceService';

export interface CreateAttemptDto {
  invoiceId: string;
  amountMinor?: number;
  provider?: 'DIRECT_UPI' | 'DIRECT_BANK_TRANSFER';
  idempotencyKey?: string;
}

export function buildUpiUri(input: {
  vpa: string;
  payeeName: string;
  amountMinor: number;
  note: string;
  reference: string;
}): string {
  const params = new URLSearchParams();
  params.set('pa', input.vpa);
  params.set('pn', input.payeeName);
  params.set('am', fromMinorUnits(input.amountMinor));
  params.set('cu', 'INR');
  params.set('tn', input.note);
  params.set('tr', input.reference);
  return `upi://pay?${params.toString()}`;
}

function toAttemptDto(row: any) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amountMinor: Number(row.amount_minor),
    amount: fromMinorUnits(Number(row.amount_minor)),
    currency: row.currency,
    provider: row.provider,
    transactionReference: row.transaction_reference,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

const ACTIVE = ['INITIATED', 'SUBMITTED', 'PENDING_VERIFICATION'];

export class PaymentIntentService {
  private async respond(attempt: any) {
    const pool = getDatabasePool();
    const account = (await pool.query(
      `SELECT * FROM gym_payment_accounts WHERE id = $1 AND gym_id = $2`,
      [attempt.receiving_account_id, attempt.gym_id]
    )).rows[0];
    const invoice = (await pool.query(`SELECT * FROM invoices WHERE id = $1 AND gym_id = $2`, [
      attempt.invoice_id,
      attempt.gym_id,
    ])).rows[0];
    const base = { attempt: toAttemptDto(attempt), invoice: invoice ? toInvoiceDto(invoice) : null };
    if (!account || account.method !== 'UPI') {
      return { ...base, payment: account ? { method: account.method, instructions: account.instructions } : null };
    }
    return {
      ...base,
      payment: {
        method: 'UPI',
        vpa: account.upi_vpa,
        beneficiaryName: account.beneficiary_name,
        instructions: account.instructions,
        upiUri: buildUpiUri({
          vpa: account.upi_vpa,
          payeeName: account.beneficiary_name,
          amountMinor: Number(attempt.amount_minor),
          note: `Gym fee ${attempt.transaction_reference}`,
          reference: attempt.transaction_reference,
        }),
      },
    };
  }

  public async createAttempt(gymId: string, memberId: string, dto: CreateAttemptDto) {
    if (!gymId) throw AppError.forbidden('Tenant gym context missing.');
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const invoice = (await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND gym_id = $2 AND member_id = $3 FOR UPDATE`,
        [dto.invoiceId, gymId, memberId]
      )).rows[0];
      if (!invoice) throw AppError.notFound('Invoice not found for this member.');
      const inv = toInvoiceDto(invoice);
      if (inv.status === 'VOID') throw AppError.validation('Invoice is void and cannot be paid.');
      if (inv.outstandingMinor <= 0) throw AppError.conflict('Invoice has no outstanding balance.');

      const settings = await getGymPaymentSettings(gymId);
      let amountMinor = inv.outstandingMinor;
      if (dto.amountMinor !== undefined) {
        if (!Number.isInteger(dto.amountMinor) || dto.amountMinor <= 0) {
          throw AppError.validation('amountMinor must be a positive integer.');
        }
        if (dto.amountMinor !== amountMinor) {
          if (dto.amountMinor < amountMinor && !settings.allow_partial_payments) {
            throw AppError.validation('Partial payments are not enabled for this gym.');
          }
          if (dto.amountMinor > amountMinor && !settings.allow_overpayment) {
            throw AppError.validation('Amount exceeds the outstanding invoice balance.');
          }
          amountMinor = dto.amountMinor;
        }
      }

      if (dto.idempotencyKey) {
        const prior = (await client.query(
          `SELECT * FROM payment_attempts WHERE gym_id = $1 AND idempotency_key = $2 LIMIT 1`,
          [gymId, dto.idempotencyKey]
        )).rows[0];
        if (prior) {
          await client.query('COMMIT');
          return this.respond(prior);
        }
      }

      const active = (await client.query(
        `SELECT * FROM payment_attempts
         WHERE gym_id = $1 AND member_id = $2 AND invoice_id = $3
           AND status = ANY($4::text[])
         ORDER BY created_at DESC LIMIT 1`,
        [gymId, memberId, dto.invoiceId, ACTIVE]
      )).rows[0];
      if (active) {
        await client.query('COMMIT');
        return this.respond(active);
      }

      const account = (await client.query(
        `SELECT * FROM gym_payment_accounts
         WHERE gym_id = $1 AND is_active = TRUE AND status <> 'DISABLED' AND method = 'UPI'
         ORDER BY is_primary DESC, created_at ASC LIMIT 1`,
        [gymId]
      )).rows[0];
      if (!account) {
        throw AppError.validation('This gym has no active UPI receiving account. Please contact the gym.');
      }

      const reference = `GD-PAY-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;
      const inserted = await client.query(
        `INSERT INTO payment_attempts (
           gym_id, member_id, invoice_id, receiving_account_id, amount_minor, currency,
           provider, transaction_reference, status, idempotency_key, expires_at, created_by_type, created_by
         ) VALUES ($1,$2,$3,$4,$5,'INR',$6,$7,'INITIATED',$8, NOW() + INTERVAL '30 minutes','MEMBER',$2)
         RETURNING *`,
        [
          gymId,
          memberId,
          dto.invoiceId,
          account.id,
          amountMinor,
          dto.provider || 'DIRECT_UPI',
          reference,
          dto.idempotencyKey || null,
        ]
      );
      await client.query(
        `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
         VALUES ($1,'payment_attempt',$2,'PAYMENT_INITIATED',$3,$4::jsonb)`,
        [
          gymId,
          inserted.rows[0].id,
          memberId,
          JSON.stringify({ invoiceId: dto.invoiceId, amountMinor, reference }),
        ]
      );
      await client.query('COMMIT');
      return this.respond(inserted.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async getAttempt(gymId: string, memberId: string, attemptId: string) {
    const pool = getDatabasePool();
    const res = await pool.query(
      `SELECT * FROM payment_attempts WHERE id = $1 AND gym_id = $2 AND member_id = $3`,
      [attemptId, gymId, memberId]
    );
    if (!res.rows[0]) throw AppError.notFound('Payment attempt not found.');
    return this.respond(res.rows[0]);
  }

  public async cancelAttempt(gymId: string, memberId: string, attemptId: string) {
    const pool = getDatabasePool();
    const res = await pool.query(
      `UPDATE payment_attempts SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1 AND gym_id = $2 AND member_id = $3
         AND status IN ('INITIATED','SUBMITTED')
       RETURNING *`,
      [attemptId, gymId, memberId]
    );
    if (!res.rows[0]) throw AppError.conflict('Payment attempt cannot be cancelled in its current state.');
    await pool.query(
      `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
       VALUES ($1,'payment_attempt',$2,'PAYMENT_CANCELLED',$3,'{}'::jsonb)`,
      [gymId, attemptId, memberId]
    );
    return toAttemptDto(res.rows[0]);
  }
}

export const paymentIntentService = new PaymentIntentService();
export default paymentIntentService;



