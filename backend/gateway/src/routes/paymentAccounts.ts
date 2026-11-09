/** GymDeck Payments V2 - Owner receiving-account routes. Mounted in the owner router. */

import { Router, Request } from 'express';
import { z } from 'zod';
import { paymentAccountService } from '../../../services/payments/accountService';
import { getGymPaymentSettings } from '../../../services/payments/invoiceService';
import { getDatabasePool } from '../../../shared/database';
import { requirePermission } from '../middleware/rbacMiddleware';
import { AppError } from '../../../shared/errors';
import { validateBody } from '../../../shared/validation';

const router: Router = Router();

const AccountBody = z.object({
  method: z.enum(['UPI', 'BANK_TRANSFER']),
  label: z.string().max(64).optional(),
  beneficiaryName: z.string().min(2).max(255),
  upiVpa: z.string().max(255).optional(),
  bankName: z.string().max(128).optional(),
  accountType: z.string().max(64).optional(),
  accountNumber: z.string().max(32).optional(),
  confirmAccountNumber: z.string().max(32).optional(),
  ifscCode: z.string().max(16).optional(),
  branchName: z.string().max(255).optional(),
  branchCity: z.string().max(128).optional(),
  qrImageUrl: z.string().max(2048).optional(),
  instructions: z.string().max(1000).optional(),
  isPrimary: z.boolean().optional(),
});

function ctx(req: Request) {
  const gymId = req.user!.gymId;
  if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
  return { gymId, actorUserId: req.user!.userId || req.user!.sub };
}

router.get('/', requirePermission('settings.read'), async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    const accounts = await paymentAccountService.listAccounts(gymId);
    res.status(200).json({ success: true, data: { accounts } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('settings.write'), validateBody(AccountBody), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const account = await paymentAccountService.createAccount(gymId, actorUserId, req.body);
    res.status(201).json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requirePermission('settings.write'), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const account = await paymentAccountService.updateAccount(gymId, req.params.id!, actorUserId, req.body);
    res.status(200).json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/primary', requirePermission('settings.write'), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const account = await paymentAccountService.setPrimary(gymId, req.params.id!, actorUserId);
    res.status(200).json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('settings.write'), async (req, res, next) => {
  try {
    const { gymId, actorUserId } = ctx(req);
    const account = await paymentAccountService.deactivate(gymId, req.params.id!, actorUserId);
    res.status(200).json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
});

router.get('/settings/current', requirePermission('payments.read'), async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    res.status(200).json({ success: true, data: { settings: await getGymPaymentSettings(gymId) } });
  } catch (err) {
    next(err);
  }
});

router.put('/settings/current', requirePermission('settings.write'), async (req, res, next) => {
  try {
    const { gymId } = ctx(req);
    const b = req.body || {};
    await getDatabasePool().query(
      `INSERT INTO gym_payment_settings (gym_id, allow_partial_payments, allow_overpayment,
         activate_membership_on_partial, invoice_prefix, receipt_prefix, gst_enabled, gstin,
         legal_business_name, place_of_supply, default_tax_rate_bps, receipt_footer, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (gym_id) DO UPDATE SET
         allow_partial_payments = EXCLUDED.allow_partial_payments,
         allow_overpayment = EXCLUDED.allow_overpayment,
         activate_membership_on_partial = EXCLUDED.activate_membership_on_partial,
         invoice_prefix = EXCLUDED.invoice_prefix,
         receipt_prefix = EXCLUDED.receipt_prefix,
         gst_enabled = EXCLUDED.gst_enabled,
         gstin = EXCLUDED.gstin,
         legal_business_name = EXCLUDED.legal_business_name,
         place_of_supply = EXCLUDED.place_of_supply,
         default_tax_rate_bps = EXCLUDED.default_tax_rate_bps,
         receipt_footer = EXCLUDED.receipt_footer,
         updated_at = NOW()`,
      [
        gymId,
        Boolean(b.allowPartialPayments),
        Boolean(b.allowOverpayment),
        Boolean(b.activateMembershipOnPartial),
        b.invoicePrefix || 'INV',
        b.receiptPrefix || 'REC',
        Boolean(b.gstEnabled),
        b.gstin || null,
        b.legalBusinessName || null,
        b.placeOfSupply || null,
        Number.isInteger(b.defaultTaxRateBps) ? b.defaultTaxRateBps : 0,
        b.receiptFooter || null,
      ]
    );
    res.status(200).json({ success: true, data: { settings: await getGymPaymentSettings(gymId) } });
  } catch (err) {
    next(err);
  }
});

export default router;
