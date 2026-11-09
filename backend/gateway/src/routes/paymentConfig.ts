/**
 * GymDeck Cloud Gateway - Payment configuration (V2 hardened).
 * Tenant is always derived from the authenticated token; no client gymId is trusted.
 * The previous demo OTP endpoints (permanent code 984201) have been removed.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/rbacMiddleware';
import { paymentAccountService } from '../../../services/payments/accountService';
import { AppError } from '../../../shared/errors';

const router: Router = Router();

router.use(requireAuth);

router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.user!.gymId;
    if (!gymId) throw AppError.forbidden('Tenant gym context missing from token.');
    const config = await paymentAccountService.getMemberFacingConfig(gymId);
    res.status(200).json({
      success: true,
      data: {
        ...config,
        upiVpa: config.upi?.vpa || null,
        accountHolder: config.upi?.beneficiaryName || config.bank?.beneficiaryName || null,
        bankName: config.bank?.bankName || null,
        accountNumberMasked: config.bank?.accountNumberMasked || null,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Deprecated: the single-row configuration endpoint could silently overwrite another
 * tenant's account and marked accounts verified without proof. Use the authenticated
 * /v1/owner/payment-accounts API instead.
 */
router.post('/config', requirePermission('settings.write'), (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    message: 'Deprecated. Use /v1/owner/payment-accounts to add or update a receiving account.',
  });
});

router.post('/simulate-otp', (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    message: 'Simulated bank OTP verification has been removed. Accounts remain UNVERIFIED until a real provider verifies ownership.',
  });
});

router.post('/verify-otp', (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    message: 'Simulated bank OTP verification has been removed. Use /v1/owner/payment-accounts.',
  });
});

export default router;
