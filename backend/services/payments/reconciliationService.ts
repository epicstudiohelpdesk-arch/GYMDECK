/**
 * GymDeck Payments V2 - Submission and owner reconciliation engine.
 * Verification is transactional, row-locked and idempotent.
 */

import * as crypto from 'crypto';
import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { fromMinorUnits } from '../../shared/utils/money';
import { getGymPaymentSettings, toInvoiceDto } from './invoiceService';
import { toPaymentDto } from './dto';

export interface SubmitDto {
  utr: string;
  claimedAmountMinor: number;
  claimedPaidAt?: string;
  screenshotDocumentId?: string;
}

const UTR_RE = /^[A-Za-z0-9_-]{6,40}$/;

export class ReconciliationService {
  public async submit(gymId: string, memberId: string, attemptId: string, dto: SubmitDto) {
    const utr = (dto.utr || '').trim().toUpperCase();
    if (!UTR_RE.test(utr)) {
      throw AppError.validation('UTR / transaction reference must be 6-40 letters or digits.');
    }
    if (!Number.isInteger(dto.claimedAmountMinor) || dto.claimedAmountMinor <= 0) {
      throw AppError.validation('Claimed amount must be a positive integer in minor units.');
    }
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const attempt = (await client.query(
        `SELECT * FROM payment_attempts WHERE id = $1 AND gym_id = $2 AND member_id = $3 FOR UPDATE`,
        [attemptId, gymId, memberId]
      )).rows[0];
      if (!attempt) throw AppError.notFound('Payment attempt not found.');
      if (!['INITIATED', 'SUBMITTED'].includes(attempt.status)) {
        throw AppError.conflict('This payment attempt can no longer accept a submission.');
      }
      const dup = (await client.query(
        `SELECT id FROM payment_submissions WHERE gym_id = $1 AND utr = $2 LIMIT 1`,
        [gymId, utr]
      )).rows[0];
      if (dup) throw AppError.conflict('This UTR has already been submitted.');

      const submission = await client.query(
        `INSERT INTO payment_submissions (
           gym_id, attempt_id, submitted_by_member_id, utr, claimed_amount_minor,
           claimed_paid_at, screenshot_document_id, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'SUBMITTED') RETURNING *`,
        [
          gymId,
          attemptId,
          memberId,
          utr,
          dto.claimedAmountMinor,
          dto.claimedPaidAt ? new Date(dto.claimedPaidAt) : null,
          dto.screenshotDocumentId || null,
        ]
      );
      await client.query(
        `UPDATE payment_attempts SET status = 'SUBMITTED', updated_at = NOW() WHERE id = $1`,
        [attemptId]
      );
      await client.query(
        `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
         VALUES ($1,'payment_attempt',$2,'PAYMENT_SUBMITTED',$3,$4::jsonb)`,
        [
          gymId,
          attemptId,
          memberId,
          JSON.stringify({ utr, claimedAmountMinor: dto.claimedAmountMinor }),
        ]
      );
      await client.query('COMMIT');
      return {
        attemptId,
        status: 'SUBMITTED',
        submissionId: submission.rows[0].id,
        utr,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      if ((err as any)?.code === '23505') {
        throw AppError.conflict('This UTR has already been submitted.');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  public async verify(
    gymId: string,
    attemptId: string,
    actorUserId: string | undefined,
    options: { amountMinor?: number; note?: string } = {}
  ) {
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const attempt = (await client.query(
        `SELECT * FROM payment_attempts WHERE id = $1 AND gym_id = $2 FOR UPDATE`,
        [attemptId, gymId]
      )).rows[0];
      if (!attempt) throw AppError.notFound('Payment attempt not found in this gym.');
      if (attempt.status === 'VERIFIED') {
        throw AppError.conflict('This payment has already been verified.');
      }
      if (!['SUBMITTED', 'PENDING_VERIFICATION'].includes(attempt.status)) {
        throw AppError.conflict('Payment is not in a verifiable state.');
      }
      if (!actorUserId) throw AppError.forbidden('Verification requires an authenticated operator.');

      const invoice = (await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND gym_id = $2 FOR UPDATE`,
        [attempt.invoice_id, gymId]
      )).rows[0];
      if (!invoice) throw AppError.notFound('Linked invoice not found in this gym.');
      if (invoice.member_id !== attempt.member_id) {
        throw AppError.forbidden('Invoice does not belong to the payment member.');
      }

      const submission = (await client.query(
        `SELECT * FROM payment_submissions WHERE gym_id = $1 AND attempt_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [gymId, attemptId]
      )).rows[0];
      if (!submission) throw AppError.conflict('No member submission exists for this payment.');

      const settings = await getGymPaymentSettings(gymId);
      const invDto = toInvoiceDto(invoice);
      const amountMinor = options.amountMinor ?? Number(submission.claimed_amount_minor);
      if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
        throw AppError.validation('Verified amount must be a positive integer in minor units.');
      }
      if (amountMinor > invDto.outstandingMinor && !settings.allow_overpayment) {
        throw AppError.validation('Verified amount exceeds the outstanding invoice balance.');
      }

      const receiptNumber = `REC-${new Date().getFullYear()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;
      const payment = (await client.query(
        `INSERT INTO payments (
           gym_id, member_id, membership_id, amount, payment_method, transaction_reference,
           receipt_number, type, status, notes, paid_at
         ) VALUES ($1,$2,$3,$4,'UPI',$5,$6,'PAYMENT','COMPLETED',$7,NOW()) RETURNING *`,
        [
          gymId,
          attempt.member_id,
          invoice.membership_id,
          fromMinorUnits(amountMinor),
          submission.utr,
          receiptNumber,
          options.note || 'Direct UPI payment verified by gym staff',
        ]
      )).rows[0];
      await client.query(
        `INSERT INTO payment_allocations (gym_id, payment_id, attempt_id, invoice_id, amount_minor)
         VALUES ($1,$2,$3,$4,$5)`,
        [gymId, payment.id, attemptId, invoice.id, amountMinor]
      );

      const paidMinor = Number(invoice.paid_minor) + amountMinor;
      const totalMinor = Number(invoice.total_minor);
      const newStatus =
        paidMinor >= totalMinor ? (paidMinor > totalMinor ? 'OVERPAID' : 'PAID') : 'PARTIALLY_PAID';
      const updatedInvoice = (await client.query(
        `UPDATE invoices SET paid_minor = $3, status = $4, updated_at = NOW()
         WHERE id = $1 AND gym_id = $2 RETURNING *`,
        [invoice.id, gymId, paidMinor, newStatus]
      )).rows[0];

      await client.query(
        `UPDATE payment_attempts SET status = 'VERIFIED', updated_at = NOW() WHERE id = $1`,
        [attemptId]
      );
      await client.query(
        `INSERT INTO payment_verifications (gym_id, attempt_id, decision, verified_by, verification_method, note)
         VALUES ($1,$2,'VERIFIED',$3,'MANUAL_UTR',$4)`,
        [gymId, attemptId, actorUserId, options.note || null]
      );
      await client.query(
        `UPDATE payment_submissions SET status = 'VERIFIED' WHERE id = $1`,
        [submission.id]
      );

      await client.query(
        `INSERT INTO payment_receipts (gym_id, payment_id, receipt_number, receipt_type, snapshot)
         VALUES ($1,$2,$3,'PAYMENT_RECEIPT',$4::jsonb)`,
        [
          gymId,
          payment.id,
          receiptNumber,
          JSON.stringify({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amountMinor,
            utr: submission.utr,
            verifiedBy: actorUserId,
            gstEnabled: Boolean(settings.gst_enabled),
          }),
        ]
      );
      await client.query(
        `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
         VALUES ($1,'payment_attempt',$2,'PAYMENT_VERIFIED',$3,$4::jsonb)`,
        [
          gymId,
          attemptId,
          actorUserId,
          JSON.stringify({ paymentId: payment.id, invoiceId: invoice.id, amountMinor }),
        ]
      );

      let membershipActivated = false;
      if ((newStatus === 'PAID' || newStatus === 'OVERPAID') && invoice.membership_id) {
        const membership = (await client.query(
          `SELECT end_date FROM member_memberships WHERE id = $1 AND gym_id = $2`,
          [invoice.membership_id, gymId]
        )).rows[0];
        if (membership) {
          await client.query(
            `UPDATE member_memberships SET status = 'ACTIVE', updated_at = NOW()
             WHERE id = $1 AND gym_id = $2`,
            [invoice.membership_id, gymId]
          );
          await client.query(
            `UPDATE gym_members
             SET membership_status = 'ACTIVE',
                 expires_at = GREATEST(COALESCE(expires_at, $3), $3),
                 updated_at = NOW()
             WHERE id = $1 AND gym_id = $2`,
            [attempt.member_id, gymId, membership.end_date]
          );
          membershipActivated = true;
        }
      }

      await client.query(
        `INSERT INTO sync_change_log (gym_id, event_id, entity_type, entity_id, operation, payload, source_device, actor_user_id)
         VALUES ($1,$2,'payment',$3,'CREATE',$4::jsonb,'CLOUD',$5)`,
        [
          gymId,
          crypto.randomUUID(),
          payment.id,
          JSON.stringify({ ...payment, invoiceId: invoice.id, amountMinor }),
          actorUserId || null,
        ]
      );

      await client.query('COMMIT');
      return {
        attemptId,
        status: 'VERIFIED',
        payment: toPaymentDto(payment),
        invoice: toInvoiceDto(updatedInvoice),
        membershipActivated,
        receiptNumber,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      if ((err as any)?.code === '23505') {
        throw AppError.conflict('This payment or UTR is already allocated.');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  public async reject(gymId: string, attemptId: string, actorUserId: string | undefined, reason: string) {
    if (!reason || reason.trim().length < 3) {
      throw AppError.validation('A rejection reason of at least 3 characters is required.');
    }
    if (!actorUserId) throw AppError.forbidden('Rejection requires an authenticated operator.');
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const attempt = (await client.query(
        `SELECT * FROM payment_attempts WHERE id = $1 AND gym_id = $2 FOR UPDATE`,
        [attemptId, gymId]
      )).rows[0];
      if (!attempt) throw AppError.notFound('Payment attempt not found in this gym.');
      if (attempt.status === 'VERIFIED') {
        throw AppError.conflict('Verified payments cannot be rejected. Use a refund instead.');
      }
      if (!['SUBMITTED', 'PENDING_VERIFICATION'].includes(attempt.status)) {
        throw AppError.conflict('Payment is not in a rejectable state.');
      }
      await client.query(
        `UPDATE payment_attempts SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
        [attemptId]
      );
      await client.query(
        `UPDATE payment_submissions SET status = 'REJECTED' WHERE gym_id = $1 AND attempt_id = $2`,
        [gymId, attemptId]
      );
      await client.query(
        `INSERT INTO payment_verifications (gym_id, attempt_id, decision, verified_by, verification_method, note)
         VALUES ($1,$2,'REJECTED',$3,'MANUAL_UTR',$4)`,
        [gymId, attemptId, actorUserId, reason.trim()]
      );
      await client.query(
        `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
         VALUES ($1,'payment_attempt',$2,'PAYMENT_REJECTED',$3,$4::jsonb)`,
        [gymId, attemptId, actorUserId, JSON.stringify({ reason: reason.trim() })]
      );
      await client.query('COMMIT');
      return { attemptId, status: 'REJECTED' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private baseQuery() {
    return `SELECT a.*, s.id AS submission_id, s.utr, s.claimed_amount_minor,
              s.claimed_paid_at, s.screenshot_document_id, s.created_at AS submitted_at,
              i.invoice_number, i.total_minor, i.paid_minor, i.status AS invoice_status,
              m.full_name AS member_name, m.member_code, m.phone AS member_phone
            FROM payment_attempts a
            JOIN invoices i ON i.id = a.invoice_id AND i.gym_id = a.gym_id
            JOIN gym_members m ON m.id = a.member_id AND m.gym_id = a.gym_id
            LEFT JOIN LATERAL (
              SELECT * FROM payment_submissions s
              WHERE s.attempt_id = a.id AND s.gym_id = a.gym_id
              ORDER BY s.created_at DESC LIMIT 1
            ) s ON TRUE`;
  }

  private mapRow(r: any) {
    return {
      attemptId: r.id,
      status: r.status,
      amountMinor: Number(r.amount_minor),
      amount: fromMinorUnits(Number(r.amount_minor)),
      transactionReference: r.transaction_reference,
      createdAt: r.created_at,
      member: { id: r.member_id, name: r.member_name, code: r.member_code, phone: r.member_phone },
      invoice: {
        id: r.invoice_id,
        number: r.invoice_number,
        totalMinor: Number(r.total_minor),
        paidMinor: Number(r.paid_minor),
        outstandingMinor: Math.max(Number(r.total_minor) - Number(r.paid_minor), 0),
        status: r.invoice_status,
      },
      submission: r.submission_id
        ? {
            id: r.submission_id,
            utr: r.utr,
            claimedAmountMinor: Number(r.claimed_amount_minor),
            claimedPaidAt: r.claimed_paid_at,
            screenshotDocumentId: r.screenshot_document_id,
            submittedAt: r.submitted_at,
          }
        : null,
    };
  }

  public async listPending(gymId: string, limit = 50, offset = 0) {
    const pool = getDatabasePool();
    const res = await pool.query(
      `${this.baseQuery()}
       WHERE a.gym_id = $1 AND a.status IN ('SUBMITTED','PENDING_VERIFICATION')
       ORDER BY a.created_at ASC LIMIT $2 OFFSET $3`,
      [gymId, Math.min(limit, 100), offset]
    );
    return { items: res.rows.map((r) => this.mapRow(r)), limit, offset };
  }

  public async listAll(gymId: string, status: string | undefined, limit = 50, offset = 0) {
    const pool = getDatabasePool();
    const params: any[] = [gymId];
    let where = 'a.gym_id = $1';
    if (status) {
      params.push(status);
      where += ` AND a.status = $${params.length}`;
    }
    params.push(Math.min(limit, 100), offset);
    const res = await pool.query(
      `${this.baseQuery()} WHERE ${where}
       ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { items: res.rows.map((r) => this.mapRow(r)), limit, offset };
  }

  public async getDetail(gymId: string, attemptId: string) {
    const pool = getDatabasePool();
    const res = await pool.query(`${this.baseQuery()} WHERE a.gym_id = $1 AND a.id = $2`, [
      gymId,
      attemptId,
    ]);
    if (!res.rows[0]) throw AppError.notFound('Payment attempt not found in this gym.');
    return this.mapRow(res.rows[0]);
  }

  public async requestClarification(gymId: string, attemptId: string, actorUserId: string | undefined, note: string) {
    if (!note || note.trim().length < 3) {
      throw AppError.validation('A clarification note is required.');
    }
    const pool = getDatabasePool();
    const res = await pool.query(
      `UPDATE payment_attempts SET status = 'PENDING_VERIFICATION', updated_at = NOW()
       WHERE id = $1 AND gym_id = $2 AND status IN ('SUBMITTED','PENDING_VERIFICATION')
       RETURNING *`,
      [attemptId, gymId]
    );
    if (!res.rows[0]) throw AppError.conflict('Payment is not awaiting clarification.');
    await pool.query(
      `UPDATE payment_submissions SET status = 'CLARIFICATION_REQUESTED'
       WHERE gym_id = $1 AND attempt_id = $2`,
      [gymId, attemptId]
    );
    await pool.query(
      `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
       VALUES ($1,'payment_attempt',$2,'PAYMENT_CLARIFICATION_REQUESTED',$3,$4::jsonb)`,
      [gymId, attemptId, actorUserId || null, JSON.stringify({ note: note.trim() })]
    );
    return { attemptId, status: 'PENDING_VERIFICATION' };
  }
}

export const reconciliationService = new ReconciliationService();
export default reconciliationService;












