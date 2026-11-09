/** GymDeck Payments V2 - shared response mappers. */

import { fromMinorUnits } from '../../shared/utils/money';

export function toPaymentDto(row: any) {
  return {
    id: row.id,
    amount: Number(row.amount),
    amountMinor: Math.round(Number(row.amount) * 100),
    paymentMethod: row.payment_method,
    transactionReference: row.transaction_reference,
    receiptNumber: row.receipt_number,
    status: row.status,
    type: row.type,
    paidAt: row.paid_at,
  };
}

export function toSubmissionDto(row: any) {
  return {
    id: row.id,
    utr: row.utr,
    claimedAmountMinor: Number(row.claimed_amount_minor),
    claimedAmount: fromMinorUnits(Number(row.claimed_amount_minor)),
    claimedPaidAt: row.claimed_paid_at,
    screenshotDocumentId: row.screenshot_document_id,
    status: row.status,
    submittedAt: row.created_at,
  };
}
