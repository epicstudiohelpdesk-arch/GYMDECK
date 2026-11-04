/**
 * GymDeck Cloud Gateway - Direct Bank & UPI Payments Configuration Routes (/v1/payments)
 * Supports PhonePe / Paytm style Bank Linking, SMS OTP Handshake, and Member Fee Routing
 */

import { Router, Request, Response, NextFunction } from 'express';
import { billingService } from '../../../services/billing/billingService';
import { getDatabasePool } from '../../../shared/database';

const router: Router = Router();

// In-memory active verification sessions for OTP validation
const activeOtpSessions = new Map<string, { otp: string; expiresAt: number; accountData: any }>();

/**
 * 1. GET /v1/payments/config
 * Retrieves the gym's active settlement bank account & UPI VPA
 */
router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getDatabasePool();
    let gymId = (req.query.gymId as string) || '';

    if (!gymId) {
      const defaultGym = await pool.query(`SELECT id FROM gyms ORDER BY created_at ASC LIMIT 1;`);
      if (defaultGym.rows.length > 0) {
        gymId = defaultGym.rows[0].id;
      }
    }

    if (!gymId) {
      res.status(200).json({
        success: true,
        data: {
          receivingMode: 'UPI',
          bankId: 'hdfc',
          bankName: 'HDFC Bank',
          accountHolder: "GymDeck Fitness Studio",
          accountNumberMasked: '•••• •••• 4182',
          accountType: 'Current Account',
          ifscCode: 'HDFC0001248',
          branch: 'Park Street Commercial',
          upiVpa: 'gymdeck.fitness@okhdfcbank',
          phoneNumber: '+91 98765 00123',
          isVerified: true,
          soundboxEnabled: true,
        },
      });
      return;
    }

    const config = await billingService.getPaymentConfig(gymId);
    res.status(200).json({
      success: true,
      data: config,
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. POST /v1/payments/config
 * Saves or updates receiving bank account & UPI configuration
 */
router.post('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getDatabasePool();
    let gymId = req.body.gymId;

    if (!gymId) {
      const defaultGym = await pool.query(`SELECT id FROM gyms ORDER BY created_at ASC LIMIT 1;`);
      if (defaultGym.rows.length > 0) {
        gymId = defaultGym.rows[0].id;
      }
    }

    if (!gymId) {
      res.status(400).json({ success: false, message: 'No registered gym found.' });
      return;
    }

    const updated = await billingService.savePaymentConfig(gymId, req.body);
    res.status(200).json({
      success: true,
      data: updated,
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. POST /v1/payments/simulate-otp
 * Dispatches simulated Bank SMS OTP matching PhonePe/Paytm Indian banking SMS patterns
 */
router.post('/simulate-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, bankId, accountData } = req.body;
    const cleanPhone = (phone || '9876500123').replace(/\D/g, '').slice(-10);
    const otp = '984201'; // Standard deterministic verification OTP for demo / instant testing
    const senderHeader = bankId === 'sbi' ? 'AX-SBIINB' : bankId === 'icici' ? 'VM-ICICIB' : 'VM-HDFCBK';
    const maskedAcc = accountData?.accountNumberMasked || '•••• 4182';
    
    // Store in active verification sessions (10 minutes expiry)
    activeOtpSessions.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      accountData: accountData || {}
    });

    const smsMessage = `${senderHeader}: ${otp} is your secret OTP to link your account ending in ${maskedAcc.slice(-4)} for GymDeck UPI Merchant Collections. Valid for 10 mins. Do not share with anyone.`;

    res.status(200).json({
      success: true,
      data: {
        otp,
        cleanPhone,
        senderHeader,
        smsMessage,
        expiresInSeconds: 600
      },
      meta: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. POST /v1/payments/verify-otp
 * Verifies the 6-digit SMS OTP and persists the bound account
 */
router.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, otp, accountData } = req.body;
    const cleanPhone = (phone || '9876500123').replace(/\D/g, '').slice(-10);
    const session = activeOtpSessions.get(cleanPhone);

    // Accept session OTP or demo code
    if (otp !== '984201' && (!session || session.otp !== otp)) {
      res.status(400).json({
        success: false,
        message: 'Invalid OTP code. Please enter 984201 or check your SMS.'
      });
      return;
    }

    const pool = getDatabasePool();
    const defaultGym = await pool.query(`SELECT id FROM gyms ORDER BY created_at ASC LIMIT 1;`);
    let updatedConfig = null;

    if (defaultGym.rows.length > 0) {
      const gymId = defaultGym.rows[0].id;
      const dataToSave = accountData || session?.accountData || {};
      updatedConfig = await billingService.savePaymentConfig(gymId, {
        receivingMode: 'UPI',
        bankId: dataToSave.bankId || 'hdfc',
        bankName: dataToSave.bankName || 'HDFC Bank',
        accountHolder: dataToSave.holderName || dataToSave.accountHolder || "Indian's Gym Fitness",
        accountNumberMasked: dataToSave.accountNumberMasked || '•••• •••• 4182',
        accountType: dataToSave.accountType || 'Current Account',
        ifscCode: dataToSave.ifsc || dataToSave.ifscCode || 'HDFC0001248',
        branch: dataToSave.branch || 'Commercial Capital Branch',
        upiVpa: dataToSave.suggestedVpa || dataToSave.upiVpa || 'gymdeck@okhdfcbank',
        phoneNumber: `+91 ${cleanPhone}`,
        isVerified: true,
        soundboxEnabled: true
      });
    }

    activeOtpSessions.delete(cleanPhone);

    res.status(200).json({
      success: true,
      message: 'Bank Account verified and linked successfully via NPCI switch.',
      data: updatedConfig
    });
  } catch (err) {
    next(err);
  }
});

export default router;
