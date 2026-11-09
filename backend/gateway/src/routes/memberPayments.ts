/** GymDeck Payments V2 - Member invoice, payment request and submission routes. */

import { Router, Request } from 'express';
import { z } from 'zod';
import { invoiceService } from '../../../services/payments/invoiceService';
import { paymentIntentService } from '../../../services/payments/paymentIntentService';
import { reconciliationService } from '../../../services/payments/reconciliationService';
import { paymentAccountService } from '../../../services/payments/accountService';
import { getDatabasePool } from '../../../shared/database';
import { AppError } from '../../../shared/errors';
import { validateBody } from '../../../shared/validation';

const router: Router = Router();

const AttemptBody = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: z.number().int().positive().optional(),
  provider: z.enum(['DIRECT_UPI', 'DIRECT_BANK_TRANSFER']).optional(),
  idempotencyKey: z.string().max(128).optional(),
});

const SubmitBody = z.object({
  utr: z.string().min(6).max(64),
  claimedAmountMinor: z.number().int().positive(),
  claimedPaidAt: z.string().datetime().optional(),
  screenshotDocumentId: z.string().uuid().optional(),
});

function ctx(req: Request) {
  const gymId = req.user!.gymId;
  const memberId = req.user!.memberId;
  if (!gymId || !memberId) throw AppError.forbidden('Member account context missing from token.');
  return { gymId, memberId };
}

router.get('/summary', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    res.status(200).json({ success: true, data: await invoiceService.getMemberSummary(gymId, memberId) });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const invoices = await invoiceService.listMemberInvoices(gymId, memberId);
    res.status(200).json({ success: true, data: { invoices } });
  } catch (err) {
    next(err);
  }
});

router.get('/config', async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    res.status(200).json({ success: true, data: await paymentAccountService.getMemberFacingConfig(gymId) });
  } catch (err) {
    next(err);
  }
});

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const invoice = await invoiceService.getInvoice(gymId, req.params.id!);
    const owned = await getDatabasePool().query(
      `SELECT 1 FROM invoices WHERE id = $1 AND gym_id = $2 AND member_id = $3`,
      [invoice.id, gymId, memberId]
    );
    if (!owned.rows[0]) throw AppError.notFound('Invoice not found.');
    res.status(200).json({ success: true, data: { invoice } });
  } catch (err) {
    next(err);
  }
});

router.post('/attempts', validateBody(AttemptBody), async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const result = await paymentIntentService.createAttempt(gymId, memberId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/attempts/:id', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    res.status(200).json({ success: true, data: await paymentIntentService.getAttempt(gymId, memberId, req.params.id!) });
  } catch (err) {
    next(err);
  }
});

router.post('/attempts/:id/submit', validateBody(SubmitBody), async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const result = await reconciliationService.submit(gymId, memberId, req.params.id!, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/attempts/:id/cancel', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const result = await paymentIntentService.cancelAttempt(gymId, memberId, req.params.id!);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const pool = getDatabasePool();
    const result = await pool.query(
      `SELECT a.id, a.amount_minor, a.status, a.transaction_reference, a.created_at,
              i.invoice_number
       FROM payment_attempts a
       JOIN invoices i ON i.id = a.invoice_id AND i.gym_id = a.gym_id
       WHERE a.gym_id = $1 AND a.member_id = $2
       ORDER BY a.created_at DESC LIMIT 100`,
      [gymId, memberId]
    );
    res.status(200).json({ success: true, data: { attempts: result.rows } });
  } catch (err) {
    next(err);
  }
});

router.get('/receipts/:paymentId', async (req, res, next) => {
  try {
    const { gymId, memberId } = ctx(req);
    const row = (await getDatabasePool().query(
      `SELECT pr.receipt_number, pr.receipt_type, pr.snapshot, pr.issued_at,
              p.amount, p.payment_method, p.transaction_reference, p.paid_at,
              i.invoice_number
       FROM payment_receipts pr
       JOIN payments p ON p.id = pr.payment_id AND p.gym_id = pr.gym_id
       LEFT JOIN payment_allocations pa ON pa.payment_id = p.id AND pa.gym_id = p.gym_id
       LEFT JOIN invoices i ON i.id = pa.invoice_id AND i.gym_id = p.gym_id
       WHERE pr.gym_id = $1 AND pr.payment_id = $2 AND p.member_id = $3
       LIMIT 1`,
      [gymId, req.params.paymentId, memberId]
    )).rows[0];
    if (!row) throw AppError.notFound('Receipt not found.');
    res.status(200).json({ success: true, data: { receipt: row } });
  } catch (err) {
    next(err);
  }
});

export default router;
