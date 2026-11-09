/**
 * GymDeck Payments V2 - refund tracking linked to the original verified payment.
 * GymDeck records an externally executed refund; it never claims to move money itself.
 */

import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { fromMinorUnits } from '../../shared/utils/money';

export interface RefundDto {
  amountMinor: number;
  reason: string;
  refundMethod?: string;
  refundReference?: string;
}

function toRefundDto(row: any) {
  return {
    id: row.id,
    originalPaymentId: row.original_payment_id,
    invoiceId: row.invoice_id,
    amountMinor: Number(row.amount_minor),
    amount: fromMinorUnits(Number(row.amount_minor)),
    reason: row.reason,
    refundMethod: row.refund_method,
    refundReference: row.refund_reference,
    status: row.status,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
  };
}

export class RefundService {
  public async record(
    gymId: string,
    paymentId: string,
    actorUserId: string | undefined,
    dto: RefundDto
  ) {
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw AppError.validation('A refund reason is required.');
    }
    if (!Number.isInteger(dto.amountMinor) || dto.amountMinor <= 0) {
      throw AppError.validation('Refund amount must be a positive integer in minor units.');
    }
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const payment = (await client.query(
        `SELECT * FROM payments WHERE id = $1 AND gym_id = $2 AND type = 'PAYMENT' FOR UPDATE`,
        [paymentId, gymId]
      )).rows[0];
      if (!payment) throw AppError.notFound('Verified payment not found in this gym.');

      const prior = (await client.query(
        `SELECT COALESCE(SUM(amount_minor),0)::bigint AS total FROM payment_refunds
         WHERE gym_id = $1 AND original_payment_id = $2 AND status <> 'FAILED'`,
        [gymId, paymentId]
      )).rows[0];
      const alreadyMinor = Number(prior.total);
      const originalMinor = Math.round(Number(payment.amount) * 100);
      if (alreadyMinor + dto.amountMinor > originalMinor) {
        throw AppError.validation(
          `Refund exceeds remaining refundable balance of ₹${fromMinorUnits(originalMinor - alreadyMinor)}.`
        );
      }

      const allocation = (await client.query(
        `SELECT invoice_id FROM payment_allocations WHERE gym_id = $1 AND payment_id = $2 LIMIT 1`,
        [gymId, paymentId]
      )).rows[0];
      const invoiceId = allocation?.invoice_id || null;

      const refund = (await client.query(
        `INSERT INTO payment_refunds (
           gym_id, original_payment_id, invoice_id, amount_minor, reason,
           refund_method, refund_reference, status, created_by, verified_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'COMPLETED',$8,NOW()) RETURNING *`,
        [
          gymId,
          paymentId,
          invoiceId,
          dto.amountMinor,
          dto.reason.trim(),
          dto.refundMethod || 'DIRECT_UPI',
          dto.refundReference?.trim() || null,
          actorUserId || null,
        ]
      )).rows[0];

      if (invoiceId) {
        await client.query(
          `UPDATE invoices SET refunded_minor = refunded_minor + $3, updated_at = NOW()
           WHERE id = $1 AND gym_id = $2`,
          [invoiceId, gymId, dto.amountMinor]
        );
      }
      if (alreadyMinor + dto.amountMinor >= originalMinor) {
        await client.query(`UPDATE payments SET status = 'REFUNDED' WHERE id = $1 AND gym_id = $2`, [
          paymentId,
          gymId,
        ]);
      }
      await client.query(
        `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
         VALUES ($1,'payment',$2,'PAYMENT_REFUND_RECORDED',$3,$4::jsonb)`,
        [
          gymId,
          paymentId,
          actorUserId || null,
          JSON.stringify({ refundId: refund.id, amountMinor: dto.amountMinor, reason: dto.reason.trim() }),
        ]
      );
      await client.query('COMMIT');
      return toRefundDto(refund);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const refundService = new RefundService();
export default refundService;

