/**
 * GymDeck Owner Mobile - Financial Precision & Minor-Unit Type Contracts
 *
 * Prepares the financial type contracts for the future Owner Mobile local encrypted database.
 * All monetary amounts in local storage and domain calculations are stored in integer minor units (paise).
 * 1 INR = 100 Paise.
 */

export type MinorUnits = number; // Integer paise e.g. 50000 = ₹500.00

export interface PaymentMinorUnitsRecord {
  id: string;
  gymId: string;
  memberId: string;
  amountMinorUnits: MinorUnits;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  transactionReference?: string | null;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED';
  paymentDate: string;
  createdByUserId: string;
  createdAt: string;
}

export interface MembershipPlanMinorUnitsRecord {
  id: string;
  gymId: string;
  planName: string;
  durationDays: number;
  priceMinorUnits: MinorUnits;
  isActive: boolean;
  description?: string | null;
}
