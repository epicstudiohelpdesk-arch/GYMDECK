/**
 * Sync handler for GymDeck Payments V2 receiving accounts.
 * Keeps cloud `gym_payment_accounts` in step with the offline desktop vault.
 */
import { and, eq } from 'drizzle-orm';
import { gymPaymentAccounts } from '../../shared/database/schema';
import { AppError } from '../../shared/errors';
import { encryptField, last4 } from '../../shared/security/fieldEncryption';

export async function applyPaymentAccountSync(
  tx: any,
  gymId: string,
  entityId: string,
  operation: string,
  payload: Record<string, any>,
): Promise<void> {
  const existing = (
    await tx
      .select()
      .from(gymPaymentAccounts)
      .where(and(eq(gymPaymentAccounts.id, entityId), eq(gymPaymentAccounts.gymId, gymId)))
      .limit(1)
  )[0];

  if (operation === 'DELETE') {
    await tx
      .update(gymPaymentAccounts)
      .set({ isActive: false, isPrimary: false, status: 'DISABLED', updatedAt: new Date() })
      .where(and(eq(gymPaymentAccounts.id, entityId), eq(gymPaymentAccounts.gymId, gymId)));
    return;
  }

  await upsert(tx, gymId, entityId, payload, existing);
}

async function upsert(tx: any, gymId: string, entityId: string, payload: Record<string, any>, existing: any) {
  const method = payload.method === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'UPI';
  const beneficiaryName = String(payload.beneficiaryName || existing?.beneficiaryName || '').trim();
  if (beneficiaryName.length < 2) {
    throw AppError.validation('Beneficiary display name is required.');
  }

  if (payload.isPrimary === true) {
    await tx
      .update(gymPaymentAccounts)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(gymPaymentAccounts.gymId, gymId), eq(gymPaymentAccounts.method, method)));
  }

  const raw = payload.accountNumber ? String(payload.accountNumber).replace(/\D/g, '') : '';
  const values = {
    method,
    label: payload.label ?? existing?.label ?? null,
    status: payload.status ?? existing?.status ?? 'UNVERIFIED',
    isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : (existing?.isActive ?? true),
    isPrimary: payload.isPrimary !== undefined ? Boolean(payload.isPrimary) : (existing?.isPrimary ?? false),
    beneficiaryName,
    upiVpa: payload.upiVpa ?? existing?.upiVpa ?? null,
    bankName: payload.bankName ?? existing?.bankName ?? null,
    accountType: payload.accountType ?? existing?.accountType ?? null,
    accountNumberEnc: raw ? encryptField(raw) : (existing?.accountNumberEnc ?? null),
    accountNumberLast4: raw ? last4(raw) : (existing?.accountNumberLast4 ?? null),
    ifscCode: payload.ifscCode ?? existing?.ifscCode ?? null,
    branchName: payload.branchName ?? existing?.branchName ?? null,
    branchCity: payload.branchCity ?? existing?.branchCity ?? null,
    qrImageUrl: payload.qrImageUrl ?? existing?.qrImageUrl ?? null,
    instructions: payload.instructions ?? existing?.instructions ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await tx.update(gymPaymentAccounts).set(values).where(and(
      eq(gymPaymentAccounts.id, entityId), eq(gymPaymentAccounts.gymId, gymId)
    ));
  } else {
    await tx.insert(gymPaymentAccounts).values({
      id: entityId, gymId, ...values,
      createdBy: payload.createdBy || null, updatedBy: payload.updatedBy || null,
    });
  }
}
