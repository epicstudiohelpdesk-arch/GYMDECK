/**
 * GymDeck Payments V2 - Gym receiving-account administration.
 * Tenant-scoped by an explicit gymId that callers must derive from the token.
 */

import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';
import { encryptField, last4 } from '../../shared/security/fieldEncryption';
import {
  isValidAccountNumber,
  isValidIfsc,
  isValidVpa,
  normalizeAccountNumber,
  normalizeIfsc,
  normalizeVpa,
  PaymentMethod,
} from '../../shared/payments/validators';

export interface CreateAccountDto {
  method: PaymentMethod;
  label?: string;
  beneficiaryName: string;
  upiVpa?: string;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  branchCity?: string;
  qrImageUrl?: string;
  instructions?: string;
  isPrimary?: boolean;
}

export type UpdateAccountDto = Partial<CreateAccountDto> & { isActive?: boolean };

export function toAccountDto(row: any) {
  return {
    id: row.id,
    method: row.method,
    label: row.label,
    status: row.status,
    isActive: row.is_active,
    isPrimary: row.is_primary,
    beneficiaryName: row.beneficiary_name,
    upiVpa: row.upi_vpa,
    bankName: row.bank_name,
    accountType: row.account_type,
    accountNumberMasked: row.account_number_last4 ? `•••• •••• ${row.account_number_last4}` : null,
    ifscCode: row.ifsc_code,
    branchName: row.branch_name,
    branchCity: row.branch_city,
    qrImageUrl: row.qr_image_url,
    instructions: row.instructions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type Queryable = { query: (sql: string, params?: any[]) => Promise<any> };

async function audit(
  client: Queryable,
  gymId: string,
  action: string,
  entityId: string,
  actorUserId: string | undefined,
  metadata: Record<string, unknown>
) {
  await client.query(
    `INSERT INTO payment_audit_events (gym_id, entity_type, entity_id, action, actor_user_id, metadata)
     VALUES ($1, 'gym_payment_account', $2, $3, $4, $5::jsonb)`,
    [gymId, entityId, action, actorUserId || null, JSON.stringify(metadata)]
  );
}

export class PaymentAccountService {
  public async listAccounts(gymId: string) {
    if (!gymId) throw AppError.forbidden('Tenant gym context missing.');
    const pool = getDatabasePool();
    const res = await pool.query(
      `SELECT * FROM gym_payment_accounts WHERE gym_id = $1 ORDER BY is_primary DESC, created_at ASC`,
      [gymId]
    );
    return res.rows.map(toAccountDto);
  }

  public async createAccount(gymId: string, actorUserId: string | undefined, dto: CreateAccountDto) {
    if (!gymId) throw AppError.forbidden('Tenant gym context missing.');
    const method = dto.method;
    if (method !== 'UPI' && method !== 'BANK_TRANSFER') {
      throw AppError.validation('method must be UPI or BANK_TRANSFER.');
    }
    const beneficiaryName = (dto.beneficiaryName || '').trim();
    if (beneficiaryName.length < 2) {
      throw AppError.validation('Beneficiary display name is required.');
    }

    let upiVpa: string | null = null;
    let accountNumberEnc: string | null = null;
    let accountNumberLast4: string | null = null;
    let ifscCode: string | null = null;

    if (method === 'UPI') {
      const vpa = normalizeVpa(dto.upiVpa || '');
      if (!isValidVpa(vpa)) {
        throw AppError.validation('Invalid UPI VPA structure (expected name@handle).');
      }
      upiVpa = vpa;
    } else {
      const accountNumber = normalizeAccountNumber(dto.accountNumber || '');
      const confirm = normalizeAccountNumber(dto.confirmAccountNumber || '');
      if (!isValidAccountNumber(accountNumber)) {
        throw AppError.validation('Account number must be 9-18 digits.');
      }
      if (accountNumber !== confirm) {
        throw AppError.validation('Account number and confirmation do not match.');
      }
      if (!isValidIfsc(dto.ifscCode || '')) {
        throw AppError.validation('Invalid IFSC format (expected ABCD0123456).');
      }
      accountNumberEnc = encryptField(accountNumber);
      accountNumberLast4 = last4(accountNumber);
      ifscCode = normalizeIfsc(dto.ifscCode || '');
      if (dto.upiVpa && dto.upiVpa.trim()) {
        const vpa = normalizeVpa(dto.upiVpa.trim());
        if (isValidVpa(vpa)) {
          upiVpa = vpa;
        }
      }
    }

    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (dto.isPrimary) {
        await client.query(
          `UPDATE gym_payment_accounts SET is_primary = FALSE, updated_at = NOW()
           WHERE gym_id = $1 AND method = $2`,
          [gymId, method]
        );
      }
      const inserted = await client.query(
        `INSERT INTO gym_payment_accounts (
           gym_id, method, label, status, is_active, is_primary, beneficiary_name, upi_vpa,
           bank_name, account_type, account_number_enc, account_number_last4, ifsc_code,
           branch_name, branch_city, qr_image_url, instructions, created_by, updated_by
         ) VALUES ($1,$2,$3,'UNVERIFIED',TRUE,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          gymId,
          method,
          dto.label?.trim() || null,
          Boolean(dto.isPrimary),
          beneficiaryName,
          upiVpa,
          dto.bankName?.trim() || null,
          method === 'BANK_TRANSFER' ? dto.accountType?.trim() || 'Current Account' : null,
          accountNumberEnc,
          accountNumberLast4,
          ifscCode,
          dto.branchName?.trim() || null,
          dto.branchCity?.trim() || null,
          dto.qrImageUrl?.trim() || null,
          dto.instructions?.trim() || null,
          actorUserId || null,
          actorUserId || null,
        ]
      );
      const row = inserted.rows[0];
      await audit(client, gymId, 'PAYMENT_ACCOUNT_CREATED', row.id, actorUserId, {
        method,
        status: 'UNVERIFIED',
        isPrimary: row.is_primary,
      });
      await client.query('COMMIT');
      return toAccountDto(row);
    } catch (err) {
      await client.query('ROLLBACK');
      if ((err as any)?.code === '23505') {
        throw AppError.conflict('Another primary account already exists for this payment method.');
      }
      throw err;
    } finally {
      client.release();
    }
  }

  public async updateAccount(gymId: string, accountId: string, actorUserId: string | undefined, dto: UpdateAccountDto) {
    const pool = getDatabasePool();
    const existing = (await pool.query(
      `SELECT * FROM gym_payment_accounts WHERE id = $1 AND gym_id = $2 LIMIT 1`,
      [accountId, gymId]
    )).rows[0];
    if (!existing) throw AppError.notFound('Payment account not found in this gym.');

    const method = existing.method as PaymentMethod;
    let upiVpa = existing.upi_vpa;
    let accountNumberEnc = existing.account_number_enc;
    let accountNumberLast4 = existing.account_number_last4;
    let ifscCode = existing.ifsc_code;

    if (dto.upiVpa !== undefined) {
      if (!dto.upiVpa) {
        if (method === 'UPI') throw AppError.validation('UPI VPA cannot be empty for a UPI account.');
        upiVpa = null;
      } else {
        const vpa = normalizeVpa(dto.upiVpa);
        if (!isValidVpa(vpa)) throw AppError.validation('Invalid UPI VPA structure.');
        upiVpa = vpa;
      }
    }
    if (method === 'BANK_TRANSFER' && dto.accountNumber) {
      const accountNumber = normalizeAccountNumber(dto.accountNumber);
      const confirm = normalizeAccountNumber(dto.confirmAccountNumber || '');
      if (!isValidAccountNumber(accountNumber)) throw AppError.validation('Account number must be 9-18 digits.');
      if (accountNumber !== confirm) throw AppError.validation('Account number and confirmation do not match.');
      accountNumberEnc = encryptField(accountNumber);
      accountNumberLast4 = last4(accountNumber);
    }
    if (method === 'BANK_TRANSFER' && dto.ifscCode !== undefined) {
      if (!isValidIfsc(dto.ifscCode)) throw AppError.validation('Invalid IFSC format.');
      ifscCode = normalizeIfsc(dto.ifscCode);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE gym_payment_accounts SET
           label = COALESCE($3, label),
           beneficiary_name = COALESCE($4, beneficiary_name),
           upi_vpa = $5,
           bank_name = COALESCE($6, bank_name),
           account_type = COALESCE($7, account_type),
           account_number_enc = $8,
           account_number_last4 = $9,
           ifsc_code = $10,
           branch_name = COALESCE($11, branch_name),
           branch_city = COALESCE($12, branch_city),
           qr_image_url = COALESCE($13, qr_image_url),
           instructions = COALESCE($14, instructions),
           is_active = COALESCE($15, is_active),
           is_primary = CASE WHEN $15 = FALSE THEN FALSE ELSE is_primary END,
           status = CASE WHEN $15 = FALSE THEN 'DISABLED' WHEN status = 'DISABLED' THEN 'UNVERIFIED' ELSE status END,
           updated_by = $16,
           updated_at = NOW()
         WHERE id = $1 AND gym_id = $2
         RETURNING *`,
        [
          accountId, gymId, dto.label?.trim() || null, dto.beneficiaryName?.trim() || null,
          upiVpa, dto.bankName?.trim() || null, dto.accountType?.trim() || null,
          accountNumberEnc, accountNumberLast4, ifscCode,
          dto.branchName?.trim() || null, dto.branchCity?.trim() || null,
          dto.qrImageUrl?.trim() || null, dto.instructions?.trim() || null,
          dto.isActive === undefined ? null : dto.isActive, actorUserId || null,
        ]
      );
      await audit(client, gymId, 'PAYMENT_ACCOUNT_UPDATED', accountId, actorUserId, {
        fields: Object.keys(dto),
        isActive: res.rows[0]?.is_active,
      });
      await client.query('COMMIT');
      return toAccountDto(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async setPrimary(gymId: string, accountId: string, actorUserId: string | undefined) {
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const target = (await client.query(
        `SELECT id, method, is_active FROM gym_payment_accounts WHERE id = $1 AND gym_id = $2 FOR UPDATE`,
        [accountId, gymId]
      )).rows[0];
      if (!target) throw AppError.notFound('Payment account not found in this gym.');
      if (!target.is_active) throw AppError.validation('Cannot make an inactive account primary.');
      await client.query(
        `UPDATE gym_payment_accounts SET is_primary = FALSE, updated_at = NOW()
         WHERE gym_id = $1 AND method = $2 AND id <> $3`,
        [gymId, target.method, accountId]
      );
      const res = await client.query(
        `UPDATE gym_payment_accounts SET is_primary = TRUE, updated_at = NOW(), updated_by = $3
         WHERE id = $1 AND gym_id = $2 RETURNING *`,
        [accountId, gymId, actorUserId || null]
      );
      await audit(client, gymId, 'PAYMENT_ACCOUNT_PRIMARY_CHANGED', accountId, actorUserId, {
        method: target.method,
      });
      await client.query('COMMIT');
      return toAccountDto(res.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async deactivate(gymId: string, accountId: string, actorUserId: string | undefined) {
    const pool = getDatabasePool();
    const res = await pool.query(
      `UPDATE gym_payment_accounts
       SET is_active = FALSE, is_primary = FALSE, status = 'DISABLED', updated_by = $3, updated_at = NOW()
       WHERE id = $1 AND gym_id = $2 RETURNING *`,
      [accountId, gymId, actorUserId || null]
    );
    if (res.rows.length === 0) throw AppError.notFound('Payment account not found in this gym.');
    await audit(pool, gymId, 'PAYMENT_ACCOUNT_DEACTIVATED', accountId, actorUserId, {});
    return toAccountDto(res.rows[0]);
  }

  /** Member-facing view: never returns a full account number or credentials. */
  public async getMemberFacingConfig(gymId: string) {
    const pool = getDatabasePool();
    const res = await pool.query(
      `SELECT * FROM gym_payment_accounts
       WHERE gym_id = $1 AND is_active = TRUE AND status <> 'DISABLED'
       ORDER BY is_primary DESC, created_at ASC`,
      [gymId]
    );
    const upi = res.rows.find((r: any) => r.method === 'UPI') || null;
    const bank = res.rows.find((r: any) => r.method === 'BANK_TRANSFER') || null;
    return {
      receivingMode: upi ? 'UPI' : bank ? 'BANK_TRANSFER' : 'NONE',
      upi: upi
        ? { vpa: upi.upi_vpa, beneficiaryName: upi.beneficiary_name, instructions: upi.instructions, status: upi.status }
        : null,
      bank: bank
        ? {
            beneficiaryName: bank.beneficiary_name,
            bankName: bank.bank_name,
            accountType: bank.account_type,
            ifscCode: bank.ifsc_code,
            branchName: bank.branch_name,
            accountNumberMasked: bank.account_number_last4 ? `•••• •••• ${bank.account_number_last4}` : null,
            instructions: bank.instructions,
            status: bank.status,
          }
        : null,
    };
  }
}

export const paymentAccountService = new PaymentAccountService();
export default paymentAccountService;




